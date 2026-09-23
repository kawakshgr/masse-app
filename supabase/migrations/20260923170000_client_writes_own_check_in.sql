-- The client can file her own weekly check-in.
--
-- The schema always expected this: `author` has carried 'coach' and 'client'
-- since the first migration, and the handoff said the client-submitted form
-- "only changes who writes the row". This is that change, and nothing else —
-- no new column, no new table.
--
-- Three things the policy has to hold, because the client row and the coach
-- row live in the same table:
--
--   1. She writes as herself. author = 'client' is in the check, so she cannot
--      file something that reads as her coach's assessment.
--   2. She does not edit her coach's. A row authored by the coach is outside
--      the USING clause entirely, so it is invisible to her update.
--   3. She does not rewrite what has already been read. Once the coach marks a
--      check-in reviewed, reviewed_at stops being null and the row leaves her
--      reach — a coach who read "tout fait" on Monday should not find "difficile"
--      there on Friday. It is also in the WITH CHECK, so she cannot mark her
--      own as reviewed to get around it.

create policy check_ins_insert_own on public.check_ins
  for insert to authenticated
  with check (
    client_id = (select auth.uid())
    and author = 'client'
  );

create policy check_ins_update_own on public.check_ins
  for update to authenticated
  using (
    client_id = (select auth.uid())
    and author = 'client'
    and reviewed_at is null
  )
  with check (
    client_id = (select auth.uid())
    and author = 'client'
    and reviewed_at is null
  );
