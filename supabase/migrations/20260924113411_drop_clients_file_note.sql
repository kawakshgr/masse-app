-- Applied after the web app stopped reading clients.file_note, so the coach's
-- record form never pointed at a column that had gone.
alter table public.clients drop column file_note;
