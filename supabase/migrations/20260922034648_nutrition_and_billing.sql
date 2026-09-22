-- Nutrition and billing. The handoff reserved these three names for a later
-- phase; they are being built now at the owner's request, using the names it
-- reserved so nothing collides.
--
-- Billing is a ledger the coach ticks. There is no payment integration here and
-- no column that could trigger one: nothing is ever charged automatically.

create type public.invoice_status as enum ('draft', 'sent', 'paid', 'void');

-- The coach's own library. Macros per 100 g, so a quantity scales them.
create table public.foods (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null references public.coaches(id) on delete cascade,
  name         text not null,
  brand        text,
  kcal_100g    numeric(7,2),
  protein_100g numeric(6,2),
  carbs_100g   numeric(6,2),
  fat_100g     numeric(6,2),
  created_at   timestamptz not null default now(),
  constraint foods_name_present check (length(btrim(name)) > 0)
);

create unique index foods_unique_per_coach
  on public.foods (coach_id, lower(btrim(name)), coalesce(lower(btrim(brand)), ''));
create index foods_coach_idx on public.foods (coach_id, name);

-- What the client actually ate. The name and macros are snapshotted so a
-- deleted library entry cannot rewrite her history.
create table public.meals (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  day         date not null,
  slot        text,
  food_id     uuid references public.foods(id) on delete set null,
  name        text not null,
  quantity_g  numeric(7,1),
  kcal        numeric(7,2),
  protein_g   numeric(6,2),
  carbs_g     numeric(6,2),
  fat_g       numeric(6,2),
  logged_at   timestamptz not null default now()
);

create index meals_client_day_idx on public.meals (client_id, day desc);

create table public.invoices (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null references public.coaches(id) on delete cascade,
  client_id    uuid not null references public.clients(id) on delete cascade,
  period_start date not null,
  period_end   date,
  -- Integer cents: money never goes through a float.
  amount_cents int not null default 0,
  currency     text not null default 'EUR',
  status       public.invoice_status not null default 'draft',
  issued_at    timestamptz,
  paid_at      timestamptz,
  note         text,
  created_at   timestamptz not null default now(),
  constraint invoices_amount_sane   check (amount_cents >= 0),
  constraint invoices_period_sane   check (period_end is null or period_end >= period_start),
  constraint invoices_currency_code check (currency ~ '^[A-Z]{3}$')
);

create index invoices_coach_idx  on public.invoices (coach_id, period_start desc);
create index invoices_client_idx on public.invoices (client_id, period_start desc);

alter table public.foods    enable row level security;
alter table public.meals    enable row level security;
alter table public.invoices enable row level security;

revoke all on public.foods, public.meals, public.invoices from anon;

-- ---------- foods ----------
-- The coach owns her library; her clients may read it to log against it.
create policy foods_all_own on public.foods for all to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));

create policy foods_select_by_my_client on public.foods for select to authenticated
  using (coach_id = private.my_coach_id());

-- ---------- meals ----------
create policy meals_all_own on public.meals for all to authenticated
  using (client_id = (select auth.uid())) with check (client_id = (select auth.uid()));

create policy meals_select_by_coach on public.meals for select to authenticated
  using (private.owns_client(client_id));

-- ---------- invoices ----------
-- The coach's ledger, and only hers. The client is billed outside the app in
-- v1, so she has no policy here at all.
create policy invoices_all_by_coach on public.invoices for all to authenticated
  using (coach_id = (select auth.uid()) and private.owns_client(client_id))
  with check (coach_id = (select auth.uid()) and private.owns_client(client_id));
