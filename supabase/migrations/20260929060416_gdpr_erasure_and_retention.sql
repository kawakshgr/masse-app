-- GDPR, 29 Sep 2026: one way to erase a client — asked by the client, done by
-- the coach, or by the retention job — that keeps what the law requires.
--
-- Invoices must be kept ten years (French commercial law), which GDPR
-- Art. 17(3)(b) allows. They used to vanish with the client row; now they
-- keep the name they were issued to and lose only the link.
alter table public.invoices add column billed_to text;
update public.invoices i set billed_to = c.name from public.clients c where c.id = i.client_id and i.billed_to is null;
alter table public.invoices alter column client_id drop not null;
alter table public.invoices drop constraint invoices_client_id_fkey;
alter table public.invoices
  add constraint invoices_client_id_fkey
  foreign key (client_id) references public.clients(id) on delete set null;

-- When the coaching ended; the retention job reads it. Set by the coach's
-- archive action, cleared when a client is brought back.
alter table public.clients add column archived_at timestamptz;

-- The erasure itself. Deleting the auth user cascades to the client row and
-- everything hanging off it; invoices only lose their link. Storage files
-- (check-in photos) are removed by the app before this runs: the storage
-- schema refuses deletes from SQL.
create or replace function private.erase_client(p_client uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.invoices i
  set billed_to = coalesce(i.billed_to, c.name)
  from public.clients c
  where c.id = p_client and i.client_id = p_client;

  delete from auth.users where id = p_client;
end;
$$;
revoke all on function private.erase_client(uuid) from public, anon, authenticated;

-- A client erases their own account.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null or not exists (select 1 from public.clients where id = v_user) then
    raise exception 'only a client can delete their account here' using errcode = '42501';
  end if;
  perform private.erase_client(v_user);
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- A coach erases one of their clients: the row, the data and the login.
create or replace function public.erase_my_client(p_client uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.clients where id = p_client and coach_id = (select auth.uid())
  ) then
    raise exception 'not your client' using errcode = '42501';
  end if;
  perform private.erase_client(p_client);
end;
$$;
revoke all on function public.erase_my_client(uuid) from public, anon;
grant execute on function public.erase_my_client(uuid) to authenticated;

-- A client withdraws consent to health data (Art. 9 and 7(3)): what they gave
-- under it goes — injuries, cycle dates, sleep — and cycle tracking stops.
create or replace function public.withdraw_health_consent()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null or not exists (select 1 from public.clients where id = v_user) then
    raise exception 'only a client can withdraw their consent' using errcode = '42501';
  end if;
  update public.clients
  set health_consent_at = null, injuries = '{}', cycle_tracking = false
  where id = v_user;
  delete from public.cycle_logs where client_id = v_user;
  update public.daily_metrics set sleep_h = null, sleep_quality = null where client_id = v_user;
end;
$$;
revoke all on function public.withdraw_health_consent() from public, anon;
grant execute on function public.withdraw_health_consent() to authenticated;

-- …and gives it again.
create or replace function public.give_health_consent()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.clients set health_consent_at = now()
  where id = (select auth.uid()) and health_consent_at is null;
$$;
revoke all on function public.give_health_consent() from public, anon;
grant execute on function public.give_health_consent() to authenticated;

-- Retention, run daily by the app's scheduled job with the service role:
-- archived clients are erased after 12 months, their check-in photos after 3.
create or replace function public.retention_due()
returns table (client_id uuid, erase boolean)
language sql
security definer
set search_path = ''
as $$
  select c.id, c.archived_at < now() - interval '12 months'
  from public.clients c
  where c.status = 'archived' and c.archived_at < now() - interval '3 months';
$$;
revoke all on function public.retention_due() from public, anon, authenticated;
grant execute on function public.retention_due() to service_role;

create or replace function public.retention_erase(p_client uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.clients
    where id = p_client and status = 'archived' and archived_at < now() - interval '12 months'
  ) then
    perform private.erase_client(p_client);
  end if;
end;
$$;
revoke all on function public.retention_erase(uuid) from public, anon, authenticated;
grant execute on function public.retention_erase(uuid) to service_role;
