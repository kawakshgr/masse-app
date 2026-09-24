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

/** Today's session, exercises in the coach's order. */
export async function todaySession() {
  const [{ weekday }, week] = await Promise.all([clientSession(), currentWeek()]);
  const session = week?.sessions?.find((s) => s.day_index === weekday) ?? null;
  return {
    week,
    session: session && {
      ...session,
      session_exercises: [...session.session_exercises].sort(
        (a, b) => a.position - b.position,
      ),
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
