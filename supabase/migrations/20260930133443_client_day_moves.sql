-- A client's week, rearranged for one week.
--
-- The coach plans by weekday twice over: the session sits on a day of the
-- programme week, and the day type — so the food — on a day of the client's
-- ordinary week. Life moves days. A row here says "this week, on this
-- weekday, I do that planned day", and every reader takes both the session
-- and the day type from the planned day: they cannot come apart.
--
-- Nothing of the coach's is rewritten — the programme is shared between
-- clients and the ordinary week is hers to set. Next Monday the week is as
-- planned again.
create table public.client_day_moves (
  client_id   uuid not null references public.clients(id) on delete cascade,
  -- The Monday of the week that was rearranged, in the client's timezone.
  week_start  date not null,
  day_index   smallint not null,
  planned_day smallint not null,
  primary key (client_id, week_start, day_index),
  constraint client_day_moves_range
    check (day_index between 0 and 6 and planned_day between 0 and 6)
);

alter table public.client_day_moves enable row level security;

-- The client moves their own days; the coach reads them, so a session done
-- on another day is not counted as missed.
create policy client_day_moves_own on public.client_day_moves for all to authenticated
  using (client_id = (select auth.uid())) with check (client_id = (select auth.uid()));

create policy client_day_moves_coach_reads on public.client_day_moves for select to authenticated
  using (private.owns_client(client_id));

grant select, insert, update, delete on public.client_day_moves to authenticated, service_role;
revoke all on public.client_day_moves from anon;

-- The ordinary week is the coach's alone from now on: a client used to swap
-- day types in it, for good and without the sessions. Moves go above.
drop policy client_week_days_own on public.client_week_days;

create policy client_week_days_client_reads on public.client_week_days for select to authenticated
  using (client_id = (select auth.uid()));
