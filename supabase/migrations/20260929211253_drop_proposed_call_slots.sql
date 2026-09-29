-- The proposed-slots columns of the morning of 29 Sep 2026 gave way to a
-- booked call (appointments); nothing reads them any more.
alter table public.clients drop column call_minutes, drop column call_slots_at;
