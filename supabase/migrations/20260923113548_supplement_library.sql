-- Supplements are not foods, so they do not go in the foods table.
--
-- A food is quantified in grams and contributes macros; a supplement is
-- quantified in doses and mostly contributes nothing. Pushing creatine through
-- a per-100g table would make the plan editor's arithmetic a lie, and it would
-- put 'supplement' beside 'protein' in a column that means macro-role, where it
-- is not a peer of anything.
--
-- A null coach_id is a built-in, readable by every coach; a non-null one is her
-- own addition. Same shape as the movement library, including the hiding.

create table public.supplements (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid references public.coaches(id) on delete cascade,
  name       text not null,
  category   text not null default 'other',
  -- A range, because that is how a dose is actually known: 3 to 5 g, not 4.
  dose_min   numeric(8,2),
  dose_max   numeric(8,2),
  unit       text not null default 'g',
  timing     text not null default 'anytime',
  note       text,
  -- Macros per unit of the dose — per gram for a powder, per capsule for a
  -- capsule. Null for anything that carries none, which is most of them.
  -- Whey is the reason this exists: 30 g of powder is 24 g of protein, and a
  -- plan whose day total ignores it contradicts the figure beside it.
  protein_per_unit numeric(6,3),
  carbs_per_unit   numeric(6,3),
  fat_per_unit     numeric(6,3),
  -- A built-in the library shows but refuses to prescribe. Marine collagen is
  -- the case this exists for: sold as a protein, useless as one, and a coach
  -- who goes looking for it should find it answered rather than absent.
  usable     boolean not null default true,
  created_at timestamptz not null default now(),

  constraint supplements_name_present check (length(btrim(name)) > 0),
  constraint supplements_category_known
    check (category in ('performance', 'protein', 'health', 'recovery', 'other')),
  constraint supplements_unit_known
    check (unit in ('g', 'mg', 'µg', 'ml', 'capsule', 'scoop', 'iu')),
  constraint supplements_timing_known
    check (timing in ('anytime', 'morning', 'pre', 'post', 'meal', 'evening')),
  constraint supplements_dose_sane check (dose_min is null or dose_min > 0),
  constraint supplements_dose_ordered
    check (dose_max is null or dose_min is null or dose_max >= dose_min),
  -- Only a built-in carries a verdict. What a coach adds herself is hers to
  -- judge, and Masse does not get to overrule her in her own library.
  constraint supplements_verdict_is_builtin check (usable or coach_id is null)
);

create unique index supplements_builtin_unique
  on public.supplements (lower(btrim(name))) where coach_id is null;
create unique index supplements_per_coach_unique
  on public.supplements (coach_id, lower(btrim(name))) where coach_id is not null;
create index supplements_lookup_idx on public.supplements (category, name);

-- A built-in belongs to everyone, so one coach must not delete it for the rest.
-- She hides it: per-coach, reversible, nobody else's library changes.
create table public.supplement_hidden (
  coach_id      uuid not null references public.coaches(id) on delete cascade,
  supplement_id uuid not null references public.supplements(id) on delete cascade,
  hidden_at     timestamptz not null default now(),
  primary key (coach_id, supplement_id)
);

-- What this client actually takes. Name and dose are snapshotted so a deleted
-- library entry cannot rewrite a live protocol.
create table public.client_supplements (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients(id) on delete cascade,
  supplement_id uuid references public.supplements(id) on delete set null,
  name          text not null,
  dose          numeric(8,2),
  unit          text not null default 'g',
  timing        text not null default 'anytime',
  note          text,
  -- Snapshotted for the dose she chose, so this counts in the day's macros the
  -- same way a plan item does. Calories are derived, never stored twice.
  protein_g     numeric(7,2),
  carbs_g       numeric(7,2),
  fat_g         numeric(7,2),
  kcal          numeric(8,2) generated always as (
                  coalesce(protein_g, 0) * 4
                  + coalesce(carbs_g, 0) * 4
                  + coalesce(fat_g, 0) * 9
                ) stored,
  -- Null means every day. A pre-workout does not belong on a rest day, and the
  -- day type is already what decides how a day is eaten.
  day_type_id   uuid references public.day_types(id) on delete cascade,
  position      int not null default 0,
  created_at    timestamptz not null default now(),

  constraint client_supplements_name_present check (length(btrim(name)) > 0),
  constraint client_supplements_unit_known
    check (unit in ('g', 'mg', 'µg', 'ml', 'capsule', 'scoop', 'iu')),
  constraint client_supplements_timing_known
    check (timing in ('anytime', 'morning', 'pre', 'post', 'meal', 'evening')),
  constraint client_supplements_dose_sane check (dose is null or dose > 0),
  constraint client_supplements_macros_sane check (
    coalesce(protein_g, 0) >= 0 and coalesce(carbs_g, 0) >= 0
    and coalesce(fat_g, 0) >= 0)
);

create index client_supplements_client_idx
  on public.client_supplements (client_id, day_type_id, position);

alter table public.supplements enable row level security;
alter table public.supplement_hidden enable row level security;
alter table public.client_supplements enable row level security;
revoke all on public.supplements, public.supplement_hidden,
  public.client_supplements from anon;

-- Everyone signed in reads the built-ins; a coach also reads her own.
create policy supplements_select on public.supplements for select to authenticated
  using (coach_id is null or coach_id = (select auth.uid()));

-- Nobody edits a built-in through the API, verdict included.
create policy supplements_write_own on public.supplements for all to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));

create policy supplement_hidden_own on public.supplement_hidden
  for all to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));

create policy client_supplements_by_coach on public.client_supplements
  for all to authenticated
  using (private.owns_client(client_id)) with check (private.owns_client(client_id));

