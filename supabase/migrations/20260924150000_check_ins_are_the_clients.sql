-- The client files her check-in; the coach reads it, marks it read, and nudges.
--
-- Decided 24 Sep 2026: the coach no longer types check-ins. Her side becomes
-- read-only, enforced here rather than by hiding a form — the iOS app and the
-- web both talk to the database directly.
--
-- The coach keeps exactly one write on a check-in: reviewed_at. Photos become
-- read-only for her as well. Rows she typed before today stay, as history.

drop policy if exists check_ins_all_by_coach on public.check_ins;

create policy check_ins_select_by_coach on public.check_ins
  for select to authenticated
  using (private.owns_client(client_id));

create policy check_ins_review_by_coach on public.check_ins
  for update to authenticated
  using (private.owns_client(client_id))
  with check (private.owns_client(client_id));

-- RLS cannot say "only this column", so the trigger does: a coach's update may
-- change reviewed_at and nothing else.
create or replace function private.coach_reviews_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated'
     and new.client_id is distinct from (select auth.uid())
     and (to_jsonb(new) - 'reviewed_at') is distinct from (to_jsonb(old) - 'reviewed_at')
  then
    raise exception 'a coach may only mark a check-in as read'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists check_ins_coach_reviews_only on public.check_ins;
create trigger check_ins_coach_reviews_only
  before update on public.check_ins
  for each row execute function private.coach_reviews_only();

drop policy if exists check_in_photos_rows_coach on public.check_in_photos;

create policy check_in_photos_select_by_coach on public.check_in_photos
  for select to authenticated
  using (private.owns_client(client_id));

-- A nudge: the coach asked for this week's check-in. The client's app shows
-- it on Today; the coach sees when she last asked.
create table public.check_in_reminders (
  client_id       uuid not null references public.clients (id) on delete cascade,
  week_start_date date not null,
  sent_at         timestamptz not null default now(),
  primary key (client_id, week_start_date)
);

alter table public.check_in_reminders enable row level security;

create policy check_in_reminders_coach on public.check_in_reminders
  for all to authenticated
  using (private.owns_client(client_id))
  with check (private.owns_client(client_id));

create policy check_in_reminders_read_own on public.check_in_reminders
  for select to authenticated
  using (client_id = (select auth.uid()));

-- Data API grants, stated rather than inherited: from 30 Oct 2026 Supabase
-- stops granting new public tables to the API roles by default, and a fresh
-- project, a preview branch or `supabase db reset` would otherwise leave
-- this table unreachable. RLS still decides which rows. anon gets nothing:
-- every screen that reads it is behind sign-in.
grant select, insert, update, delete on public.check_in_reminders to authenticated, service_role;
revoke all on public.check_in_reminders from anon;
