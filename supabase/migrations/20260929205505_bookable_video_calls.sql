-- Bookable video calls (29 Sep 2026). The coach states when she is free,
-- once; an invite that offers a call lets the client take one real slot in
-- the next seven days, and the booking is made in the same transaction as
-- her sign-up. No outside calendar is connected: her personal video link is
-- joined to every call. Times are French: the coaches work from France.

-- Her personal video link (Zoom, Meet...), the same for every call.
alter table public.coaches
  add column call_link text check (call_link is null or call_link ~ '^https://');

-- The guard lets her change it, rebuilt from the live definition.
create or replace function private.coach_self_update_guard()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
declare
  editable constant text[] := array[
    'name', 'first_name', 'pronoun', 'phone', 'check_in_due_offset', 'logo_path', 'call_link'
  ];
begin
  if current_user = 'authenticated'
     and new.id = (select auth.uid())
     and not private.is_platform_admin()
     and (to_jsonb(new) - editable) is distinct from (to_jsonb(old) - editable)
  then
    raise exception 'a coach may only edit her own details'
      using errcode = '42501';
  end if;
  return new;
end;
$function$;

-- A weekly window she takes calls in: Monday = 0, minutes from midnight.
create table public.coach_availability (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_min smallint not null check (start_min between 0 and 1410 and start_min % 30 = 0),
  end_min smallint not null check (end_min between 30 and 1440 and end_min % 30 = 0),
  check (end_min > start_min)
);
create index coach_availability_coach_idx on public.coach_availability (coach_id, weekday);

-- A day she is not there, whatever her windows say.
create table public.coach_unavailable_days (
  coach_id uuid not null references public.coaches(id) on delete cascade,
  day date not null,
  primary key (coach_id, day)
);

-- A call booked by a client at sign-up. Cancelled, not deleted, so the
-- coach sees what happened.
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  starts_at timestamptz not null,
  minutes smallint not null check (minutes in (10, 20, 30, 60)),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);
create unique index appointments_one_per_start
  on public.appointments (coach_id, starts_at) where cancelled_at is null;
create index appointments_client_idx on public.appointments (client_id, starts_at);

alter table public.coach_availability enable row level security;
alter table public.coach_unavailable_days enable row level security;
alter table public.appointments enable row level security;

grant select, insert, update, delete on public.coach_availability, public.coach_unavailable_days
  to authenticated, service_role;
-- Bookings are made by claim_invite only; the coach may cancel, nothing more.
grant select on public.appointments to authenticated;
grant update (cancelled_at) on public.appointments to authenticated;
grant select, insert, update, delete on public.appointments to service_role;
revoke all on public.coach_availability, public.coach_unavailable_days, public.appointments from anon;

create policy coach_availability_own on public.coach_availability for all to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));
create policy coach_unavailable_days_own on public.coach_unavailable_days for all to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));
create policy appointments_coach_reads on public.appointments for select to authenticated
  using (coach_id = (select auth.uid()));
create policy appointments_coach_cancels on public.appointments for update to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));
create policy appointments_client_reads on public.appointments for select to authenticated
  using (client_id = (select auth.uid()));

-- The slots still free: her windows over the next week, cut to the call's
-- length, from 24 hours ahead, minus blocked days and calls already booked.
create function private.coach_free_slots(p_coach uuid, p_minutes integer)
 returns setof timestamptz
 language sql
 stable
 security definer
 set search_path to ''
as $$
  select distinct s
  from (
    select ((d::date + make_interval(mins => a.start_min + k * p_minutes))
              at time zone 'Europe/Paris') as s
    from generate_series(
           (now() at time zone 'Europe/Paris')::date,
           (now() at time zone 'Europe/Paris')::date + 8,
           interval '1 day') d
    join public.coach_availability a
      on a.coach_id = p_coach and a.weekday = extract(isodow from d)::int - 1
    cross join lateral generate_series(0, (a.end_min - a.start_min) / p_minutes - 1) k
    where not exists (
      select 1 from public.coach_unavailable_days u
      where u.coach_id = p_coach and u.day = d::date)
  ) x
  where s >= now() + interval '24 hours'
    and s < now() + interval '8 days'
    and not exists (
      select 1 from public.appointments ap
      where ap.coach_id = p_coach and ap.cancelled_at is null
        and ap.starts_at < s + make_interval(mins => p_minutes)
        and ap.starts_at + make_interval(mins => ap.minutes) > s)
  order by s;
$$;
revoke all on function private.coach_free_slots(uuid, integer) from public, anon, authenticated;

-- What the invitation shows, before the client has an account: the free
-- slots of the coach behind a valid code that offers a call.
create function public.invite_free_slots(p_code text)
 returns setof timestamptz
 language plpgsql
 stable
 security definer
 set search_path to ''
as $$
declare
  v_coach   uuid;
  v_minutes smallint;
begin
  select ic.coach_id, ic.call_minutes into v_coach, v_minutes
  from public.invite_codes ic
  where upper(btrim(ic.code)) = upper(btrim(coalesce(p_code, '')))
    and ic.state in ('sent', 'opened')
    and ic.expires_at > now();
  if v_coach is null or v_minutes is null then
    return;
  end if;
  return query select private.coach_free_slots(v_coach, v_minutes);
end;
$$;
revoke all on function public.invite_free_slots(text) from public;
grant execute on function public.invite_free_slots(text) to anon, authenticated, service_role;

