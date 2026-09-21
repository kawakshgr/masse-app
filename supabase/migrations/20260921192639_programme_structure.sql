-- Programme structure stays relational: both clients decode the same rows.
-- No UI-shaped JSON blob.

create table public.programmes (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.coaches(id) on delete cascade,
  name        text not null,                    -- 'Upper / Lower — 4 day'
  is_template boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index programmes_coach_id_idx on public.programmes (coach_id);

create table public.programme_weeks (
  id           uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes(id) on delete cascade,
  week_number  int not null,
  constraint programme_weeks_unique unique (programme_id, week_number),
  constraint programme_weeks_number_positive check (week_number >= 1)
);

create table public.sessions (
  id        uuid primary key default gen_random_uuid(),
  week_id   uuid not null references public.programme_weeks(id) on delete cascade,
  day_index int not null,                        -- 0=Mon … 6=Sun
  name      text,                                -- 'Lower — hinge focus'
  notes     text,
  constraint sessions_unique_day unique (week_id, day_index),
  constraint sessions_day_range  check (day_index between 0 and 6)
);

create table public.session_exercises (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null references public.sessions(id) on delete cascade,
  position         int not null,
  name             text not null,
  scheme           text,                          -- '4 × 5 @ 82.5 kg' — free text in v1
  target_sets      int,
  target_reps      int,
  target_weight_kg numeric(6,2),
  cue              text,
  constraint session_exercises_position_positive check (position >= 0)
);

create index session_exercises_session_idx on public.session_exercises (session_id, position);

-- The delivery boundary. pushed_at null means invisible to the client — the only
-- thing that makes a week visible. Neither client may read an unpushed week.
create table public.assignments (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  week_id    uuid not null references public.programme_weeks(id) on delete cascade,
  start_date date not null,
  pushed_at  timestamptz,
  constraint assignments_unique unique (client_id, week_id)
);

create index assignments_client_idx on public.assignments (client_id);
create index assignments_week_idx   on public.assignments (week_id);
