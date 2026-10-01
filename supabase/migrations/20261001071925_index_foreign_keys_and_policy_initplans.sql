-- Every foreign key the advisor found without a covering index (1 Oct 2026).
-- Deletes cascade through these and RLS joins on them: without an index each
-- one scans the table, which shows from a few dozen clients up.
create index if not exists admin_access_log_coach_id_idx on public.admin_access_log (coach_id);
create index if not exists allowed_coach_emails_added_by_idx on public.allowed_coach_emails (added_by);
create index if not exists check_in_photos_client_id_idx on public.check_in_photos (client_id);
create index if not exists client_supplements_day_type_id_idx on public.client_supplements (day_type_id);
create index if not exists client_supplements_supplement_id_idx on public.client_supplements (supplement_id);
create index if not exists client_week_days_day_type_id_idx on public.client_week_days (day_type_id);
create index if not exists exercise_hidden_exercise_id_idx on public.exercise_hidden (exercise_id);
create index if not exists invite_codes_claimed_by_idx on public.invite_codes (claimed_by);
create index if not exists meals_food_id_idx on public.meals (food_id);
create index if not exists nutrition_targets_day_type_id_idx on public.nutrition_targets (day_type_id);
create index if not exists pain_reports_session_exercise_id_idx on public.pain_reports (session_exercise_id);
create index if not exists plan_meal_items_food_id_idx on public.plan_meal_items (food_id);
create index if not exists plan_meals_day_type_id_idx on public.plan_meals (day_type_id);
create index if not exists platform_admins_granted_by_idx on public.platform_admins (granted_by);
create index if not exists supplement_hidden_supplement_id_idx on public.supplement_hidden (supplement_id);

-- auth.uid() wrapped in a select is evaluated once per query, not per row.
-- Same rules, same rows.
alter policy billing_arrangements_own on public.billing_arrangements
  using (private.owns_client(client_id))
  with check (private.owns_client(client_id) and coach_id = (select auth.uid()));

alter policy coach_billing_profiles_own on public.coach_billing_profiles
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));
