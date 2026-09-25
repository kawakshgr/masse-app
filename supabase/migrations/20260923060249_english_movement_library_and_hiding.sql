-- Movements go to English. It is the vocabulary strength coaches already use
-- between themselves, and the one Hevy speaks — which matters the day we import
-- from it. Session rows snapshot their own name, so no existing programme moves.
delete from public.exercises where coach_id is null;

-- A built-in belongs to everyone, so one coach must not be able to delete it.
-- She hides it instead: per-coach, reversible, and nobody else's list changes.
create table public.exercise_hidden (
  coach_id    uuid not null references public.coaches(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  hidden_at   timestamptz not null default now(),
  primary key (coach_id, exercise_id)
);

alter table public.exercise_hidden enable row level security;
revoke all on public.exercise_hidden from anon;

create policy exercise_hidden_own on public.exercise_hidden
  for all to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));

insert into public.exercises (name, muscle_group, equipment) values
  ('Barbell Row', 'Back', 'Barbell'),
  ('Chest-Supported Row', 'Back', 'Machine'),
  ('Chin-Up', 'Back', 'Bodyweight'),
  ('Dumbbell Row', 'Back', 'Dumbbell'),
  ('Inverted Row', 'Back', 'Bodyweight'),
  ('Lat Pulldown', 'Back', 'Machine'),
  ('Neutral-Grip Pulldown', 'Back', 'Machine'),
  ('Pendlay Row', 'Back', 'Barbell'),
  ('Pull-Up', 'Back', 'Bodyweight'),
  ('Seated Cable Row', 'Back', 'Cable'),
  ('Straight-Arm Pulldown', 'Back', 'Cable'),
  ('T-Bar Row', 'Back', 'Barbell'),
  ('Barbell Curl', 'Biceps', 'Barbell'),
  ('Cable Curl', 'Biceps', 'Cable'),
  ('Dumbbell Curl', 'Biceps', 'Dumbbell'),
  ('EZ-Bar Curl', 'Biceps', 'Barbell'),
  ('Hammer Curl', 'Biceps', 'Dumbbell'),
  ('Incline Dumbbell Curl', 'Biceps', 'Dumbbell'),
  ('Preacher Curl', 'Biceps', 'Machine'),
  ('Seated Calf Raise', 'Calves', 'Machine'),
  ('Standing Calf Raise', 'Calves', 'Machine'),
  ('Bench Press', 'Chest', 'Barbell'),
  ('Cable Fly', 'Chest', 'Cable'),
  ('Decline Bench Press', 'Chest', 'Barbell'),
  ('Dip', 'Chest', 'Bodyweight'),
  ('Dumbbell Bench Press', 'Chest', 'Dumbbell'),
  ('Incline Bench Press', 'Chest', 'Barbell'),
  ('Incline Dumbbell Press', 'Chest', 'Dumbbell'),
  ('Machine Chest Press', 'Chest', 'Machine'),
  ('Pec Deck', 'Chest', 'Machine'),
  ('Push-Up', 'Chest', 'Bodyweight'),
  ('Assault Bike', 'Conditioning', 'Machine'),
  ('Incline Treadmill Walk', 'Conditioning', 'Machine'),
  ('Jump Rope', 'Conditioning', 'Rope'),
  ('Rowing Machine', 'Conditioning', 'Machine'),
  ('Ski Erg', 'Conditioning', 'Machine'),
  ('Ab Wheel Rollout', 'Core', 'Bodyweight'),
  ('Bird Dog', 'Core', 'Bodyweight'),
  ('Cable Crunch', 'Core', 'Cable'),
  ('Dead Bug', 'Core', 'Bodyweight'),
  ('Hanging Leg Raise', 'Core', 'Bodyweight'),
  ('Pallof Press', 'Core', 'Cable'),
  ('Plank', 'Core', 'Bodyweight'),
  ('Side Plank', 'Core', 'Bodyweight'),
  ('Wrist Curl', 'Forearms', 'Dumbbell'),
  ('Clean and Jerk', 'Full Body', 'Barbell'),
  ('Farmer Carry', 'Full Body', 'Dumbbell'),
  ('Hang Clean', 'Full Body', 'Barbell'),
  ('Power Clean', 'Full Body', 'Barbell'),
  ('Sled Push', 'Full Body', 'Sled'),
  ('Snatch', 'Full Body', 'Barbell'),
  ('Cable Pull Through', 'Glutes', 'Cable'),
  ('Glute Bridge', 'Glutes', 'Barbell'),
  ('Hip Thrust', 'Glutes', 'Barbell'),
  ('Good Morning', 'Hamstrings', 'Barbell'),
  ('Lying Leg Curl', 'Hamstrings', 'Machine'),
  ('Nordic Curl', 'Hamstrings', 'Bodyweight'),
  ('Romanian Deadlift', 'Hamstrings', 'Barbell'),
  ('Seated Leg Curl', 'Hamstrings', 'Machine'),
  ('Stiff-Leg Deadlift', 'Hamstrings', 'Barbell'),
  ('Back Extension', 'Posterior Chain', 'Bodyweight'),
  ('Conventional Deadlift', 'Posterior Chain', 'Barbell'),
  ('Deficit Deadlift', 'Posterior Chain', 'Barbell'),
  ('Kettlebell Swing', 'Posterior Chain', 'Kettlebell'),
  ('Rack Pull', 'Posterior Chain', 'Barbell'),
  ('Sumo Deadlift', 'Posterior Chain', 'Barbell'),
  ('Trap Bar Deadlift', 'Posterior Chain', 'Trap Bar'),
  ('Back Squat', 'Quads', 'Barbell'),
  ('Bulgarian Split Squat', 'Quads', 'Dumbbell'),
  ('Front Squat', 'Quads', 'Barbell'),
  ('Goblet Squat', 'Quads', 'Dumbbell'),
  ('Hack Squat', 'Quads', 'Machine'),
  ('Leg Extension', 'Quads', 'Machine'),
  ('Leg Press', 'Quads', 'Machine'),
  ('Reverse Lunge', 'Quads', 'Dumbbell'),
  ('Sissy Squat', 'Quads', 'Bodyweight'),
  ('Step Up', 'Quads', 'Dumbbell'),
  ('Walking Lunge', 'Quads', 'Dumbbell'),
  ('Face Pull', 'Rear Delts', 'Cable'),
  ('Arnold Press', 'Shoulders', 'Dumbbell'),
  ('Cable Lateral Raise', 'Shoulders', 'Cable'),
  ('Landmine Press', 'Shoulders', 'Barbell'),
  ('Lateral Raise', 'Shoulders', 'Dumbbell'),
  ('Overhead Press', 'Shoulders', 'Barbell'),
  ('Push Press', 'Shoulders', 'Barbell'),
  ('Rear Delt Fly', 'Shoulders', 'Dumbbell'),
  ('Seated Dumbbell Press', 'Shoulders', 'Dumbbell'),
  ('Upright Row', 'Shoulders', 'Barbell'),
  ('Shrug', 'Traps', 'Dumbbell'),
  ('Close-Grip Bench Press', 'Triceps', 'Barbell'),
  ('Dumbbell Overhead Extension', 'Triceps', 'Dumbbell'),
  ('Overhead Cable Extension', 'Triceps', 'Cable'),
  ('Skull Crusher', 'Triceps', 'Barbell'),
  ('Triceps Pushdown', 'Triceps', 'Cable')
on conflict do nothing;

-- Data API grants, stated rather than inherited: from 30 Oct 2026 Supabase
-- stops granting new public tables to the API roles by default, and a fresh
-- project, a preview branch or `supabase db reset` would otherwise leave
-- this table unreachable. RLS still decides which rows. anon gets nothing:
-- every screen that reads it is behind sign-in.
grant select, insert, update, delete on public.exercise_hidden to authenticated, service_role;
