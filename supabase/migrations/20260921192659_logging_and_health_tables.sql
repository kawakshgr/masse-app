-- synced_at null means the row exists only on the device. Both clients use the
-- same convention so a coach sees the same "held" state whichever app is used.
create table public.set_logs (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null references public.clients(id) on delete cascade,
  session_exercise_id uuid not null references public.session_exercises(id) on delete cascade,
  set_index           int not null,
  reps                int,
  weight_kg           numeric(6,2),
  rpe                 int,
  logged_at           timestamptz not null default now(),
  synced_at           timestamptz,
  constraint set_logs_rpe_range check (rpe is null or rpe between 1 and 10)
);

create index set_logs_client_idx   on public.set_logs (client_id, logged_at desc);
create index set_logs_exercise_idx on public.set_logs (session_exercise_id);

-- Authored by the COACH in v1, by the client later. Only `author` changes.
create table public.check_ins (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  week_start_date date not null,
  feel            public.checkin_feel,
  pain            public.checkin_pain,
  adherence       public.checkin_adherence,
  bodyweight_kg   numeric(5,2),
  note            text,
  author          public.checkin_author not null default 'coach',
  submitted_at    timestamptz not null default now(),
  reviewed_at     timestamptz,                   -- null = waiting on the coach
  constraint check_ins_unique_week unique (client_id, week_start_date)
);

create index check_ins_client_idx on public.check_ins (client_id, week_start_date desc);

-- GDPR Art. 9 special-category data. EU region, dates only, NEVER symptoms.
-- Store the start date and the cycle length. Nothing else: no symptom, no mood,
-- no pain score. Symptom notes have no table here and never will — they stay on
-- the client's device. That promise is enforced by absence, not by policy.
create table public.cycle_logs (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients(id) on delete cascade,
  period_start_date date not null,
  cycle_length_days int not null default 28,
  logged_at         timestamptz not null default now(),
  constraint cycle_logs_length_sane check (cycle_length_days between 15 and 60)
);

create index cycle_logs_client_idx on public.cycle_logs (client_id, period_start_date desc);

-- Manual entry in v1. No Apple Health, no Health Connect.
create table public.daily_metrics (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients(id) on delete cascade,
  day           date not null,
  sleep_h       numeric(4,2),
  sleep_quality int,                             -- 1 rough … 3 good
  steps         int,
  constraint daily_metrics_unique unique (client_id, day),
  constraint daily_metrics_quality_range check (sleep_quality is null or sleep_quality between 1 and 3),
  constraint daily_metrics_steps_positive check (steps is null or steps >= 0)
);

create index daily_metrics_client_idx on public.daily_metrics (client_id, day desc);
