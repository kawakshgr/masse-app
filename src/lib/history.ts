import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type Range = "12w" | "6m" | "1y";

export const RANGE_WEEKS: Record<Range, number> = { "12w": 12, "6m": 26, "1y": 52 };

export type WeekBar = {
  week: string;
  prescribed: number;
  logged: number;
};

export type StrengthPoint = { week: string; best1rm: number };

export type Record_ = {
  exercise: string;
  weight: number;
  reps: number;
  on: string;
  /** Improvement over the previous best for that exercise, in kg of 1RM. */
  gain: number | null;
};

export type HistoryView = {
  weeksWithCoach: number;
  since: string;
  sessionsLogged: number;
  sessionsPrescribed: number;
  adherencePct: number | null;
  weightFrom: number | null;
  weightTo: number | null;
  weeks: WeekBar[];
  strengthByExercise: Record<string, StrengthPoint[]>;
  records: Record_[];
};

function mondayOf(iso: string): string {
  const d = new Date(iso);
  const monday = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

/**
 * Epley: 1RM = w × (1 + reps / 30). An estimate, and named as one on screen —
 * a coach reading "estimated" treats it differently from a tested max.
 */
function oneRepMax(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export async function loadHistory(
  supabase: SupabaseClient<Database>,
  clientId: string,
  range: Range,
): Promise<HistoryView> {
  const today = new Date();
  const from = new Date(today);
  from.setUTCDate(from.getUTCDate() - RANGE_WEEKS[range] * 7);
  const fromIso = from.toISOString().slice(0, 10);

  const [clientRes, assignmentsRes, logsRes, checkInsRes] = await Promise.all([
    supabase.from("clients").select("created_at").eq("id", clientId).maybeSingle(),
    supabase
      .from("assignments")
      .select(
        "start_date, pushed_at, programme_weeks(sessions(day_index, session_exercises(id)))",
      )
      .eq("client_id", clientId)
      .not("pushed_at", "is", null)
      .gte("start_date", fromIso),
    supabase
      .from("set_logs")
      .select("reps, weight_kg, logged_at, session_exercise_id, session_exercises(name)")
      .eq("client_id", clientId)
      .gte("logged_at", `${fromIso}T00:00:00Z`)
      .order("logged_at"),
    supabase
      .from("check_ins")
      .select("week_start_date, bodyweight_kg")
      .eq("client_id", clientId)
      .gte("week_start_date", fromIso)
      .not("bodyweight_kg", "is", null)
      .order("week_start_date"),
  ]);

  const createdAt = clientRes.data?.created_at ?? today.toISOString();
  const weeksWithCoach = Math.max(
    1,
    Math.floor(
      (today.getTime() - new Date(createdAt).getTime()) / (7 * 86_400_000),
    ),
  );

  const logs = (logsRes.data ?? []) as unknown as {
    reps: number | null;
    weight_kg: number | null;
    logged_at: string;
    session_exercise_id: string;
    session_exercises: { name: string } | null;
  }[];

  const loggedExerciseIds = new Set(logs.map((l) => l.session_exercise_id));

  // A session counts as prescribed once its day has passed, and as logged once
  // any of its exercises carries a set. A day still running is neither.
  const byWeek = new Map<string, WeekBar>();
  const todayMidnight = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );

  for (const assignment of assignmentsRes.data ?? []) {
    const week = assignment.programme_weeks as unknown as {
      sessions: { day_index: number; session_exercises: { id: string }[] }[];
    } | null;
    if (!week) continue;

    const start = new Date(`${assignment.start_date}T00:00:00Z`);
    const elapsed = Math.floor((todayMidnight - start.getTime()) / 86_400_000);
    const key = assignment.start_date;
    const bar = byWeek.get(key) ?? { week: key, prescribed: 0, logged: 0 };

    for (const session of week.sessions ?? []) {
      if (session.day_index >= elapsed) continue;
      bar.prescribed += 1;
      if ((session.session_exercises ?? []).some((e) => loggedExerciseIds.has(e.id))) {
        bar.logged += 1;
      }
    }

    byWeek.set(key, bar);
  }

  const weeks = [...byWeek.values()].sort((a, b) => a.week.localeCompare(b.week));
  const sessionsPrescribed = weeks.reduce((s, w) => s + w.prescribed, 0);
  const sessionsLogged = weeks.reduce((s, w) => s + w.logged, 0);

  // Strength: the best estimated 1RM each week, per exercise.
  const strengthByExercise: Record<string, StrengthPoint[]> = {};
  const bestPerExerciseWeek = new Map<string, Map<string, number>>();

  for (const log of logs) {
    const name = log.session_exercises?.name;
    if (!name) continue;
    const estimate = oneRepMax(Number(log.weight_kg ?? 0), Number(log.reps ?? 0));
    if (estimate <= 0) continue;

    const week = mondayOf(log.logged_at);
    const weeksFor = bestPerExerciseWeek.get(name) ?? new Map<string, number>();
    weeksFor.set(week, Math.max(weeksFor.get(week) ?? 0, estimate));
    bestPerExerciseWeek.set(name, weeksFor);
  }

  for (const [name, weeksFor] of bestPerExerciseWeek) {
    strengthByExercise[name] = [...weeksFor.entries()]
      .map(([week, best1rm]) => ({ week, best1rm }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }

  // Records: each time an exercise beat its own previous best.
  const records: Record_[] = [];
  const runningBest = new Map<string, number>();

  for (const log of logs) {
    const name = log.session_exercises?.name;
    const weight = Number(log.weight_kg ?? 0);
    const reps = Number(log.reps ?? 0);
    if (!name || weight <= 0 || reps <= 0) continue;

    const estimate = oneRepMax(weight, reps);
    const previous = runningBest.get(name);

    if (previous === undefined || estimate > previous) {
      records.push({
        exercise: name,
        weight,
        reps,
        on: log.logged_at.slice(0, 10),
        gain: previous === undefined ? null : Math.round((estimate - previous) * 10) / 10,
      });
      runningBest.set(name, estimate);
    }
  }

  const bodyweights = (checkInsRes.data ?? []).map((c) => Number(c.bodyweight_kg));

  return {
    weeksWithCoach,
    since: createdAt.slice(0, 10),
    sessionsLogged,
    sessionsPrescribed,
    adherencePct:
      sessionsPrescribed === 0
        ? null
        : Math.round((sessionsLogged / sessionsPrescribed) * 100),
    weightFrom: bodyweights[0] ?? null,
    weightTo: bodyweights.at(-1) ?? null,
    weeks,
    strengthByExercise,
    records: records.reverse().slice(0, 12),
  };
}
