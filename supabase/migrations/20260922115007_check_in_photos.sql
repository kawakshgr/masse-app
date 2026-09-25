-- Progress photos on a check-in.
--
-- Body photographs are as sensitive as anything else here, so the bucket is
-- private and every read goes through a signed URL. The path carries the
-- client id as its first segment, which is what the storage policies filter on.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'check-in-photos',
  'check-in-photos',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- A bad path must not raise inside a policy, so this returns null instead of
-- letting a malformed segment fail the cast. Null satisfies no policy, so a
-- traversal attempt like '../../etc/passwd' is denied rather than erroring.
create or replace function private.folder_client(p_name text)
returns uuid language sql immutable as $$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', 1)::uuid
  end;
$$;

revoke all     on function private.folder_client(text) from anon, public;
grant  execute on function private.folder_client(text) to authenticated;

create policy check_in_photos_read on storage.objects for select to authenticated
  using (
    bucket_id = 'check-in-photos'
    and (
      private.folder_client(name) = (select auth.uid())
      or private.owns_client(private.folder_client(name))
    )
  );

create policy check_in_photos_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'check-in-photos'
    and (
      private.folder_client(name) = (select auth.uid())
      or private.owns_client(private.folder_client(name))
    )
  );

create policy check_in_photos_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'check-in-photos'
    and (
      private.folder_client(name) = (select auth.uid())
      or private.owns_client(private.folder_client(name))
    )
  );

-- The rows that give the files order and meaning.
create table public.check_in_photos (
  id           uuid primary key default gen_random_uuid(),
  check_in_id  uuid not null references public.check_ins(id) on delete cascade,
  client_id    uuid not null references public.clients(id) on delete cascade,
  storage_path text not null unique,
  note         text,
  uploaded_at  timestamptz not null default now()
);

create index check_in_photos_checkin_idx on public.check_in_photos (check_in_id);

alter table public.check_in_photos enable row level security;
revoke all on public.check_in_photos from anon;

create policy check_in_photos_rows_own on public.check_in_photos for all to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()));

create policy check_in_photos_rows_coach on public.check_in_photos for all to authenticated
  using (private.owns_client(client_id))
  with check (private.owns_client(client_id));

-- Data API grants, stated rather than inherited: from 30 Oct 2026 Supabase
-- stops granting new public tables to the API roles by default, and a fresh
-- project, a preview branch or `supabase db reset` would otherwise leave
-- this table unreachable. RLS still decides which rows. anon gets nothing:
-- every screen that reads it is behind sign-in.
grant select, insert, update, delete on public.check_in_photos to authenticated, service_role;
