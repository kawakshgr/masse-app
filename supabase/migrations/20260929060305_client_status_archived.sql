-- Archived: the coaching has ended. Its own migration, because a new enum
-- value cannot be used in the transaction that adds it.
alter type public.client_status add value if not exists 'archived';
