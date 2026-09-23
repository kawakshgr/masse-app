-- Issued invoices, kept. French bookkeeping requires holding them for years,
-- and a coach who changes her address later must still be able to produce the
-- paper as it was sent — so the file is archived, not re-rendered on demand.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invoices', 'invoices', false, 4194304, array['application/pdf'])
on conflict (id) do nothing;

-- The first path segment is the coach's own id. A malformed one returns null
-- rather than raising inside a policy, and null satisfies nothing, so a
-- traversal attempt is denied instead of erroring.
create or replace function private.folder_coach(p_name text)
returns uuid language sql immutable as $$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', 1)::uuid
  end;
$$;

revoke all     on function private.folder_coach(text) from anon, public;
grant  execute on function private.folder_coach(text) to authenticated;

-- Money is the coach's alone: no client policy exists on this bucket either.
create policy invoices_read on storage.objects for select to authenticated
  using (bucket_id = 'invoices' and private.folder_coach(name) = (select auth.uid()));

create policy invoices_write on storage.objects for insert to authenticated
  with check (bucket_id = 'invoices' and private.folder_coach(name) = (select auth.uid()));

create policy invoices_update on storage.objects for update to authenticated
  using (bucket_id = 'invoices' and private.folder_coach(name) = (select auth.uid()))
  with check (bucket_id = 'invoices' and private.folder_coach(name) = (select auth.uid()));

alter table public.invoices
  add column if not exists pdf_path    text,
  add column if not exists archived_at timestamptz,
  add column if not exists sent_at     timestamptz;
