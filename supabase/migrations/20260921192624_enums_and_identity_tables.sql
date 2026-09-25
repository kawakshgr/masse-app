-- Masse v1 — enums, coaches, invite codes, clients.
-- Values match the handoff data model verbatim: they are the contract the web and
-- iOS clients both decode. Display translation belongs in the i18n dictionaries.

create type public.pronoun            as enum ('she','he');
create type public.invite_state       as enum ('sent','opened','joined','expired','revoked');
create type public.client_goal        as enum ('Get stronger','Build muscle','Lean out','Move better');
create type public.client_status      as enum ('active','paused');
create type public.checkin_feel       as enum ('Strong','Steady','Heavy');
create type public.checkin_pain       as enum ('None','Minor','Need to talk');
create type public.checkin_adherence  as enum ('All of it','Most','Struggled');
create type public.checkin_author     as enum ('coach','client');
create type public.cycle_phase        as enum ('menstrual','follicular','ovulatory','luteal');

create table public.coaches (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  first_name  text,
  pronoun     public.pronoun not null default 'she',
  created_at  timestamptz not null default now()
);

-- The client IS an account, from the moment she claims her code.
create table public.clients (
  id                uuid primary key references auth.users(id) on delete cascade,
  coach_id          uuid not null references public.coaches(id) on delete cascade,
  name              text not null,
  first_name        text,
  email             text,
  slug              text,
  -- From onboarding. These ARE her record, not seeded data.
  height_cm         numeric(5,1),
  birth_year        int,
  start_weight_kg   numeric(5,2),
  start_weight_date date,
  goal              public.client_goal,
  -- Health data in the broad sense: never indexed, never analysed, never forwarded.
  injuries          text[] not null default '{}',
  equipment         text[] not null default '{}',
  session_days      int[]  not null default '{}',   -- 0=Mon … 6=Sun
  sleep_target_h    numeric(3,1),
  cycle_tracking    boolean not null default false, -- opt-in, revocable
  status            public.client_status not null default 'active',
  created_at        timestamptz not null default now(),
  constraint clients_slug_unique_per_coach unique (coach_id, slug),
  constraint clients_session_days_range check (session_days <@ array[0,1,2,3,4,5,6]),
  constraint clients_birth_year_sane      check (birth_year is null or birth_year between 1900 and 2100)
);

create index clients_coach_id_idx on public.clients (coach_id);

create table public.invite_codes (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.coaches(id) on delete cascade,
  code        text not null unique,              -- 'MERLET-4K2P', one use only
  state       public.invite_state not null default 'sent',
  issued_at   timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '14 days'),
  claimed_by  uuid references public.clients(id) on delete set null,
  ask_cycle   boolean not null default false
);

create index invite_codes_coach_id_idx on public.invite_codes (coach_id);
create index invite_codes_code_idx     on public.invite_codes (code);

-- Data API grants, stated rather than inherited: from 30 Oct 2026 Supabase
-- stops granting new public tables to the API roles by default, and a fresh
-- project, a preview branch or `supabase db reset` would otherwise leave
-- these tables unreachable. RLS still decides which rows. anon gets nothing:
-- every screen that reads them is behind sign-in.
grant select, insert, update, delete on public.coaches, public.clients, public.invite_codes to authenticated, service_role;
