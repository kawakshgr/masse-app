-- Fruit gets its own family (Kevin, 1 Oct 2026): kiwi and berries were
-- filed as carbs for want of one.
alter table public.foods drop constraint foods_category_known;
alter table public.foods add constraint foods_category_known
  check (category = any (array['protein', 'carb', 'fat', 'veg', 'fruit', 'other']));
