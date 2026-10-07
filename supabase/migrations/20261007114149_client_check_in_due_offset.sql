-- A check-in day per client (7 Oct 2026). Null follows the coach's day
-- (coaches.check_in_due_offset); a value, same scale (4 = Friday … 10 =
-- Thursday), is that client's own. The coach writes it; a client cannot,
-- since clients_self_update_guard lets a client change only their own details.
alter table public.clients
  add column check_in_due_offset smallint
    check (check_in_due_offset between 4 and 10);

comment on column public.clients.check_in_due_offset is
  'This client''s check-in due day as an offset from the reviewed week''s Monday (4–10); null = the coach''s day.';