-- The client reads her protocol. She does not write it: the dose is the coach's.
create policy client_supplements_read_own on public.client_supplements
  for select to authenticated
  using (client_id = (select auth.uid()));

-- The built-in list. Doses are the ranges the literature actually supports,
-- and the note says what a label will not: where the dose is per kilo, where a
-- capsule count is not the dose, and where a product is redundant.
insert into public.supplements
  (name, category, dose_min, dose_max, unit, timing, usable, note,
   protein_per_unit, carbs_per_unit, fat_per_unit) values
  ('Créatine monohydrate', 'performance', 3, 5, 'g', 'anytime', true,
   'Le seul supplément de force dont l''effet est net et répliqué. Pas besoin de phase de charge.',
   null, null, null),
  ('Caféine', 'performance', 200, 400, 'mg', 'pre', true,
   'Se dose au poids de corps : 3 à 6 mg par kg, 45 min avant. La tolérance s''installe vite.',
   null, null, null),
  ('Bêta-alanine', 'performance', 3.2, 6.4, 'g', 'anytime', true,
   'Pour les efforts de 1 à 4 min. Effet cumulatif sur 4 semaines, rien d''aigu. À fractionner contre les picotements.',
   null, null, null),
  ('Citrulline malate', 'performance', 6, 8, 'g', 'pre', true,
   'Volume et congestion. L''effet sur la force reste discuté.',
   null, null, null),
  ('Bicarbonate de sodium', 'performance', 16, 24, 'g', 'pre', true,
   'Se dose au poids de corps : 0,2 à 0,3 g par kg. Troubles digestifs fréquents — à tester hors compétition.',
   null, null, null),
  ('Nitrates (jus de betterave)', 'performance', 300, 600, 'mg', 'pre', true,
   'Compter les nitrates, pas le volume de jus. 2 à 3 h avant.',
   null, null, null),

  ('Whey', 'protein', 20, 40, 'g', 'post', true,
   'Pratique, pas magique : c''est le total protéique de la journée qui décide.',
   0.800, 0.060, 0.020),
  ('Caséine', 'protein', 30, 40, 'g', 'evening', true,
   'Digestion lente. Utile le soir, surtout si le dîner est léger.',
   0.780, 0.060, 0.010),
  ('Protéine végétale (pois et riz)', 'protein', 30, 40, 'g', 'post', true,
   'Pois seul manque de méthionine, riz seul de lysine. Le mélange règle les deux.',
   0.750, 0.070, 0.050),
  ('EAA', 'protein', 10, 15, 'g', 'pre', true,
   'Redondant dès que l''apport protéique est suffisant.',
   1.000, null, null),
  ('BCAA', 'protein', 5, 10, 'g', 'pre', true,
   'Sous-ensemble incomplet des EAA. Peu d''intérêt avec assez de protéines.',
   1.000, null, null),
  ('Collagène marin', 'protein', 10, null, 'g', 'anytime', false,
   'Profil en acides aminés essentiels trop pauvre pour compter comme protéine : pas de tryptophane, très peu de leucine.',
   0.900, null, null),

  ('Oméga 3 (EPA + DHA)', 'health', 1, 3, 'g', 'meal', true,
   'Compter l''EPA + DHA, pas le poids de l''huile : une capsule de 1000 mg n''en apporte souvent que 300.',
   null, null, 1.000),
  ('Vitamine D3', 'health', 1000, 2000, 'iu', 'meal', true,
   'À doser sur une prise de sang, pas à l''estime.',
   null, null, null),
  ('Magnésium bisglycinate', 'health', 200, 400, 'mg', 'evening', true,
   'Mieux toléré que l''oxyde, qui passe surtout dans les toilettes.',
   null, null, null),
  ('Zinc', 'health', 15, 30, 'mg', 'meal', true,
   'Par cures courtes. Au long cours, déséquilibre le cuivre.',
   null, null, null),
  ('Multivitamines', 'health', 1, null, 'capsule', 'meal', true,
   'Un filet de sécurité, pas un programme alimentaire.',
   null, null, null),
  ('Électrolytes', 'health', 1, 2, 'g', 'anytime', true,
   'Séances longues, forte sudation, déficit calorique. Le sodium est le premier concerné.',
   null, null, null),
  ('Fer', 'health', 15, 30, 'mg', 'meal', true,
   'Uniquement sur carence documentée. À l''aveugle, la surcharge est un vrai risque.',
   null, null, null),

  ('Ashwagandha (KSM-66)', 'recovery', 300, 600, 'mg', 'evening', true,
   'Stress perçu et sommeil. À éviter en cas de trouble thyroïdien.',
   null, null, null),
  ('Curcumine + pipérine', 'recovery', 500, 1000, 'mg', 'meal', true,
   'Douleurs articulaires. Très mal absorbée sans pipérine.',
   null, null, null),
  ('Mélatonine', 'recovery', 0.5, 3, 'mg', 'evening', true,
   'Endormissement et décalage horaire. Les doses basses suffisent.',
   null, null, null),
  ('Glutamine', 'recovery', 5, 10, 'g', 'anytime', true,
   'Aucun effet démontré sur la force ou la masse chez quelqu''un qui mange assez.',
   1.000, null, null)
on conflict do nothing;

-- Data API grants, stated rather than inherited: from 30 Oct 2026 Supabase
-- stops granting new public tables to the API roles by default, and a fresh
-- project, a preview branch or `supabase db reset` would otherwise leave
-- these tables unreachable. RLS still decides which rows. anon gets nothing:
-- every screen that reads them is behind sign-in.
grant select, insert, update, delete on public.supplements, public.supplement_hidden, public.client_supplements to authenticated, service_role;
