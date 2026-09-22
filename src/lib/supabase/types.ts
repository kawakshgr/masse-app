/**
 * Database types for the Masse backend.
 *
 * Shaped like `supabase gen types typescript` output but written by hand and
 * trimmed: no Relationships arrays, no re-exported generic helpers. Regenerate
 * with `npm run db:types` if the schema moves.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/* ---------- enums ---------- */

export type Pronoun = "she" | "he";
export type InviteState = "sent" | "opened" | "joined" | "expired" | "revoked";
export type ClientGoal =
  | "Get stronger"
  | "Build muscle"
  | "Lean out"
  | "Move better";
export type ClientStatus = "active" | "paused";
export type CheckinFeel = "Strong" | "Steady" | "Heavy";
export type CheckinPain = "None" | "Minor" | "Need to talk";
export type CheckinAdherence = "All of it" | "Most" | "Struggled";
export type CheckinAuthor = "coach" | "client";
export type CyclePhase = "menstrual" | "follicular" | "ovulatory" | "luteal";
export type InvoiceStatus = "draft" | "sent" | "paid" | "void";
export type PhotoPose = "front" | "side" | "back";
export type CycleMode = "log" | "manual";
export type NutritionMode = "macros" | "plan";
export type AdminAction =
  | "read_client_record"
  | "read_client_cycle"
  | "read_client_checkins"
  | "suspend_coach"
  | "restore_coach";

/* ---------- rows ---------- */

export type CoachRow = {
  id: string;
  name: string;
  first_name: string | null;
  pronoun: Pronoun;
  created_at: string;
  suspended_at: string | null;
};

export type ClientRow = {
  id: string;
  coach_id: string;
  name: string;
  first_name: string | null;
  email: string | null;
  slug: string | null;
  height_cm: number | null;
  birth_year: number | null;
  start_weight_kg: number | null;
  start_weight_date: string | null;
  goal: ClientGoal | null;
  injuries: string[];
  equipment: string[];
  session_days: number[];
  sleep_target_h: number | null;
  cycle_tracking: boolean;
  cycle_mode: CycleMode;
  nutrition_mode: NutritionMode;
  /** Used only when cycle_mode is 'manual'. */
  cycle_phase_manual: CyclePhase | null;
  status: ClientStatus;
  created_at: string;
};

export type InviteCodeRow = {
  id: string;
  coach_id: string;
  code: string;
  state: InviteState;
  issued_at: string;
  expires_at: string;
  claimed_by: string | null;
  ask_cycle: boolean;
};

export type ProgrammeRow = {
  id: string;
  coach_id: string;
  name: string;
  is_template: boolean;
  created_at: string;
  updated_at: string;
};

export type ProgrammeWeekRow = {
  id: string;
  programme_id: string;
  week_number: number;
};

export type SessionRow = {
  id: string;
  week_id: string;
  day_index: number;
  name: string | null;
  notes: string | null;
};

export type SessionExerciseRow = {
  id: string;
  session_id: string;
  position: number;
  name: string;
  scheme: string | null;
  target_sets: number | null;
  target_reps: number | null;
  target_weight_kg: number | null;
  cue: string | null;
};

export type AssignmentRow = {
  id: string;
  client_id: string;
  week_id: string;
  start_date: string;
  /** Null means the week is invisible to the client. The delivery boundary. */
  pushed_at: string | null;
};

export type SetLogRow = {
  id: string;
  client_id: string;
  session_exercise_id: string;
  set_index: number;
  reps: number | null;
  weight_kg: number | null;
  rpe: number | null;
  logged_at: string;
  /** Null means the row exists only on the device — held, not lost. */
  synced_at: string | null;
};

export type CheckInRow = {
  id: string;
  client_id: string;
  week_start_date: string;
  feel: CheckinFeel | null;
  pain: CheckinPain | null;
  adherence: CheckinAdherence | null;
  bodyweight_kg: number | null;
  note: string | null;
  author: CheckinAuthor;
  waist_cm: number | null;
  chest_cm: number | null;
  hips_cm: number | null;
  thigh_cm: number | null;
  submitted_at: string;
  /** Null means the check-in is still waiting on the coach. */
  reviewed_at: string | null;
};

