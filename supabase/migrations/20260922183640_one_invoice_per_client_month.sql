-- A month is settled or it is not: two rows for the same client and period
-- would let the tab show one answer and the ledger hold another. The unique
-- key is also what the tick upserts on.
alter table public.invoices
  add constraint invoices_one_per_client_period unique (client_id, period_start);
