-- Reverted before anything used it. The coach asks for the same step count
-- every day, rest days included, so a second target was a rule nobody wanted —
-- and it made a lit bar at 6,200 sit beside a dark one at 7,400 with no way to
-- explain the difference on screen.
alter table public.clients
  drop constraint if exists clients_steps_target_rest_sane;

alter table public.clients
  drop column if exists steps_target_rest;
