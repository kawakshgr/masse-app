-- A day with no session is undecided. A rest day is a decision, and the client
-- should see the difference — "nothing here yet" and "today you rest" are not
-- the same message.
create type public.day_kind as enum ('training', 'rest');

alter table public.sessions
  add column if not exists kind public.day_kind not null default 'training';

-- A rest day holds no exercises, by construction rather than by convention.
create or replace function private.session_is_rest(p_session uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select kind = 'rest' from public.sessions where id = p_session;
$$;

revoke all     on function private.session_is_rest(uuid) from anon, public;
grant  execute on function private.session_is_rest(uuid) to authenticated;

alter table public.session_exercises
  add constraint session_exercises_not_on_rest_day
    check (not private.session_is_rest(session_id));
