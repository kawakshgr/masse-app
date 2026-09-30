-- Pain alerts, and cycle tracking that comes back with consent (30 Sep 2026).
--
-- A client can flag pain on an exercise during a session; the coach sees it
-- at the top of À traiter. Pain is health data (GDPR Art. 9): it is accepted
-- only while the client's consent stands, and goes when consent is withdrawn.

-- Withdrawing consent stops cycle tracking; giving it again brings tracking
-- back if it was on. This remembers that it was.
alter table public.clients add column cycle_tracking_paused boolean not null default false;

create table public.pain_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  session_exercise_id uuid references public.session_exercises(id) on delete set null,
  -- Kept as written: the report survives a programme edit.
  exercise_name text not null check (length(exercise_name) between 1 and 200),
  level text not null check (level in ('mild', 'sharp', 'stopped')),
  note text check (note is null or length(note) <= 500),
  created_at timestamptz not null default now(),
  seen_at timestamptz
);
create index pain_reports_client_idx on public.pain_reports (client_id, created_at desc);

alter table public.pain_reports enable row level security;
grant select, insert on public.pain_reports to authenticated;
-- The coach marks a report as seen, nothing else.
grant update (seen_at) on public.pain_reports to authenticated;
grant select, insert, update, delete on public.pain_reports to service_role;
revoke all on public.pain_reports from anon;

create policy pain_reports_client_writes on public.pain_reports for insert to authenticated
  with check (
    client_id = (select auth.uid())
    and exists (select 1 from public.clients c where c.id = (select auth.uid()) and c.health_consent_at is not null)
  );
create policy pain_reports_client_reads on public.pain_reports for select to authenticated
  using (client_id = (select auth.uid()));
create policy pain_reports_coach_reads on public.pain_reports for select to authenticated
  using (private.owns_client(client_id));
create policy pain_reports_coach_marks_seen on public.pain_reports for update to authenticated
  using (private.owns_client(client_id)) with check (private.owns_client(client_id));

-- Rebuilt from the live definitions (20260929060416).
create or replace function public.withdraw_health_consent()
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null or not exists (select 1 from public.clients where id = v_user) then
    raise exception 'only a client can withdraw their consent' using errcode = '42501';
  end if;
  update public.clients
  set health_consent_at = null, injuries = '{}',
      cycle_tracking_paused = cycle_tracking or cycle_tracking_paused,
      cycle_tracking = false
  where id = v_user;
  delete from public.cycle_logs where client_id = v_user;
  delete from public.pain_reports where client_id = v_user;
  update public.daily_metrics set sleep_h = null, sleep_quality = null where client_id = v_user;
end;
$function$;

create or replace function public.give_health_consent()
 returns void
 language sql
 security definer
 set search_path to ''
as $function$
  update public.clients
  set health_consent_at = now(),
      cycle_tracking = cycle_tracking or cycle_tracking_paused,
      cycle_tracking_paused = false
  where id = (select auth.uid()) and health_consent_at is null;
$function$;