-- claim_invite books the slot she took, or refuses the whole sign-up if it
-- was taken meanwhile so she can pick another. Rebuilt from the live
-- definition (20260929204051); p_call_slots_at becomes p_call_at.
drop function public.claim_invite(
  text, text, text, public.client_goal, numeric, numeric, text[], text[],
  integer[], numeric, boolean, boolean, date, text, text, text, text, text,
  text, text, smallint, text, text, timestamptz[]
);
create function public.claim_invite(
  p_code text,
  p_name text,
  p_first_name text,
  p_goal public.client_goal,
  p_height_cm numeric,
  p_weight_kg numeric,
  p_injuries text[],
  p_equipment text[],
  p_session_days integer[],
  p_sleep_target numeric,
  p_cycle_tracking boolean,
  p_health_consent boolean,
  p_birth_date date default null,
  p_whatsapp text default null,
  p_instagram text default null,
  p_training_age text default null,
  p_sessions_per_week text default null,
  p_current_programme text default null,
  p_goal_other text default null,
  p_obstacles text default null,
  p_readiness smallint default null,
  p_weekly_time text default null,
  p_call_slots text default null,
  p_call_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user  uuid := (select auth.uid());
  v_id    uuid;
  v_coach uuid;
  v_email text;
  v_minutes smallint;
begin
  if v_user is null then
    raise exception 'sign in before claiming a code' using errcode = '42501';
  end if;

  if exists (select 1 from public.coaches where id = v_user) then
    raise exception 'this account is already a coach' using errcode = '23505';
  end if;
  if exists (select 1 from public.clients where id = v_user) then
    raise exception 'this account already belongs to a client' using errcode = '23505';
  end if;

  -- Health data is not stored without explicit consent.
  if coalesce(p_health_consent, false) is not true then
    raise exception 'health data needs consent' using errcode = '22023';
  end if;

  -- Adults only (29 Sep 2026): a minor's health data would need a parent's
  -- consent. The birth date is required and must be 18 years back.
  if p_birth_date is null or p_birth_date > (current_date - interval '18 years')::date then
    raise exception 'clients must be 18 or over' using errcode = '22023';
  end if;

  select ic.id, ic.coach_id, ic.call_minutes into v_id, v_coach, v_minutes
  from public.invite_codes ic
  where upper(btrim(ic.code)) = upper(btrim(coalesce(p_code, '')))
    and ic.state in ('sent', 'opened')
    and ic.expires_at > now()
  for update;

  if v_id is null then
    raise exception 'this code is not valid' using errcode = '22023';
  end if;

  if p_name is null or length(btrim(p_name)) = 0 then
    raise exception 'a name is required' using errcode = '22023';
  end if;

  select u.email into v_email from auth.users u where u.id = v_user;

  insert into public.clients (
    id, coach_id, name, first_name, email, goal, height_cm,
    start_weight_kg, start_weight_date, birth_year, birth_date, injuries, equipment,
    session_days, sleep_target_h, cycle_tracking,
    whatsapp, instagram, training_age, sessions_per_week, current_programme,
    goal_other, obstacles, readiness, weekly_time, call_slots, health_consent_at
  ) values (
    v_user, v_coach, btrim(p_name), nullif(btrim(coalesce(p_first_name, '')), ''),
    v_email, p_goal, p_height_cm,
    p_weight_kg, case when p_weight_kg is null then null else current_date end,
    extract(year from p_birth_date)::integer, p_birth_date,
    coalesce(p_injuries, '{}'), coalesce(p_equipment, '{}'),
    coalesce(p_session_days, '{}'), p_sleep_target, coalesce(p_cycle_tracking, false),
    nullif(btrim(coalesce(p_whatsapp, '')), ''),
    nullif(btrim(coalesce(p_instagram, '')), ''),
    nullif(p_training_age, ''),
    nullif(p_sessions_per_week, ''),
    nullif(btrim(coalesce(p_current_programme, '')), ''),
    case when p_goal = 'Other' then nullif(btrim(coalesce(p_goal_other, '')), '') end,
    nullif(btrim(coalesce(p_obstacles, '')), ''),
    p_readiness,
    nullif(btrim(coalesce(p_weekly_time, '')), ''),
    nullif(btrim(coalesce(p_call_slots, '')), ''),
    now()
  );

  -- The call she took, if the coach offered one. Bookings for one coach are
  -- serialised on her row, so two sign-ups cannot take the same slot.
  if v_minutes is not null and p_call_at is not null then
    perform 1 from public.coaches where id = v_coach for update;
    if not exists (
      select 1 from private.coach_free_slots(v_coach, v_minutes) s where s = p_call_at
    ) then
      raise exception 'call slot no longer free' using errcode = 'P0001';
    end if;
    insert into public.appointments (coach_id, client_id, starts_at, minutes)
    values (v_coach, v_user, p_call_at, v_minutes);
  end if;

  -- One use only.
  update public.invite_codes
  set state = 'joined', claimed_by = v_user
  where id = v_id;

  return v_coach;
end;
$function$;

revoke all on function public.claim_invite(
  text, text, text, public.client_goal, numeric, numeric, text[], text[],
  integer[], numeric, boolean, boolean, date, text, text, text, text, text,
  text, text, smallint, text, text, timestamptz
) from public, anon;
grant execute on function public.claim_invite(
  text, text, text, public.client_goal, numeric, numeric, text[], text[],
  integer[], numeric, boolean, boolean, date, text, text, text, text, text,
  text, text, smallint, text, text, timestamptz
) to authenticated, service_role;
