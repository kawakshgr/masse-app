-- A second step target, for rest days.
--
-- The prototype states it as a fact on screen — "rest days drop to 6,000
-- automatically" — and a sentence like that has to be backed by a number
-- somebody set. A ratio invented here would be the app making up a coaching
-- decision; a column is the coach making it.
--
-- Null means no drop: every day is held to the one target, which is what a
-- client with no rest days in her week has anyway.
alter table public.clients
  add column steps_target_rest int;

alter table public.clients
  add constraint clients_steps_target_rest_sane
    check (steps_target_rest is null
           or (steps_target_rest > 0 and steps_target_rest <= 100000));

comment on column public.clients.steps_target_rest is
  'Step target on days whose day type is a rest day. Null means the ordinary target applies every day.';