/** Dates only. Never symptoms — there is no column for them and never will be. */
export type CycleLogRow = {
  id: string;
  client_id: string;
  period_start_date: string;
  cycle_length_days: number;
  logged_at: string;
};

export type ExerciseRow = {
  id: string;
  /** Null means a built-in entry, readable by every coach. */
  coach_id: string | null;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  created_at: string;
};

export type FoodRow = {
  id: string;
  coach_id: string;
  name: string;
  brand: string | null;
  kcal_100g: number | null;
  protein_100g: number | null;
  carbs_100g: number | null;
  fat_100g: number | null;
  created_at: string;
};

/** Name and macros are snapshotted: a deleted food cannot rewrite history. */
export type MealRow = {
  id: string;
  client_id: string;
  day: string;
  slot: string | null;
  food_id: string | null;
  name: string;
  quantity_g: number | null;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  logged_at: string;
};

/** A ledger the coach ticks. Nothing here is ever charged automatically. */
export type InvoiceRow = {
  id: string;
  coach_id: string;
  client_id: string;
  period_start: string;
  period_end: string | null;
  amount_cents: number;
  currency: string;
  status: InvoiceStatus;
  issued_at: string | null;
  paid_at: string | null;
  note: string | null;
  created_at: string;
};

export type AllowedCoachEmailRow = {
  email: string;
  note: string | null;
  added_at: string;
  added_by: string | null;
};

export type CheckInPhotoRow = {
  id: string;
  check_in_id: string;
  client_id: string;
  storage_path: string;
  pose: PhotoPose;
  note: string | null;
  uploaded_at: string;
};

/** Per-phase levers a coach sets for one client. No dates live here. */
export type CycleAdjustmentRow = {
  client_id: string;
  phase: CyclePhase;
  load_pct: number;
  rpe_cap: number | null;
  sets_delta: number;
  kcal_delta: number;
  carbs_g_delta: number;
};

/** What the coach sets. Percentages and the kcal cross-check are derived. */
export type NutritionTargetRow = {
  client_id: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  updated_at: string;
};

export type PlanMealRow = {
  id: string;
  client_id: string;
  at_time: string;
  name: string;
  position: number;
};

/** Items snapshot their macros so editing a food cannot rewrite a sent plan. */
export type PlanMealItemRow = {
  id: string;
  meal_id: string;
  food_id: string | null;
  name: string;
  quantity_g: number | null;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  position: number;
};

export type PlatformAdminRow = {
  user_id: string;
  granted_at: string;
  granted_by: string | null;
  note: string | null;
};

/** Append-only. No policy grants update or delete, to anyone. */
export type AdminAccessLogRow = {
  id: string;
  admin_id: string;
  action: AdminAction;
  client_id: string | null;
  coach_id: string | null;
  reason: string;
  accessed_at: string;
};

export type DailyMetricRow = {
  id: string;
  client_id: string;
  day: string;
  sleep_h: number | null;
  sleep_quality: number | null;
  steps: number | null;
};

/* ---------- table shape ---------- */

