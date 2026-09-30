-- A video call for a client already coached (30 Sep 2026): the coach offers
-- one of a given length on the client's row; the client picks a free slot
-- in the app and the offer is spent. Same slots, same rules as at sign-up.
alter table public.clients
  add column call_offer_minutes smallint check (call_offer_minutes in (10, 20, 30, 60));

-- The free slots for the call offered to me, if one is.
create function public.my_call_slots()
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
  select c.coach_id, c.call_offer_minutes into v_coach, v_minutes
  from public.clients c where c.id = (select auth.uid());
  if v_coach is null or v_minutes is null then
    return;
  end if;
  return query select private.coach_free_slots(v_coach, v_minutes);
end;
$$;
revoke all on function public.my_call_slots() from public, anon;
grant execute on function public.my_call_slots() to authenticated, service_role;

-- Books the slot and spends the offer. Bookings for one coach are
-- serialised on her row, as in claim_invite.
create function public.book_call(p_at timestamptz)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $$
declare
  v_user    uuid := (select auth.uid());
  v_coach   uuid;
  v_minutes smallint;
  v_id      uuid;
begin
  select c.coach_id, c.call_offer_minutes into v_coach, v_minutes
  from public.clients c where c.id = v_user;
  if v_coach is null or v_minutes is null then
    raise exception 'no call was offered' using errcode = '42501';
  end if;

  perform 1 from public.coaches where id = v_coach for update;
  if not exists (select 1 from private.coach_free_slots(v_coach, v_minutes) s where s = p_at) then
    raise exception 'call slot no longer free' using errcode = 'P0001';
  end if;

  insert into public.appointments (coach_id, client_id, starts_at, minutes)
  values (v_coach, v_user, p_at, v_minutes)
  returning id into v_id;
  update public.clients set call_offer_minutes = null where id = v_user;
  return v_id;
end;
$$;
revoke all on function public.book_call(timestamptz) from public, anon;
grant execute on function public.book_call(timestamptz) to authenticated, service_role;
