-- A sign-up the coach has not accepted yet (30 Sep 2026). Added on its own:
-- a new enum value cannot be used in the transaction that creates it.
alter type public.client_status add value if not exists 'pending' before 'active';
