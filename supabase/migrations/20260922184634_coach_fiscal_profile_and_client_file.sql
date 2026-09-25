-- ---------- the coach's own company ----------
-- An invoice carries mandatory mentions in France. They belong to the coach,
-- not to any one client, so they live once on her account and every invoice
-- reads them. Nothing here is validated against a registry: it is what she
-- tells us, and her accountant is the one who checks it.
create table public.coach_billing_profiles (
  coach_id        uuid primary key references public.coaches(id) on delete cascade,
  legal_name      text,
  legal_form      text,
  address_line1   text,
  address_line2   text,
  postcode        text,
  city            text,
  country         text not null default 'France',
  siret           text,
  rcs_city        text,
  ape_code        text,
  vat_number      text,
  -- 'franchise' means art. 293 B du CGI: no VAT charged, and the invoice must
  -- say so in those words.
  vat_regime      text not null default 'franchise',
  vat_rate        numeric(5,2) not null default 0,
  iban            text,
  bic             text,
  payment_terms   text,
  late_penalty    text,
  recovery_fee_cents int not null default 4000,
  invoice_prefix  text not null default 'F',
  next_invoice_no int  not null default 1,
  insurance       text,
  footer_note     text,
  updated_at      timestamptz not null default now(),
  constraint coach_billing_vat_regime_known check (vat_regime in ('franchise', 'assujetti')),
  constraint coach_billing_vat_rate_sane    check (vat_rate >= 0 and vat_rate <= 100),
  constraint coach_billing_next_no_sane     check (next_invoice_no >= 1)
);

alter table public.coach_billing_profiles enable row level security;
revoke all on public.coach_billing_profiles from anon;

-- Hers alone. No client, and no other coach, has a policy here.
create policy coach_billing_profiles_own on public.coach_billing_profiles
  for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- ---------- the client's file ----------
-- The prototype's File tab is the notes app a coach keeps beside the product
-- today, brought inside it. None of it is derived and none of it is required.
alter table public.clients
  add column if not exists phone             text,
  add column if not exists whatsapp          text,
  add column if not exists preferred_channel text,
  add column if not exists timezone          text,
  add column if not exists languages         text,
  add column if not exists instagram         text,
  add column if not exists tiktok            text,
  add column if not exists strava            text,
  add column if not exists hevy              text,
  add column if not exists birth_date        date,
  add column if not exists occupation        text,
  add column if not exists training_age      text,
  add column if not exists diet              text,
  add column if not exists emergency_contact text,
  add column if not exists file_note         text;

comment on column public.clients.emergency_contact is
  'Someone else''s name and number. Shown only to this coach and this client.';

-- Data API grants, stated rather than inherited: from 30 Oct 2026 Supabase
-- stops granting new public tables to the API roles by default, and a fresh
-- project, a preview branch or `supabase db reset` would otherwise leave
-- this table unreachable. RLS still decides which rows. anon gets nothing:
-- every screen that reads it is behind sign-in.
grant select, insert, update, delete on public.coach_billing_profiles to authenticated, service_role;
