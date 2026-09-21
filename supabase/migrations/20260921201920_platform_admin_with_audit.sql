-- Platform administration with full support access, audited.
--
-- Deliberate design: an admin gets NO direct RLS read on client tables. Direct
-- policies would grant the same access with no trace, which is exactly what an
-- audited model must not allow. Every read of client data goes through a
-- SECURITY DEFINER function that writes a log row first and demands a reason.

create table public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null,
  note       text
);

alter table public.platform_admins enable row level security;

-- A coach may suspend nothing; only an admin sets this.
alter table public.coaches add column suspended_at timestamptz;

create type public.admin_action as enum (
  'read_client_record',
  'read_client_cycle',
  'read_client_checkins',
  'suspend_coach',
  'restore_coach'
);

-- Append-only. No policy grants update or delete, to anyone.
create table public.admin_access_log (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null references auth.users(id) on delete restrict,
  action      public.admin_action not null,
  client_id   uuid references public.clients(id) on delete set null,
  coach_id    uuid references public.coaches(id) on delete set null,
  reason      text not null,
  accessed_at timestamptz not null default now(),
  constraint admin_access_log_reason_meaningful check (length(btrim(reason)) >= 10)
);

create index admin_access_log_admin_idx  on public.admin_access_log (admin_id, accessed_at desc);
create index admin_access_log_client_idx on public.admin_access_log (client_id, accessed_at desc);

alter table public.admin_access_log enable row level security;

revoke all on public.platform_admins, public.admin_access_log from anon;

create or replace function private.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.platform_admins a where a.user_id = (select auth.uid())
  );
$$;

revoke all     on function private.is_platform_admin() from anon, public;
grant  execute on function private.is_platform_admin() to authenticated;

-- An admin sees who else is an admin. Nobody grants themselves the role: rows
-- are inserted out of band, so there is no insert policy at all.
create policy platform_admins_select on public.platform_admins for select to authenticated
  using (private.is_platform_admin());

-- Admins read the whole log. A coach reads the entries that concern her own
-- clients — she is told when someone looked, which is the point of an audit.
create policy admin_log_select_by_admin on public.admin_access_log for select to authenticated
  using (private.is_platform_admin());

create policy admin_log_select_by_coach on public.admin_access_log for select to authenticated
  using (client_id is not null and private.owns_client(client_id));

-- Admins may list coaches directly: no client data, nothing to audit.
create policy coaches_select_by_admin on public.coaches for select to authenticated
  using (private.is_platform_admin());

create policy coaches_update_by_admin on public.coaches for update to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());

/* ---------- audited readers ---------- */

create or replace function public.admin_log_access(
  p_action    public.admin_action,
  p_reason    text,
  p_client    uuid default null,
  p_coach     uuid default null
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not private.is_platform_admin() then
    raise exception 'not a platform admin' using errcode = '42501';
  end if;
  if p_reason is null or length(btrim(p_reason)) < 10 then
    raise exception 'a reason of at least 10 characters is required'
      using errcode = '22023';
  end if;

  insert into public.admin_access_log (admin_id, action, client_id, coach_id, reason)
  values ((select auth.uid()), p_action, p_client, p_coach, btrim(p_reason));
end;
$$;

create or replace function public.admin_read_client(p_client uuid, p_reason text)
returns table (
  id uuid, coach_id uuid, name text, first_name text, email text,
  goal public.client_goal, injuries text[], equipment text[],
  session_days int[], sleep_target_h numeric, cycle_tracking boolean,
  status public.client_status, created_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
begin
  perform public.admin_log_access('read_client_record', p_reason, p_client, null);

  return query
  select c.id, c.coach_id, c.name, c.first_name, c.email, c.goal, c.injuries,
         c.equipment, c.session_days, c.sleep_target_h, c.cycle_tracking,
         c.status, c.created_at
  from public.clients c
  where c.id = p_client;
end;
$$;

-- Article 9 data. This is the access the product otherwise forbids, so it is
-- the one that most needs a named reason attached to a named admin.
create or replace function public.admin_read_client_cycle(p_client uuid, p_reason text)
returns table (
  period_start_date date,
  cycle_length_days int,
  logged_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
begin
  perform public.admin_log_access('read_client_cycle', p_reason, p_client, null);

  return query
  select cl.period_start_date, cl.cycle_length_days, cl.logged_at
  from public.cycle_logs cl
  where cl.client_id = p_client
  order by cl.period_start_date desc;
end;
$$;

create or replace function public.admin_read_client_checkins(p_client uuid, p_reason text)
returns table (
  week_start_date date,
  feel public.checkin_feel,
  pain public.checkin_pain,
  adherence public.checkin_adherence,
  bodyweight_kg numeric,
  note text,
  author public.checkin_author,
  submitted_at timestamptz,
  reviewed_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
begin
  perform public.admin_log_access('read_client_checkins', p_reason, p_client, null);

  return query
  select ci.week_start_date, ci.feel, ci.pain, ci.adherence, ci.bodyweight_kg,
         ci.note, ci.author, ci.submitted_at, ci.reviewed_at
  from public.check_ins ci
  where ci.client_id = p_client
  order by ci.week_start_date desc;
end;
$$;

/* ---------- coach administration ---------- */

-- Counts only. No client row leaves this function.
create or replace function public.admin_coach_overview()
returns table (
  coach_id uuid, name text, first_name text,
  suspended_at timestamptz, created_at timestamptz,
  client_count bigint, programme_count bigint
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not private.is_platform_admin() then
    raise exception 'not a platform admin' using errcode = '42501';
  end if;

  return query
  select co.id, co.name, co.first_name, co.suspended_at, co.created_at,
         (select count(*) from public.clients cl    where cl.coach_id = co.id),
         (select count(*) from public.programmes pr where pr.coach_id = co.id)
  from public.coaches co
  order by co.name;
end;
$$;

create or replace function public.admin_set_coach_suspended(
  p_coach uuid,
  p_suspended boolean,
  p_reason text
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform public.admin_log_access(
    case when p_suspended then 'suspend_coach' else 'restore_coach' end,
    p_reason, null, p_coach);

  update public.coaches
  set suspended_at = case when p_suspended then now() else null end
  where id = p_coach;
end;
$$;

revoke all on function
  public.admin_log_access(public.admin_action, text, uuid, uuid),
  public.admin_read_client(uuid, text),
  public.admin_read_client_cycle(uuid, text),
  public.admin_read_client_checkins(uuid, text),
  public.admin_coach_overview(),
  public.admin_set_coach_suspended(uuid, boolean, text)
from anon, public;

grant execute on function
  public.admin_read_client(uuid, text),
  public.admin_read_client_cycle(uuid, text),
  public.admin_read_client_checkins(uuid, text),
  public.admin_coach_overview(),
  public.admin_set_coach_suspended(uuid, boolean, text)
to authenticated;
