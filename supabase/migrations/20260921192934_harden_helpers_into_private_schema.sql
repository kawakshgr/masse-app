-- The ownership helpers are RLS plumbing, not API. PostgREST exposes only the
-- schemas in its config, so moving them to `private` takes them off /rest/v1/rpc
-- while policies can still call them. EXECUTE must stay granted: a policy
-- expression runs with the querying role's privileges.

create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.my_coach_id()
returns uuid language sql stable security definer set search_path = public as $$
  select c.coach_id from public.clients c where c.id = (select auth.uid());
$$;

create or replace function private.owns_client(p_client uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.clients c
    where c.id = p_client and c.coach_id = (select auth.uid())
  );
$$;

create or replace function private.owns_programme(p_programme uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.programmes p
    where p.id = p_programme and p.coach_id = (select auth.uid())
  );
$$;

create or replace function private.owns_week(p_week uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.programme_weeks w
    join public.programmes p on p.id = w.programme_id
    where w.id = p_week and p.coach_id = (select auth.uid())
  );
$$;

create or replace function private.owns_session(p_session uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.sessions s
    join public.programme_weeks w on w.id = s.week_id
    join public.programmes p      on p.id = w.programme_id
    where s.id = p_session and p.coach_id = (select auth.uid())
  );
$$;

create or replace function private.week_is_pushed_to_me(p_week uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.assignments a
    where a.week_id   = p_week
      and a.client_id = (select auth.uid())
      and a.pushed_at is not null
  );
$$;

create or replace function private.session_is_pushed_to_me(p_session uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.sessions s
    join public.assignments a on a.week_id = s.week_id
    where s.id = p_session
      and a.client_id = (select auth.uid())
      and a.pushed_at is not null
  );
$$;

revoke all on all functions in schema private from anon, public;
grant execute on all functions in schema private to authenticated;

-- Repoint every policy that used a public helper.
drop policy coaches_select_self_or_mine   on public.coaches;
drop policy weeks_all_own                 on public.programme_weeks;
drop policy weeks_select_pushed           on public.programme_weeks;
drop policy sessions_all_own              on public.sessions;
drop policy sessions_select_pushed        on public.sessions;
drop policy exercises_all_own             on public.session_exercises;
drop policy exercises_select_pushed       on public.session_exercises;
drop policy assignments_all_by_coach      on public.assignments;
drop policy set_logs_select_by_coach      on public.set_logs;
drop policy check_ins_all_by_coach        on public.check_ins;
drop policy daily_metrics_select_by_coach on public.daily_metrics;

create policy coaches_select_self_or_mine on public.coaches for select to authenticated
  using (id = (select auth.uid()) or id = private.my_coach_id());

create policy weeks_all_own on public.programme_weeks for all to authenticated
  using (private.owns_programme(programme_id)) with check (private.owns_programme(programme_id));
create policy weeks_select_pushed on public.programme_weeks for select to authenticated
  using (private.week_is_pushed_to_me(id));

create policy sessions_all_own on public.sessions for all to authenticated
  using (private.owns_week(week_id)) with check (private.owns_week(week_id));
create policy sessions_select_pushed on public.sessions for select to authenticated
  using (private.week_is_pushed_to_me(week_id));

create policy exercises_all_own on public.session_exercises for all to authenticated
  using (private.owns_session(session_id)) with check (private.owns_session(session_id));
create policy exercises_select_pushed on public.session_exercises for select to authenticated
  using (private.session_is_pushed_to_me(session_id));

create policy assignments_all_by_coach on public.assignments for all to authenticated
  using (private.owns_client(client_id) and private.owns_week(week_id))
  with check (private.owns_client(client_id) and private.owns_week(week_id));

create policy set_logs_select_by_coach on public.set_logs for select to authenticated
  using (private.owns_client(client_id));

create policy check_ins_all_by_coach on public.check_ins for all to authenticated
  using (private.owns_client(client_id)) with check (private.owns_client(client_id));

create policy daily_metrics_select_by_coach on public.daily_metrics for select to authenticated
  using (private.owns_client(client_id));

-- Retire the exposed copies.
drop function if exists public.my_coach_id();
drop function if exists public.owns_client(uuid);
drop function if exists public.owns_programme(uuid);
drop function if exists public.owns_week(uuid);
drop function if exists public.owns_session(uuid);
drop function if exists public.owns_session_exercise(uuid);
drop function if exists public.week_is_pushed_to_me(uuid);
drop function if exists public.session_is_pushed_to_me(uuid);
drop function if exists public.exercise_is_pushed_to_me(uuid);

-- Pin the search_path on the pure derivation functions.
alter function public.cycle_day(date, int, date)                      set search_path = '';
alter function public.cycle_phase_on(date, int, date)                 set search_path = '';
alter function public.load_intensity_coefficient(public.cycle_phase)  set search_path = '';
alter function public.load_volume_coefficient(public.cycle_phase)     set search_path = '';
