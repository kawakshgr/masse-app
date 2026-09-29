-- Rest between sets, as the coach prescribes it: exact (min = max) or a
-- range. Seconds. Shown to the client beside the target, so she can set it in
-- whatever gym timer she uses — Masse keeps no timer of its own on the web.
alter table public.session_exercises
  add column rest_min_s smallint check (rest_min_s > 0),
  add column rest_max_s smallint check (rest_max_s > 0),
  add constraint session_exercises_rest_ordered
    check (rest_min_s is null or rest_max_s is null or rest_max_s >= rest_min_s);
