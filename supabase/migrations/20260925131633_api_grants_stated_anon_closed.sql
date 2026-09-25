-- Every other public table revokes anon in the migration that creates it;
-- these two were created without it and kept the default grant. RLS kept the
-- rows closed, but the grant should not be there.
revoke all on public.client_file_notes, public.check_in_reminders from anon;

-- The grants the table-creating migrations now state, applied here too so the
-- live database and a fresh one agree.
grant select, insert, update, delete on
  public.coaches, public.clients, public.invite_codes,
  public.programmes, public.programme_weeks, public.sessions, public.session_exercises, public.assignments,
  public.set_logs, public.check_ins, public.cycle_logs, public.daily_metrics,
  public.platform_admins, public.admin_access_log,
  public.foods, public.meals, public.invoices,
  public.allowed_coach_emails, public.exercises, public.check_in_photos, public.cycle_adjustments,
  public.nutrition_targets, public.plan_meals, public.plan_meal_items,
  public.billing_arrangements, public.coach_billing_profiles, public.exercise_hidden,
  public.day_types, public.client_week_days,
  public.supplements, public.supplement_hidden, public.client_supplements,
  public.client_file_notes, public.check_in_reminders
to authenticated, service_role;
