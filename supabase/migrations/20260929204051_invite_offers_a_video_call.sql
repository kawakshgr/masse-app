-- A video call is the coach's offer, not a given (29 Sep 2026): the invite
-- says whether there is one and how long (10, 20, 30 or 60 minutes). Only
-- then does the invitation ask for slots — picked from dates and times, not
-- typed — and the client's file keeps them as instants.
alter table public.invite_codes
  add column call_minutes smallint check (call_minutes in (10, 20, 30, 60));

alter table public.clients
  add column call_minutes smallint check (call_minutes in (10, 20, 30, 60)),
  add column call_slots_at timestamptz[] not null default '{}';

-- The preview tells the invitation whether to ask. Its return type changes,
-- so it is dropped and made again with the same grants.
drop function public.invite_preview(text);
create function public.invite_preview(p_code text)
 returns table(valid boolean, coach_name text, ask_cycle boolean, call_minutes smallint)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_id      uuid;
  v_coach   uuid;
  v_ask     boolean;
  v_minutes smallint;
  v_state   public.invite_state;
  v_exp     timestamptz;
begin
  select ic.id, ic.coach_id, ic.ask_cycle, ic.call_minutes, ic.state, ic.expires_at
    into v_id, v_coach, v_ask, v_minutes, v_state, v_exp
  from public.invite_codes ic
  where upper(btrim(ic.code)) = upper(btrim(coalesce(p_code, '')));

  if v_id is null
     or v_state in ('joined', 'expired', 'revoked')
     or v_exp <= now() then
    -- Mark a lapsed code so the coach sees why it stopped working.
    if v_id is not null and v_exp <= now() and v_state not in ('joined', 'revoked') then
      update public.invite_codes set state = 'expired' where id = v_id;
    end if;
    return query select false, null::text, false, null::smallint;
    return;
  end if;

  update public.invite_codes set state = 'opened' where id = v_id and state = 'sent';

  return query
  select true, coalesce(co.first_name, co.name), v_ask, v_minutes
  from public.coaches co
  where co.id = v_coach;
end;
$function$;
revoke all on function public.invite_preview(text) from public;
grant execute on function public.invite_preview(text) to anon, authenticated, service_role;

-- claim_invite takes the picked slots; rebuilt from the live definition
-- (20260929060530). The old signature goes so there is one function.
drop function public.claim_invite(
  text, text, text, public.client_goal, numeric, numeric, text[], text[],
  integer[], numeric, boolean, boolean, date, text, text, text, text, text,
  text, text, smallint, text, text
);
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
  p_call_slots_at timestamptz[] default null
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
    goal_other, obstacles, readiness, weekly_time, call_slots, health_consent_at,
    call_minutes, call_slots_at
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
    v_minutes,
    -- Slots only when the coach offered a call, three at most, none past.
    case when v_minutes is null then '{}'::timestamptz[]
         else coalesce((select array_agg(s order by s) from (
           select distinct s from unnest(coalesce(p_call_slots_at, '{}')) s where s > now() limit 3) x), '{}') end
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
  text, text, smallint, text, text, timestamptz[]
) from public, anon;
grant execute on function public.claim_invite(
  text, text, text, public.client_goal, numeric, numeric, text[], text[],
  integer[], numeric, boolean, boolean, date, text, text, text, text, text,
  text, text, smallint, text, text, timestamptz[]
) to authenticated, service_role;
