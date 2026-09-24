import { isFiled } from "@/lib/checkIns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type AttentionKind = "checkin" | "missed" | "sleep";

export type RosterEntry = {
  id: string;
  name: string;
  firstName: string | null;
  initials: string;
  /** The reason she needs the coach, or null when nothing is wrong. */
  attention: AttentionKind | null;
  /** Her current block label — shown when nothing needs attention. */
  blockLabel: string | null;
  checkinsWaiting: number;
};

export type RosterSummary = {
  entries: RosterEntry[];
  /** Both counted from rows. Never hardcode either. */
  clientsNeedingYou: number;
  checkinsToReview: number;
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/** Monday-based day index: 0=Mon … 6=Sun, matching sessions.day_index. */
function dayIndex(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function loadRoster(
  supabase: SupabaseClient<Database>,
): Promise<RosterSummary> {
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, first_name, sleep_target_h, status")
    .eq("status", "active")
    .order("name");

  if (!clients || clients.length === 0) {
    return { entries: [], clientsNeedingYou: 0, checkinsToReview: 0 };
  }

  const ids = clients.map((c) => c.id);
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);

  const [checkins, metrics, assignments] = await Promise.all([
    // Waiting on the coach.
    supabase
      .from("check_ins")
      .select(
        "client_id, feel, pain, adherence, bodyweight_kg, note, waist_cm, chest_cm, hips_cm, thigh_cm, check_in_photos(id)",
      )
      .in("client_id", ids)
      .is("reviewed_at", null),
    // Sleep over the last seven nights.
    supabase
      .from("daily_metrics")
      .select("client_id, sleep_h")
      .in("client_id", ids)
      .gte("day", isoDate(weekAgo))
      .not("sleep_h", "is", null),
    // The week currently in play, with its sessions.
    supabase
      .from("assignments")
      .select(
        "client_id, start_date, pushed_at, programme_weeks(id, programmes(name), sessions(id, day_index, session_exercises(id)))",
      )
      .in("client_id", ids)
      .not("pushed_at", "is", null)
      .lte("start_date", isoDate(today))
      .gte("start_date", isoDate(weekAgo)),
  ]);

  const checkinCount = new Map<string, number>();
  for (const row of checkins.data ?? []) {
    // An opened-and-abandoned form is not a check-in to review.
    if (!isFiled(row, row.check_in_photos?.length ?? 0)) continue;
    checkinCount.set(row.client_id, (checkinCount.get(row.client_id) ?? 0) + 1);
  }

  const sleepTotals = new Map<string, { sum: number; nights: number }>();
  for (const row of metrics.data ?? []) {
    if (row.sleep_h == null) continue;
    const acc = sleepTotals.get(row.client_id) ?? { sum: 0, nights: 0 };
    acc.sum += Number(row.sleep_h);
    acc.nights += 1;
    sleepTotals.set(row.client_id, acc);
  }

  // Exercises whose sets should already exist, per client.
  const expectedExercises = new Map<string, string[]>();
  const blockLabel = new Map<string, string>();

  for (const row of assignments.data ?? []) {
    const week = row.programme_weeks as unknown as {
      id: string;
      programmes: { name: string } | null;
      sessions: {
        id: string;
        day_index: number;
        session_exercises: { id: string }[];
      }[];
    } | null;
    if (!week) continue;

    if (week.programmes?.name) blockLabel.set(row.client_id, week.programmes.name);

    const start = new Date(`${row.start_date}T00:00:00Z`);
    const elapsed = Math.floor(
      (Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) -
        start.getTime()) /
        86_400_000,
    );

    const due = expectedExercises.get(row.client_id) ?? [];
    for (const session of week.sessions ?? []) {
      // A day still in progress is reported, never judged.
      if (session.day_index >= elapsed) continue;
      for (const exercise of session.session_exercises ?? []) due.push(exercise.id);
    }
    expectedExercises.set(row.client_id, due);
  }

  const allExpected = [...expectedExercises.values()].flat();
  const logged = new Set<string>();

  if (allExpected.length > 0) {
    const { data: logs } = await supabase
      .from("set_logs")
      .select("session_exercise_id")
      .in("session_exercise_id", allExpected);
    for (const log of logs ?? []) logged.add(log.session_exercise_id);
  }

  const entries: RosterEntry[] = clients.map((client) => {
    const waiting = checkinCount.get(client.id) ?? 0;

    const sleep = sleepTotals.get(client.id);
    const target = client.sleep_target_h == null ? null : Number(client.sleep_target_h);
    const shortSleep =
      sleep != null &&
      sleep.nights >= 3 &&
      target != null &&
      sleep.sum / sleep.nights < target;

    const due = expectedExercises.get(client.id) ?? [];
    const missed = due.length > 0 && due.every((id) => !logged.has(id));

    // Order matters: the chip opens the tab that answers it.
    const attention: AttentionKind | null = waiting
      ? "checkin"
      : missed
        ? "missed"
        : shortSleep
          ? "sleep"
          : null;

    return {
      id: client.id,
      name: client.name,
      firstName: client.first_name,
      initials: initialsOf(client.name),
      attention,
      blockLabel: blockLabel.get(client.id) ?? null,
      checkinsWaiting: waiting,
    };
  });

  return {
    entries,
    clientsNeedingYou: entries.filter((e) => e.attention !== null).length,
    checkinsToReview: entries.reduce((sum, e) => sum + e.checkinsWaiting, 0),
  };
}

export { dayIndex };
