-- A logo per coach (29 Sep 2026): printed on invoices and PDFs, shown to the
-- coach's clients in their app. Branding is public by nature, so the bucket
-- is public-read; writing is limited to the coach's own folder. PNG or JPEG
-- only — the PDF renderer draws nothing else — and 1 MB at most.
alter table public.coaches add column logo_path text;

-- The guard's list of what a coach may change on their own row gains the
-- logo. Rebuilt from the live definition (20260925144729).
create or replace function private.coach_self_update_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  editable constant text[] := array[
    'name', 'first_name', 'pronoun', 'phone', 'check_in_due_offset', 'logo_path'
  ];
begin
  if current_user = 'authenticated'
     and new.id = (select auth.uid())
     and not private.is_platform_admin()
     and (to_jsonb(new) - editable) is distinct from (to_jsonb(old) - editable)
  then
    raise exception 'a coach may only edit her own details'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('coach-logos', 'coach-logos', true, 1048576, array['image/png', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- The coach's folder is their id; only a coach writes, and only there.
create policy coach_logos_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'coach-logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.coaches c where c.id = (select auth.uid()))
  );

create policy coach_logos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'coach-logos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'coach-logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy coach_logos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'coach-logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
