-- A day type is what a day IS — "Upper", "Lower", "OFF" — and therefore how it
-- is eaten. The coach names her own; nothing here is a fixed vocabulary.
--
-- This is the pivot that makes two separate requests one thing: nutrition hangs
-- off the day type rather than off the weekday, so when a client moves a rest
-- day the plan follows without anybody recalculating anything.
create table public.day_types (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  name       text not null,
  -- A rest day eats differently, and the client app needs to know which one
  -- this is without parsing its name.
  is_rest    boolean not null default false,
  position   int not null default 0,
  created_at timestamptz not null default now(),
  constraint day_types_name_present check (length(btrim(name)) > 0)
);

create index day_types_client_idx on public.day_types (client_id, position);
create unique index day_types_unique_name
  on public.day_types (client_id, lower(btrim(name)));

-- The client's ordinary week: which type each weekday is. Seven rows at most.
-- Moving a rest day is swapping two of them.
create table public.client_week_days (
  client_id   uuid not null references public.clients(id) on delete cascade,
  day_index   smallint not null,
  day_type_id uuid references public.day_types(id) on delete set null,
  primary key (client_id, day_index),
  constraint client_week_days_range check (day_index between 0 and 6)
);

-- Targets move from one row per client to one per day type. The old row stays
-- as the fallback: a client with no day types at all keeps exactly what she has.
alter table public.nutrition_targets
  drop constraint nutrition_targets_pkey;

alter table public.nutrition_targets
  add column day_type_id uuid references public.day_types(id) on delete cascade;

-- One row per (client, day type), and one with a null type as the default.
create unique index nutrition_targets_default_unique
  on public.nutrition_targets (client_id) where day_type_id is null;
create unique index nutrition_targets_per_type_unique
  on public.nutrition_targets (client_id, day_type_id) where day_type_id is not null;

alter table public.plan_meals
  add column day_type_id uuid references public.day_types(id) on delete cascade;

create index plan_meals_type_idx on public.plan_meals (client_id, day_type_id, at_time);

alter table public.day_types enable row level security;
alter table public.client_week_days enable row level security;
revoke all on public.day_types, public.client_week_days from anon;

-- The coach writes them; the client reads her own, because her app has to know
-- what today is in order to show the right plan.
create policy day_types_coach on public.day_types for all to authenticated
  using (private.owns_client(client_id)) with check (private.owns_client(client_id));

create policy day_types_client_read on public.day_types for select to authenticated
  using (client_id = (select auth.uid()));

create policy client_week_days_coach on public.client_week_days for all to authenticated
  using (private.owns_client(client_id)) with check (private.owns_client(client_id));

-- The client may move her own days. That is the point: a rest day that cannot
-- move is a rest day she trains through.
create policy client_week_days_own on public.client_week_days for all to authenticated
  using (client_id = (select auth.uid())) with check (client_id = (select auth.uid()));
