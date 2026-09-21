-- Invite-code onboarding carries authentication. A code is issued by the coach,
-- used once, and dies after 14 days.
--
-- `invite_codes` is unreadable to anon by design, so redemption cannot be a
-- table read. These two functions are the only doors, and neither returns a
-- row the caller was not given the code for.

-- Step 1. Validates a code before the client has an account. A wrong code must
-- fail honestly, so this returns valid=false rather than raising.
create or replace function public.invite_preview(p_code text)
returns table (valid boolean, coach_name text, ask_cycle boolean)
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_id    uuid;
  v_coach uuid;
  v_ask   boolean;
  v_state public.invite_state;
  v_exp   timestamptz;
begin
  select ic.id, ic.coach_id, ic.ask_cycle, ic.state, ic.expires_at
    into v_id, v_coach, v_ask, v_state, v_exp
  from public.invite_codes ic
  where upper(btrim(ic.code)) = upper(btrim(coalesce(p_code, '')));

  if v_id is null
     or v_state in ('joined', 'expired', 'revoked')
     or v_exp <= now() then
    -- Mark a lapsed code so the coach sees why it stopped working.
    if v_id is not null and v_exp <= now() and v_state not in ('joined', 'revoked') then
      update public.invite_codes set state = 'expired' where id = v_id;
    end if;
    return query select false, null::text, false;
    return;
  end if;

  update public.invite_codes set state = 'opened' where id = v_id and state = 'sent';

  return query
  select true, coalesce(co.first_name, co.name), v_ask
  from public.coaches co
  where co.id = v_coach;
end;
$$;

-- Step 9. The client is authenticated by now; her answers become her record.
create or replace function public.claim_invite(
  p_code          text,
  p_name          text,
  p_first_name    text,
  p_goal          public.client_goal,
  p_height_cm     numeric,
  p_weight_kg     numeric,
  p_birth_year    int,
  p_injuries      text[],
  p_equipment     text[],
  p_session_days  int[],
  p_sleep_target  numeric,
  p_cycle_tracking boolean
) returns uuid
language plpgsql volatile security definer set search_path = public
as $$
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
    start_weight_kg, start_weight_date, birth_year, injuries, equipment,
    session_days, sleep_target_h, cycle_tracking
  ) values (
    v_user, v_coach, btrim(p_name), nullif(btrim(coalesce(p_first_name, '')), ''),
    v_email, p_goal, p_height_cm,
    p_weight_kg, case when p_weight_kg is null then null else current_date end,
    p_birth_year, coalesce(p_injuries, '{}'), coalesce(p_equipment, '{}'),
    coalesce(p_session_days, '{}'), p_sleep_target, coalesce(p_cycle_tracking, false)
  );

  -- One use only.
  update public.invite_codes
  set state = 'joined', claimed_by = v_user
  where id = v_id;

  return v_coach;
end;
$$;

revoke all on function public.invite_preview(text) from public;
grant  execute on function public.invite_preview(text) to anon, authenticated;

revoke all on function public.claim_invite(
  text, text, text, public.client_goal, numeric, numeric, int,
  text[], text[], int[], numeric, boolean) from public, anon;
grant execute on function public.claim_invite(
  text, text, text, public.client_goal, numeric, numeric, int,
  text[], text[], int[], numeric, boolean) to authenticated;
