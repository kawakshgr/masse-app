-- Any weekday, Monday to Sunday. A check-in reviews one Monday–Sunday week:
-- due Friday to Sunday, it is that week's (offsets 4–6); due Monday to
-- Thursday, the week just ended (7–10). So the range widens to 4–10.
alter table public.coaches drop constraint if exists coaches_check_in_due_offset_check;
alter table public.coaches add constraint coaches_check_in_due_offset_check
  check (check_in_due_offset between 4 and 10);
