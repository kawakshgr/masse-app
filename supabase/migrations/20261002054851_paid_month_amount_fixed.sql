-- A month marked paid is closed (2 Oct 2026, Kevin): its amount stays what
-- was paid, whatever the rate becomes or however often it is ticked again.
-- Unticking it reopens it; an issued invoice stays fixed regardless.
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
  elsif old.status = 'paid' and new.status = 'paid' then
    new.amount_cents := old.amount_cents;
  end if;
  return new;
end;
$$;
