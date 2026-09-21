-- These functions write an audit row before they read. A function that writes
-- is volatile by definition; declaring it stable invites the planner to cache
-- or skip it, which would silently drop the trace that justifies the access.
-- Caught in testing: the cycle read returned rows and wrote no log line.
alter function public.admin_read_client(uuid, text)          volatile;
alter function public.admin_read_client_cycle(uuid, text)    volatile;
alter function public.admin_read_client_checkins(uuid, text) volatile;
