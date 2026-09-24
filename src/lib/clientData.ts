import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * What every client screen needs first: who she is, and what day it is for her.
 *
 * The server runs in UTC and she does not. "Today" is read in her timezone —
 * the one on her file, Paris when it is empty — so the web and the iPhone,
 * which reads the phone's clock, agree about which day she is logging.
 */
export const clientSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?suite=/aujourdhui");

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, first_name, cycle_tracking, steps_target, timezone")
    .eq("id", user.id)
    .maybeSingle();

  // A coach who lands on a client screen belongs on the roster instead.
  if (!client) redirect("/clients");

  const zone = client.timezone || "Europe/Paris";
  const today = localDay(zone);

  return {
    supabase,
    user,
    client,
    zone,
    today,
    weekday: weekdayOf(today),
    monday: addDays(today, -weekdayOf(today)),
  };
});

/** YYYY-MM-DD for now, in a timezone. en-CA happens to format that way. */
export function localDay(zone: string, at = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(at);
  } catch {
    return at.toISOString().slice(0, 10);
  }
}

/**
 * Monday is 0, the way the database counts and the programme editor labels its
 * columns. The same definition as Weekday.today on iOS.
 */
export function weekdayOf(day: string): number {
  return (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7;
}

export function addDays(day: string, delta: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

export type WeekExercise = {
  id: string;
  position: number;
  name: string;
  scheme: string | null;
  cue: string | null;
  target_sets: number | null;
  target_reps: number | null;
  target_weight_kg: number | null;
};

export type PushedWeek = {
  week_number: number;
  programmes: { name: string } | null;
  sessions: {
    day_index: number;
    name: string | null;
    session_exercises: WeekExercise[];
  }[];
};

/**
 * The week her coach pushed that is current. RLS shows her only pushed
 * assignments, so an unpushed week simply is not in the result.
 */
export const currentWeek = cache(async (): Promise<PushedWeek | null> => {
  const { supabase, today } = await clientSession();
  const { data } = await supabase
    .from("assignments")
    .select(
      "start_date, programme_weeks(week_number, programmes(name), sessions(day_index, name, session_exercises(id, position, name, scheme, cue, target_sets, target_reps, target_weight_kg)))",
    )
    .gte("start_date", addDays(today, -7))
    .order("start_date", { ascending: false })
    .limit(1);

  const week = (data ?? [])[0]?.programme_weeks as unknown as PushedWeek | undefined;
  return week ?? null;
});

/**
 * Today's session, exercises in the coach's order and at today's phase: the
 * loads and sets she is shown are already adjusted, and `levers` says why.
 */
export async function todaySession() {
  const [{ weekday }, week, levers] = await Promise.all([
    clientSession(),
    currentWeek(),
    cycleLevers(),
  ]);
  const session = week?.sessions?.find((s) => s.day_index === weekday) ?? null;
  return {
    week,
    levers: changesTraining(levers) ? levers : null,
    session: session && {
      ...session,
      session_exercises: [...session.session_exercises]
        .sort((a, b) => a.position - b.position)
        .map((exercise) => adjustExercise(exercise, levers)),
    },
  };
}

/** "4 × 8 · 60 kg", assembled from the row with nothing invented. */
export function targetLine(exercise: WeekExercise): string | null {
  const parts: string[] = [];
  if (exercise.target_sets && exercise.target_reps) {
    parts.push(`${exercise.target_sets} × ${exercise.target_reps}`);
  } else if (exercise.scheme) {
    parts.push(exercise.scheme);
  }
  if (exercise.target_weight_kg) parts.push(`${exercise.target_weight_kg} kg`);
  return parts.length ? parts.join(" · ") : null;
}

export type CycleLevers = {
  phase: string;
  loadPct: number;
  rpeCap: number | null;
  setsDelta: number;
  kcalDelta: number;
  carbsDelta: number;
};

/**
 * Today's phase and what her coach set it to change — CycleLevers.swift. The
 * database derives both; this only applies them to the numbers on screen. Null
 * when she does not track her cycle, and then nothing is adjusted.
 */
export const cycleLevers = cache(async (): Promise<CycleLevers | null> => {
  const { supabase, client } = await clientSession();
  if (!client.cycle_tracking) return null;
  const { data } = await supabase.rpc("client_cycle_state", { p_client: client.id });
  const state = (data ?? [])[0];
  if (!state?.phase) return null;
  return {
    phase: state.phase,
    loadPct: state.load_pct ?? 0,
    rpeCap: state.rpe_cap == null ? null : Number(state.rpe_cap),
    setsDelta: state.sets_delta ?? 0,
    kcalDelta: state.kcal_delta ?? 0,
    carbsDelta: state.carbs_g_delta ?? 0,
  };
});

export const changesTraining = (l: CycleLevers | null) =>
  !!l && (l.loadPct !== 0 || l.rpeCap !== null || l.setsDelta !== 0);

export const changesNutrition = (l: CycleLevers | null) =>
  !!l && (l.kcalDelta !== 0 || l.carbsDelta !== 0);

/**
 * The exercise as she should do it today. The programme row is never
 * rewritten: the coach's 80 kg stays 80 kg, and she is shown 72 with the
 * reason beside it. Loads round to the half kilo; sets never drop below one.
 */
export function adjustExercise(exercise: WeekExercise, levers: CycleLevers | null): WeekExercise {
  if (!changesTraining(levers) || !levers) return exercise;
  return {
    ...exercise,
    target_sets:
      exercise.target_sets == null ? null : Math.max(1, exercise.target_sets + levers.setsDelta),
    target_weight_kg:
      exercise.target_weight_kg == null || levers.loadPct === 0
        ? exercise.target_weight_kg
        : Math.round(Number(exercise.target_weight_kg) * (1 + levers.loadPct / 100) * 2) / 2,
  };
}

/** A real minus sign, and a plus when it adds: "−10", "+5". */
export function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0";
}
