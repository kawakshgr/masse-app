-- A steps target, beside the sleep one that has been there since the first
-- migration. Without it the client app can show her step count but has nothing
-- to show it against, and a number with no target is a number, not a brief.
--
-- On the client rather than per day type: a coach who varies steps by training
-- day is asking for something the day-type model would carry, but nobody has
-- asked for that and a column that nobody sets is worse than one that arrives
-- when it is wanted.
alter table public.clients
  add column steps_target int;

alter table public.clients
  add constraint clients_steps_target_sane
    check (steps_target is null or (steps_target > 0 and steps_target <= 100000));

comment on column public.clients.steps_target is
  'Daily step target the coach sets. Null means she has not set one, which the client app reads as "no target" rather than as zero.';
