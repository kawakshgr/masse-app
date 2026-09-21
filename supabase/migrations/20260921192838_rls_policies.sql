-- Row-level security from the start, even with one coach. One policy per table now
-- prevents a leak when the second coach signs up.

alter table public.coaches           enable row level security;
alter table public.clients           enable row level security;
alter table public.invite_codes      enable row level security;
alter table public.programmes        enable row level security;
alter table public.programme_weeks   enable row level security;
alter table public.sessions          enable row level security;
alter table public.session_exercises enable row level security;
alter table public.assignments       enable row level security;
alter table public.set_logs          enable row level security;
alter table public.check_ins         enable row level security;
alter table public.cycle_logs        enable row level security;
alter table public.daily_metrics     enable row level security;

-- Nothing in this schema is reachable without a session.
revoke all on all tables in schema public from anon;

-- ---------- coaches ----------
create policy coaches_select_self_or_mine on public.coaches for select to authenticated
  using (id = (select auth.uid()) or id = public.my_coach_id());
create policy coaches_insert_self on public.coaches for insert to authenticated
  with check (id = (select auth.uid()));
create policy coaches_update_self on public.coaches for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ---------- clients ----------
create policy clients_select on public.clients for select to authenticated
  using (coach_id = (select auth.uid()) or id = (select auth.uid()));
create policy clients_insert_by_coach on public.clients for insert to authenticated
  with check (coach_id = (select auth.uid()));
create policy clients_update on public.clients for update to authenticated
  using (coach_id = (select auth.uid()) or id = (select auth.uid()))
  with check (coach_id = (select auth.uid()) or id = (select auth.uid()));
create policy clients_delete_by_coach on public.clients for delete to authenticated
  using (coach_id = (select auth.uid()));

-- ---------- invite_codes ----------
-- The coach's own codes only. Redemption by a not-yet-authenticated client runs
-- through a SECURITY DEFINER function, never through a table read.
create policy invite_codes_all_own on public.invite_codes for all to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));

-- ---------- programmes ----------
create policy programmes_all_own on public.programmes for all to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));

-- ---------- programme_weeks ----------
create policy weeks_all_own on public.programme_weeks for all to authenticated
  using (public.owns_programme(programme_id)) with check (public.owns_programme(programme_id));
create policy weeks_select_pushed on public.programme_weeks for select to authenticated
  using (public.week_is_pushed_to_me(id));

-- ---------- sessions ----------
create policy sessions_all_own on public.sessions for all to authenticated
  using (public.owns_week(week_id)) with check (public.owns_week(week_id));
create policy sessions_select_pushed on public.sessions for select to authenticated
  using (public.week_is_pushed_to_me(week_id));

-- ---------- session_exercises ----------
create policy exercises_all_own on public.session_exercises for all to authenticated
  using (public.owns_session(session_id)) with check (public.owns_session(session_id));
create policy exercises_select_pushed on public.session_exercises for select to authenticated
  using (public.session_is_pushed_to_me(session_id));

-- ---------- assignments ----------
create policy assignments_all_by_coach on public.assignments for all to authenticated
  using (public.owns_client(client_id) and public.owns_week(week_id))
  with check (public.owns_client(client_id) and public.owns_week(week_id));
create policy assignments_select_pushed on public.assignments for select to authenticated
  using (client_id = (select auth.uid()) and pushed_at is not null);

-- ---------- set_logs ----------
-- The client writes her own sets. The coach reads them and never writes them.
create policy set_logs_all_own on public.set_logs for all to authenticated
  using (client_id = (select auth.uid())) with check (client_id = (select auth.uid()));
create policy set_logs_select_by_coach on public.set_logs for select to authenticated
  using (public.owns_client(client_id));

-- ---------- check_ins ----------
-- v1: the coach authors. The client reads. The schema already fits the later flip.
create policy check_ins_all_by_coach on public.check_ins for all to authenticated
  using (public.owns_client(client_id)) with check (public.owns_client(client_id));
create policy check_ins_select_own on public.check_ins for select to authenticated
  using (client_id = (select auth.uid()));

-- ---------- cycle_logs ----------
-- Article 9. The client, and only the client. The coach has no policy here at all:
-- she reaches phase and coefficients through client_cycle_state(), which returns
-- no dates. Enforced in the database, not in the UI layer.
create policy cycle_logs_all_own on public.cycle_logs for all to authenticated
  using (client_id = (select auth.uid())) with check (client_id = (select auth.uid()));

-- ---------- daily_metrics ----------
create policy daily_metrics_all_own on public.daily_metrics for all to authenticated
  using (client_id = (select auth.uid())) with check (client_id = (select auth.uid()));
create policy daily_metrics_select_by_coach on public.daily_metrics for select to authenticated
  using (public.owns_client(client_id));
