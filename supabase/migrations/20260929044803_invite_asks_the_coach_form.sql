-- The invitation now asks what Lucie's intake form asked (29 Sep 2026), so
-- the coach reads the answers on the client's file instead of in a Google
-- Form. Columns that already existed (whatsapp, instagram, training_age,
-- birth_date, injuries) are filled by the same claim.
alter table public.clients
  add column sessions_per_week text
    check (sessions_per_week in ('1-2', '3-4', '5+', 'irregular')),
  add column current_programme text,
  add column goal_other text,
  add column obstacles text,
  add column readiness smallint check (readiness between 1 and 10),
  add column weekly_time text,
  add column call_slots text,
  -- Explicit consent to the health data she gives (GDPR Art. 9): injuries,
  -- cycle, sleep. Null means none was given.
  add column health_consent_at timestamptz;

-- Training age is one of the form's four answers; the coach's file edits it
-- with the same dropdown. No row held free text when this landed.
alter table public.clients
  add constraint clients_training_age_known
    check (training_age is null or training_age in ('lt6m', '6to12m', '1to3y', 'gt3y')) not valid;
alter table public.clients validate constraint clients_training_age_known;

-- The new signature replaces the old one; both clients are updated with it.
-- Rebuilt from the live definition (pg_get_functiondef), not an old file.
drop function if exists public.claim_invite(
  text, text, text, public.client_goal, numeric, numeric, integer,
  text[], text[], integer[], numeric, boolean
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
  p_call_slots text default null
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

  -- Health data is not stored without her explicit consent.
  if coalesce(p_health_consent, false) is not true then
    raise exception 'health data needs consent' using errcode = '22023';
  end if;

  select ic.id, ic.coach_id into v_id, v_coach
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
  text, text, smallint, text, text
) from public, anon;
grant execute on function public.claim_invite(
  text, text, text, public.client_goal, numeric, numeric, text[], text[],
  integer[], numeric, boolean, boolean, date, text, text, text, text, text,
  text, text, smallint, text, text
) to authenticated, service_role;
