-- A fixed plan's meals are numbered, not timed (29 Sep 2026): the client
-- chooses when she eats. at_time stays for the rows that had one, but is no
-- longer required or shown; `position` carries the order, set here from the
-- old times so every existing plan reads in the order it was written.
alter table public.plan_meals alter column at_time drop not null;

with ordered as (
  select id,
         row_number() over (
           partition by client_id, day_type_id
           order by at_time nulls last, position, id
         ) - 1 as rank
  from public.plan_meals
)
update public.plan_meals m
set position = o.rank
from ordered o
where o.id = m.id;
