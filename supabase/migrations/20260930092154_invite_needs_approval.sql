-- A sign-up can be a request (30 Sep 2026): when the invite says so, the
-- client arrives 'pending' and the coach accepts or refuses after reading
-- the answers, or after the video call. Accepting sets the status to
-- 'active'; refusing erases the account (erase_my_client).
alter table public.invite_codes add column needs_approval boolean not null default false;

-- Rebuilt from the live definition (20260929205505): the status comes from
-- the invite, nothing else changes.
create or replace function public.claim_invite(
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
  v_needs_approval boolean;
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

  select ic.id, ic.coach_id, ic.call_minutes, ic.needs_approval
    into v_id, v_coach, v_minutes, v_needs_approval
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
    goal_other, obstacles, readiness, weekly_time, call_slots, health_consent_at,
    status
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
    now(),
    -- A request until the coach accepts it, when the invite asks for that.
    case when v_needs_approval then 'pending'::public.client_status else 'active'::public.client_status end
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