type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      coaches: Table<CoachRow, "id" | "name">;
      clients: Table<ClientRow, "id" | "coach_id" | "name">;
      invite_codes: Table<InviteCodeRow, "coach_id" | "code">;
      programmes: Table<ProgrammeRow, "coach_id" | "name">;
      programme_weeks: Table<ProgrammeWeekRow, "programme_id" | "week_number">;
      sessions: Table<SessionRow, "week_id" | "day_index">;
      session_exercises: Table<
        SessionExerciseRow,
        "session_id" | "position" | "name"
      >;
      assignments: Table<AssignmentRow, "client_id" | "week_id" | "start_date">;
      set_logs: Table<
        SetLogRow,
        "client_id" | "session_exercise_id" | "set_index"
      >;
      check_ins: Table<CheckInRow, "client_id" | "week_start_date">;
      cycle_logs: Table<CycleLogRow, "client_id" | "period_start_date">;
      daily_metrics: Table<DailyMetricRow, "client_id" | "day">;
      exercises: Table<ExerciseRow, "name">;
      foods: Table<FoodRow, "coach_id" | "name">;
      meals: Table<MealRow, "client_id" | "day" | "name">;
      invoices: Table<InvoiceRow, "coach_id" | "client_id" | "period_start">;
      allowed_coach_emails: Table<AllowedCoachEmailRow, "email">;
      check_in_photos: Table<CheckInPhotoRow, "check_in_id" | "client_id" | "storage_path">;
      cycle_adjustments: Table<CycleAdjustmentRow, "client_id" | "phase">;
      nutrition_targets: Table<NutritionTargetRow, "client_id">;
      plan_meals: Table<PlanMealRow, "client_id" | "at_time" | "name">;
      plan_meal_items: Table<PlanMealItemRow, "meal_id" | "name">;
      platform_admins: Table<PlatformAdminRow, "user_id">;
      admin_access_log: Table<AdminAccessLogRow, "admin_id" | "action" | "reason">;
    };
    Views: { [_ in never]: never };
    Functions: {
      /** The coach's only door to cycle data: phase and coefficients, no dates. */
      client_cycle_state: {
        Args: { p_client: string; p_on?: string };
        Returns: {
          phase: CyclePhase;
          intensity_coefficient: number;
          volume_coefficient: number;
          load_pct: number;
          rpe_cap: number | null;
          sets_delta: number;
          kcal_delta: number;
          carbs_g_delta: number;
          /** False when the handoff defaults are in play. */
          configured: boolean;
        }[];
      };
      cycle_day: {
        Args: { p_period_start: string; p_cycle_length: number; p_on: string };
        Returns: number;
      };
      cycle_phase_on: {
        Args: { p_period_start: string; p_cycle_length: number; p_on: string };
        Returns: CyclePhase;
      };
      load_intensity_coefficient: {
        Args: { p_phase: CyclePhase };
        Returns: number;
      };
      load_volume_coefficient: {
        Args: { p_phase: CyclePhase };
        Returns: number;
      };
      /** Validates a code before the client has an account. */
      invite_preview: {
        Args: { p_code: string };
        Returns: {
          valid: boolean;
          coach_name: string | null;
          ask_cycle: boolean;
        }[];
      };
      /** Turns nine steps of answers into the client's record. */
      claim_invite: {
        Args: {
          p_code: string;
          p_name: string;
          p_first_name: string | null;
          p_goal: ClientGoal | null;
          p_height_cm: number | null;
          p_weight_kg: number | null;
          p_birth_year: number | null;
          p_injuries: string[];
          p_equipment: string[];
          p_session_days: number[];
          p_sleep_target: number | null;
          p_cycle_tracking: boolean;
        };
        Returns: string;
      };
      /** Whether the signed-in address is allowed to hold a coach account. */
      may_become_coach: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      admin_coach_overview: {
        Args: Record<string, never>;
        Returns: {
          coach_id: string;
          name: string;
          first_name: string | null;
          suspended_at: string | null;
          created_at: string;
          client_count: number;
          programme_count: number;
        }[];
      };
      admin_set_coach_suspended: {
        Args: { p_coach: string; p_suspended: boolean; p_reason: string };
        Returns: undefined;
      };
    };
    Enums: {
      pronoun: Pronoun;
      invite_state: InviteState;
      client_goal: ClientGoal;
      client_status: ClientStatus;
      checkin_feel: CheckinFeel;
      checkin_pain: CheckinPain;
      checkin_adherence: CheckinAdherence;
      checkin_author: CheckinAuthor;
      cycle_phase: CyclePhase;
      admin_action: AdminAction;
      photo_pose: PhotoPose;
      cycle_mode: CycleMode;
      nutrition_mode: NutritionMode;
      invoice_status: InvoiceStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
