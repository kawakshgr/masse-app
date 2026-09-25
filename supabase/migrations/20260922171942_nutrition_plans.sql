-- The coach gives the plan. Two ways, because they suit different clients:
-- macro targets for someone who can judge a portion, a fixed plan for someone
-- who wants no decisions. The prototype's own words.

create type public.nutrition_mode as enum ('macros', 'plan');

alter table public.clients
  add column nutrition_mode public.nutrition_mode not null default 'macros';

-- What the coach sets. Grams are the input; the percentage of intake and the
-- calorie cross-check are both derived at read time, never stored, so they
-- cannot drift from the numbers beside them.
create table public.nutrition_targets (
  client_id  uuid primary key references public.clients(id) on delete cascade,
  kcal       int not null default 2000,
  protein_g  int not null default 0,
  carbs_g    int not null default 0,
  fat_g      int not null default 0,
  updated_at timestamptz not null default now(),
  constraint nutrition_targets_kcal_sane check (kcal between 1000 and 6000),
  constraint nutrition_targets_macros_sane check (
    protein_g between 0 and 500 and carbs_g between 0 and 900 and fat_g between 0 and 300
  )
);

-- The day's shape: times and names in macros mode, the same rows carrying
-- items in plan mode. One table, because switching mode must not lose the
-- meal times she already set.
create table public.plan_meals (
  id        uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  at_time   time not null,
  name      text not null,
  position  int not null default 0,
  constraint plan_meals_name_present check (length(btrim(name)) > 0)
);

create index plan_meals_client_idx on public.plan_meals (client_id, at_time);

-- Items snapshot their name and macros, so editing a food later does not
-- silently rewrite a plan already published to a client.
create table public.plan_meal_items (
  id         uuid primary key default gen_random_uuid(),
  meal_id    uuid not null references public.plan_meals(id) on delete cascade,
  food_id    uuid references public.foods(id) on delete set null,
  name       text not null,
  quantity_g numeric(7,1),
  kcal       numeric(7,2),
  protein_g  numeric(6,2),
  carbs_g    numeric(6,2),
  fat_g      numeric(6,2),
  position   int not null default 0
);

create index plan_meal_items_meal_idx on public.plan_meal_items (meal_id, position);

alter table public.nutrition_targets enable row level security;
alter table public.plan_meals        enable row level security;
alter table public.plan_meal_items   enable row level security;

revoke all on public.nutrition_targets, public.plan_meals, public.plan_meal_items
  from anon;

-- The coach writes the plan; the client reads what she has been given.
create policy nutrition_targets_by_coach on public.nutrition_targets for all to authenticated
  using (private.owns_client(client_id)) with check (private.owns_client(client_id));

create policy nutrition_targets_read_own on public.nutrition_targets for select to authenticated
  using (client_id = (select auth.uid()));

create policy plan_meals_by_coach on public.plan_meals for all to authenticated
  using (private.owns_client(client_id)) with check (private.owns_client(client_id));

create policy plan_meals_read_own on public.plan_meals for select to authenticated
  using (client_id = (select auth.uid()));

-- Items follow their meal, so both policies go through it.
create or replace function private.owns_plan_meal(p_meal uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.plan_meals m
    where m.id = p_meal and private.owns_client(m.client_id)
  );
$$;

create or replace function private.plan_meal_is_mine(p_meal uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.plan_meals m
    where m.id = p_meal and m.client_id = (select auth.uid())
  );
$$;

revoke all on function private.owns_plan_meal(uuid), private.plan_meal_is_mine(uuid)
  from anon, public;
grant execute on function private.owns_plan_meal(uuid), private.plan_meal_is_mine(uuid)
  to authenticated;

create policy plan_meal_items_by_coach on public.plan_meal_items for all to authenticated
  using (private.owns_plan_meal(meal_id)) with check (private.owns_plan_meal(meal_id));

create policy plan_meal_items_read_own on public.plan_meal_items for select to authenticated
  using (private.plan_meal_is_mine(meal_id));

-- Data API grants, stated rather than inherited: from 30 Oct 2026 Supabase
-- stops granting new public tables to the API roles by default, and a fresh
-- project, a preview branch or `supabase db reset` would otherwise leave
-- these tables unreachable. RLS still decides which rows. anon gets nothing:
-- every screen that reads them is behind sign-in.
grant select, insert, update, delete on public.nutrition_targets, public.plan_meals, public.plan_meal_items to authenticated, service_role;
