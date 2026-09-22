alter table public.invoices
  add column if not exists invoice_number text;

-- A French invoice number has to be continuous and unique. Two of them must
-- never collide, so the counter is read and bumped under a row lock rather
-- than read in the app and written back.
create unique index if not exists invoices_number_unique
  on public.invoices (coach_id, invoice_number)
  where invoice_number is not null;

create or replace function public.assign_invoice_number(
  p_client uuid,
  p_period date,
  p_amount int
) returns text
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_coach  uuid := auth.uid();
  v_prefix text;
  v_no     int;
  v_number text;
  v_existing text;
begin
  if v_coach is null then
    raise exception 'not signed in';
  end if;

  -- RLS on invoices already restricts this to the coach's own clients; the
  -- explicit check keeps the failure honest rather than silently writing none.
  if not private.owns_client(p_client) then
    raise exception 'not your client';
  end if;

  select invoice_number into v_existing
  from public.invoices
  where client_id = p_client and period_start = p_period;

  -- Numbering is spent once. Re-issuing a month keeps the number it had.
  if v_existing is not null then
    return v_existing;
  end if;

  select invoice_prefix, next_invoice_no into v_prefix, v_no
  from public.coach_billing_profiles
  where coach_id = v_coach
  for update;

  if v_prefix is null then
    raise exception 'no billing profile';
  end if;

  v_number := v_prefix || to_char(p_period, 'YYYY') || '-' || lpad(v_no::text, 4, '0');

  insert into public.invoices (coach_id, client_id, period_start, amount_cents,
                               status, issued_at, invoice_number)
  values (v_coach, p_client, p_period, greatest(p_amount, 0),
          'sent', now(), v_number)
  on conflict (client_id, period_start) do update
    set invoice_number = excluded.invoice_number,
        issued_at      = excluded.issued_at,
        amount_cents   = excluded.amount_cents,
        status         = case when public.invoices.status = 'paid'
                              then public.invoices.status else 'sent' end;

  update public.coach_billing_profiles
     set next_invoice_no = v_no + 1
   where coach_id = v_coach;

  return v_number;
end;
$$;

revoke all on function public.assign_invoice_number(uuid, date, int) from public, anon;
grant execute on function public.assign_invoice_number(uuid, date, int) to authenticated;
