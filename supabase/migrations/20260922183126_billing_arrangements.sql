-- The billing tab's primary record is the arrangement, not the invoice: what
-- was agreed with this client. Invoices are the monthly consequence of it.
create type public.billing_type as enum ('monthly', 'pack');

create table public.billing_arrangements (
  client_id     uuid primary key references public.clients(id) on delete cascade,
  coach_id      uuid not null references public.coaches(id) on delete cascade,
  amount_cents  int  not null default 0,
  currency      text not null default 'EUR',
  type          public.billing_type not null default 'monthly',
  -- 1..28 only: every month has a 28th, so an agreed day never silently moves.
  day_of_month  smallint not null default 1,
  pack_sessions smallint not null default 10,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint billing_amount_sane   check (amount_cents >= 0),
  constraint billing_day_sane      check (day_of_month between 1 and 28),
  constraint billing_pack_sane     check (pack_sessions between 1 and 200),
  constraint billing_currency_code check (currency ~ '^[A-Z]{3}$')
);

create index billing_arrangements_coach_idx on public.billing_arrangements (coach_id);

alter table public.billing_arrangements enable row level security;
revoke all on public.billing_arrangements from anon;

-- Money is the coach's business alone. There is no policy for a client, so a
-- client selecting from this table gets zero rows.
create policy billing_arrangements_own on public.billing_arrangements
  for all to authenticated
  using (private.owns_client(client_id))
  with check (private.owns_client(client_id) and coach_id = auth.uid());

-- Data API grants, stated rather than inherited: from 30 Oct 2026 Supabase
-- stops granting new public tables to the API roles by default, and a fresh
-- project, a preview branch or `supabase db reset` would otherwise leave
-- this table unreachable. RLS still decides which rows. anon gets nothing:
-- every screen that reads it is behind sign-in.
grant select, insert, update, delete on public.billing_arrangements to authenticated, service_role;
