-- Lateness is the coach's call, not the clock's. Deriving it meant "awaiting"
-- could never be the answer once the agreed day had passed: she picked it and
-- the row said "late" back at her.
alter type public.invoice_status add value if not exists 'late';
