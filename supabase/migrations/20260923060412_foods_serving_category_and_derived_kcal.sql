-- The coach's ingredient database, as the prototype has it: macros are typed,
-- calories are derived — never both. Two numbers that mean the same thing are
-- two numbers that can disagree, so the database does the arithmetic and the
-- column can no longer be written at all.
alter table public.foods drop column kcal_100g;

alter table public.foods
  add column kcal_100g numeric(8,2)
    generated always as (
      coalesce(protein_100g, 0) * 4
      + coalesce(carbs_100g, 0) * 4
      + coalesce(fat_100g, 0) * 9
    ) stored;

-- What a serving of this actually is. Free text because a scoop is not a
-- weight, plus the grams it means when it has some — that is what lets the
-- plan editor offer one tap instead of mental arithmetic.
alter table public.foods
  add column if not exists serving_label text,
  add column if not exists serving_g numeric(7,1),
  add column if not exists category text not null default 'other';

alter table public.foods
  add constraint foods_category_known
    check (category in ('protein', 'carb', 'fat', 'veg', 'other'));

alter table public.foods
  add constraint foods_serving_sane
    check (serving_g is null or (serving_g > 0 and serving_g <= 5000));

create index if not exists foods_category_idx on public.foods (coach_id, category);
