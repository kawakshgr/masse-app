-- An invoice, once numbered, keeps what it was written with (2 Oct 2026):
-- ticking a month paid or changing the monthly rate re-sent the amount and
-- rewrote an issued invoice's figure while its PDF still said the old one.
-- Status and payment date still move; number, issue date and amount do not.
create or replace function private.invoice_issued_fixed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.invoice_number is not null then
    new.invoice_number := old.invoice_number;
    new.issued_at := old.issued_at;
    new.amount_cents := old.amount_cents;
  end if;
  return new;
end;
$$;

create trigger invoices_issued_fixed
  before update on public.invoices
  for each row execute function private.invoice_issued_fixed();
