-- The Storage API finds a file before it removes it, so without a select
-- policy a coach's "remove my logo" matched nothing and left the file behind.
-- Public reads go through the public URL and do not need this.
create policy coach_logos_read_own on storage.objects
  for select to authenticated
  using (bucket_id = 'coach-logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
