-- The coach decides when the weekly check-in is due.
--
-- Stored as days after the week's Monday: 4 is that Friday, 6 its Sunday
-- (the default), 8 the Tuesday after. Before Friday there is too little week
-- to report on; after Tuesday the next week has already begun. The client
-- keeps two more days to catch up, and past the due day it is "late".
-- Her app reads this from her coach's row, which coaches_select_self_or_mine
-- already lets her see.
alter table public.coaches
  add column check_in_due_offset smallint not null default 6
    check (check_in_due_offset between 4 and 8);
