-- The coach's note about a client, out of the client's reach.
--
-- clients.file_note sat on the client's own row, and clients_select lets her
-- read her whole row: RLS is row-level and cannot hide one column. A note her
-- coach writes about her is the coach's working file, not hers to read over
-- his shoulder — so it moves to a table only the coach's policy can open.

create table public.client_file_notes (
  client_id  uuid primary key references public.clients (id) on delete cascade,
  note       text not null,
  updated_at timestamptz not null default now()
);

alter table public.client_file_notes enable row level security;

-- The coach only. There is deliberately no policy for the client.
create policy client_file_notes_coach on public.client_file_notes
  for all to authenticated
  using (private.owns_client(client_id))
  with check (private.owns_client(client_id));

insert into public.client_file_notes (client_id, note)
select id, file_note from public.clients
where file_note is not null and btrim(file_note) <> '';

-- Data API grants, stated rather than inherited: from 30 Oct 2026 Supabase
-- stops granting new public tables to the API roles by default, and a fresh
-- project, a preview branch or `supabase db reset` would otherwise leave
-- this table unreachable. RLS still decides which rows. anon gets nothing:
-- every screen that reads it is behind sign-in.
grant select, insert, update, delete on public.client_file_notes to authenticated, service_role;
revoke all on public.client_file_notes from anon;
