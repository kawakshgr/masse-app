-- Ownership helpers. SECURITY DEFINER so a policy checking a parent table is not
-- itself filtered by that table's policy (which would recurse or deny).
-- NOTE: these public copies are retired in 20260921192934, which moves them into
-- the `private` schema so PostgREST cannot expose them as RPC endpoints.

create or replace function public.my_coach_id()
returns uuid language sql stable security definer set search_path = public as $$
  select c.coach_id from public.clients c where c.id = (select auth.uid());
$$;

create or replace function public.owns_client(p_client uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.clients c
    where c.id = p_client and c.coach_id = (select auth.uid())
  );
$$;

create or replace function public.owns_programme(p_programme uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.programmes p
    where p.id = p_programme and p.coach_id = (select auth.uid())
  );
$$;

create or replace function public.owns_week(p_week uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.programme_weeks w
    join public.programmes p on p.id = w.programme_id
    where w.id = p_week and p.coach_id = (select auth.uid())
  );
$$;

create or replace function public.owns_session(p_session uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.sessions s
    join public.programme_weeks w on w.id = s.week_id
    join public.programmes p      on p.id = w.programme_id
    where s.id = p_session and p.coach_id = (select auth.uid())
  );
$$;

create or replace function public.owns_session_exercise(p_exercise uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.session_exercises e
    join public.sessions s          on s.id = e.session_id
    join public.programme_weeks w   on w.id = s.week_id
    join public.programmes p        on p.id = w.programme_id
    where e.id = p_exercise and p.coach_id = (select auth.uid())
  );
$$;

-- pushed_at is the only thing that makes a week visible. Null means invisible.
create or replace function public.week_is_pushed_to_me(p_week uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.assignments a
    where a.week_id   = p_week
      and a.client_id = (select auth.uid())
      and a.pushed_at is not null
  );
$$;

create or replace function public.session_is_pushed_to_me(p_session uuid)
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

create or replace function public.exercise_is_pushed_to_me(p_exercise uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.session_exercises e
    join public.sessions s    on s.id = e.session_id
    join public.assignments a on a.week_id = s.week_id
    where e.id = p_exercise
      and a.client_id = (select auth.uid())
      and a.pushed_at is not null
  );
$$;
