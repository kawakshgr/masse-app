-- An exercise catalogue the editor can autocomplete against.
--
-- A null coach_id is a built-in entry, readable by every coach; a non-null one
-- is that coach's own addition. Hevy's API could import on top of this, but it
-- needs a Hevy Pro key tied to one account, so it cannot be the foundation.

create table public.exercises (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid references public.coaches(id) on delete cascade,
  name         text not null,
  muscle_group text,
  equipment    text,
  created_at   timestamptz not null default now(),
  constraint exercises_name_present check (length(btrim(name)) > 0)
);

-- Built-ins are unique by name; a coach may not duplicate her own either.
create unique index exercises_builtin_unique
  on public.exercises (lower(btrim(name))) where coach_id is null;
create unique index exercises_per_coach_unique
  on public.exercises (coach_id, lower(btrim(name))) where coach_id is not null;
create index exercises_lookup_idx on public.exercises (name);

alter table public.exercises enable row level security;
revoke all on public.exercises from anon;

-- Everyone signed in reads the built-ins; a coach also reads her own.
create policy exercises_select on public.exercises for select to authenticated
  using (coach_id is null or coach_id = (select auth.uid()));

-- Nobody edits the built-ins through the API.
create policy exercises_write_own on public.exercises for all to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));

insert into public.exercises (name, muscle_group, equipment) values
  ('Squat barre',                'Jambes',    'Barre'),
  ('Squat avant',                'Jambes',    'Barre'),
  ('Squat gobelet',              'Jambes',    'Haltère'),
  ('Presse à cuisses',           'Jambes',    'Machine'),
  ('Fente avant',                'Jambes',    'Haltères'),
  ('Fente bulgare',              'Jambes',    'Haltères'),
  ('Soulevé de terre',           'Chaîne postérieure', 'Barre'),
  ('Soulevé de terre roumain',   'Ischios',   'Barre'),
  ('Soulevé de terre sumo',      'Chaîne postérieure', 'Barre'),
  ('Hip thrust',                 'Fessiers',  'Barre'),
  ('Leg curl allongé',           'Ischios',   'Machine'),
  ('Leg extension',              'Quadriceps','Machine'),
  ('Mollets debout',             'Mollets',   'Machine'),
  ('Développé couché',           'Pectoraux', 'Barre'),
  ('Développé incliné',          'Pectoraux', 'Barre'),
  ('Développé couché haltères',  'Pectoraux', 'Haltères'),
  ('Écarté poulie',              'Pectoraux', 'Poulie'),
  ('Dips',                       'Pectoraux', 'Poids du corps'),
  ('Pompes',                     'Pectoraux', 'Poids du corps'),
  ('Développé militaire',        'Épaules',   'Barre'),
  ('Développé haltères assis',   'Épaules',   'Haltères'),
  ('Élévations latérales',       'Épaules',   'Haltères'),
  ('Oiseau',                     'Épaules',   'Haltères'),
  ('Tractions pronation',        'Dos',       'Poids du corps'),
  ('Tractions supination',       'Dos',       'Poids du corps'),
  ('Tirage vertical',            'Dos',       'Machine'),
  ('Tirage horizontal',          'Dos',       'Machine'),
  ('Rowing barre',               'Dos',       'Barre'),
  ('Rowing haltère',             'Dos',       'Haltère'),
  ('Rowing T-bar',               'Dos',       'Barre'),
  ('Face pull',                  'Dos',       'Poulie'),
  ('Shrug',                      'Trapèzes',  'Haltères'),
  ('Curl barre',                 'Biceps',    'Barre'),
  ('Curl haltères',              'Biceps',    'Haltères'),
  ('Curl marteau',               'Biceps',    'Haltères'),
  ('Extension poulie haute',     'Triceps',   'Poulie'),
  ('Barre au front',             'Triceps',   'Barre'),
  ('Extension nuque haltère',    'Triceps',   'Haltère'),
  ('Gainage planche',            'Tronc',     'Poids du corps'),
  ('Gainage latéral',            'Tronc',     'Poids du corps'),
  ('Relevé de jambes suspendu',  'Tronc',     'Poids du corps'),
  ('Crunch poulie',              'Tronc',     'Poulie'),
  ('Pallof press',               'Tronc',     'Poulie'),
  ('Épaulé-jeté',                'Haltérophilie', 'Barre'),
  ('Arraché',                    'Haltérophilie', 'Barre'),
  ('Épaulé debout',              'Haltérophilie', 'Barre'),
  ('Good morning',               'Chaîne postérieure', 'Barre'),
  ('Tirage menton',              'Épaules',   'Barre'),
  ('Marche du fermier',          'Corps entier', 'Haltères'),
  ('Kettlebell swing',           'Chaîne postérieure', 'Kettlebell'),
  ('Rameur',                     'Cardio',    'Machine'),
  ('Vélo assault',               'Cardio',    'Machine'),
  ('Corde à sauter',             'Cardio',    'Corde')
on conflict do nothing;

-- Data API grants, stated rather than inherited: from 30 Oct 2026 Supabase
-- stops granting new public tables to the API roles by default, and a fresh
-- project, a preview branch or `supabase db reset` would otherwise leave
-- this table unreachable. RLS still decides which rows. anon gets nothing:
-- every screen that reads it is behind sign-in.
grant select, insert, update, delete on public.exercises to authenticated, service_role;
