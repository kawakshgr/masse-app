import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClientRow, CyclePhase, Database } from "@/lib/supabase/types";
import { addDays, localDay } from "@/lib/clientData";
import { isMoved, plannedDays, weekdayFor } from "@/lib/dayMoves";
import { nextStartAfter, sessionOwed } from "@/lib/sessionDue";

export type DayStatus = "logged" | "in-progress" | "scheduled" | "rest";

export type ClientDetail = {
  client: ClientRow;
  blockLabel: string | null;
  weekNumber: number | null;
  phase: CyclePhase | null;
  intensityCoefficient: number | null;
  volumeCoefficient: number | null;
  /** Logged vs expected over the last four weeks. */
  adherence: { done: number; expected: number; pct: number | null };
  sessionsThisWeek: { done: number; total: number };
  sleep: {
    nights: { dayIndex: number; hours: number | null }[];
    avg: number | null;
    target: number | null;
    nightsUnderTarget: number;
  };
  steps: { latest: number | null; avg: number | null };
  week: { dayIndex: number; sessionName: string | null; status: DayStatus }[];
  /** The client moved days this week: `week` shows them where they were put. */
  weekMoved: boolean;
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfWeekUTC(d: Date): Date {
  const out = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  const monday = (out.getUTCDay() + 6) % 7;
  out.setUTCDate(out.getUTCDate() - monday);
  return out;
}

/** Hours as the prototype writes them: 6h12, never 6.2. */
export function formatHours(hours: number | null): string | null {
  if (hours == null) return null;
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  return `${whole}h${String(minutes).padStart(2, "0")}`;
}

type WeekShape = {
  id: string;
  week_number: number;
  programmes: { name: string } | null;
  sessions: {
    id: string;
    day_index: number;
    name: string | null;
    session_exercises: { id: string }[];
  }[];
};

export async function loadClientDetail(
  supabase: SupabaseClient<Database>,
  clientId: string,
): Promise<ClientDetail | null> {
  const today = new Date();
  const weekStart = startOfWeekUTC(today);
  const fourWeeksAgo = new Date(weekStart);
  fourWeeksAgo.setUTCDate(fourWeeksAgo.getUTCDate() - 21);

  // One round of reads, the client's row among them (1 Oct 2026: it used to
  // be read first, alone).
  const [{ data: client }, assignmentsRes, metricsRes, cycleRes, movesRes] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).maybeSingle(),
    supabase
      .from("assignments")
      .select(
        "start_date, pushed_at, programme_weeks(id, week_number, programmes(name), sessions(id, day_index, name, session_exercises(id)))",
      )
      .eq("client_id", clientId)
      .not("pushed_at", "is", null)
      .gte("start_date", isoDate(fourWeeksAgo))
      // Weeks pushed ahead are not "current" before their day.
      .lte("start_date", isoDate(today))
      .order("start_date", { ascending: false }),
    supabase
      .from("daily_metrics")
      .select("day, sleep_h, steps")
      .eq("client_id", clientId)
      .gte("day", isoDate(weekStart))
      .order("day"),
    // Phase and coefficients are computed server-side, once. The raw dates
    // never reach the coach.
    supabase.rpc("client_cycle_state", { p_client: clientId }),
    // Days the client moved this week (lib/dayMoves.ts).
    supabase
      .from("client_day_moves")
      .select("day_index, planned_day")
      .eq("client_id", clientId)
      .eq("week_start", isoDate(weekStart)),
  ]);

  if (!client) return null;
  const plan = plannedDays(movesRes.data);

  const assignments = assignmentsRes.data ?? [];

  // Expected exercises across the window, and this week's separately.
  const expectedAll: string[] = [];
  const thisWeekDays: { dayIndex: number; sessionName: string | null; exercises: string[] }[] = [];
  let blockLabel: string | null = null;
  let weekNumber: number | null = null;

  const todayMidnight = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );

  const todayIso = localDay("Europe/Paris");
  const starts = assignments.map((assignment) => assignment.start_date);
  // The week the client is in: the latest one started, as on their screens.
  const currentStart =
    starts.filter((start) => start >= addDays(todayIso, -7)).sort().at(-1) ?? null;

  for (const assignment of assignments) {
    const week = assignment.programme_weeks as unknown as WeekShape | null;
    if (!week) continue;

    const isCurrentWeek = assignment.start_date === currentStart;
    const nextStart = nextStartAfter(starts, assignment.start_date);

    if (isCurrentWeek && blockLabel === null) {
      blockLabel = week.programmes?.name ?? null;
      weekNumber = week.week_number;
    }

    for (const session of week.sessions ?? []) {
      const ids = (session.session_exercises ?? []).map((e) => e.id);
      // The running week is read as the client arranged it.
      const dayIndex = isCurrentWeek ? weekdayFor(plan, session.day_index) : session.day_index;
      if (sessionOwed(assignment.start_date, dayIndex, todayIso, nextStart)) expectedAll.push(...ids);
      if (isCurrentWeek) {
        thisWeekDays.push({
          dayIndex,
          sessionName: session.name,
          exercises: ids,
        });
      }
    }
  }

  const loggedIds = new Set<string>();
  if (expectedAll.length > 0 || thisWeekDays.length > 0) {
    const probe = [...new Set([...expectedAll, ...thisWeekDays.flatMap((d) => d.exercises)])];
    const { data: logs } = await supabase
      .from("set_logs")
      .select("session_exercise_id")
      .eq("client_id", clientId)
      .in("session_exercise_id", probe);
    for (const log of logs ?? []) loggedIds.add(log.session_exercise_id);
  }

  const done = expectedAll.filter((id) => loggedIds.has(id)).length;
  const adherence = {
    done,
    expected: expectedAll.length,
    pct: expectedAll.length === 0 ? null : Math.round((done / expectedAll.length) * 100),
  };

  const elapsedThisWeek = Math.floor((todayMidnight - weekStart.getTime()) / 86_400_000);

  const week: ClientDetail["week"] = Array.from({ length: 7 }, (_, dayIndex) => {
    const day = thisWeekDays.find((d) => d.dayIndex === dayIndex);
    if (!day) return { dayIndex, sessionName: null, status: "rest" as DayStatus };

    const anyLogged = day.exercises.some((id) => loggedIds.has(id));
    const status: DayStatus =
      anyLogged
        ? "logged"
        : dayIndex === elapsedThisWeek
          ? "in-progress"
          : dayIndex > elapsedThisWeek
            ? "scheduled"
            : "scheduled";

    return { dayIndex, sessionName: day.sessionName, status };
  });

  const sessionsTotal = thisWeekDays.length;
  const sessionsDone = week.filter((d) => d.status === "logged").length;

  // Sleep: one slot per weekday, from the same rows the summary line reads.
  const metrics = metricsRes.data ?? [];
  const nights = Array.from({ length: 7 }, (_, dayIndex) => {
    const day = new Date(weekStart);
    day.setUTCDate(day.getUTCDate() + dayIndex);
    const row = metrics.find((m) => m.day === isoDate(day));
    return {
      dayIndex,
      hours: row?.sleep_h == null ? null : Number(row.sleep_h),
    };
  });

  const slept = nights.filter((n) => n.hours != null).map((n) => n.hours!);
  const target = client.sleep_target_h == null ? null : Number(client.sleep_target_h);
  const sleep = {
    nights,
    avg: slept.length === 0 ? null : slept.reduce((a, b) => a + b, 0) / slept.length,
    target,
    nightsUnderTarget:
      target == null ? 0 : slept.filter((h) => h < target).length,
  };

  const stepRows = metrics.filter((m) => m.steps != null).map((m) => m.steps!);
  const steps = {
    latest: stepRows.length === 0 ? null : stepRows[stepRows.length - 1]!,
    avg:
      stepRows.length === 0
        ? null
        : Math.round(stepRows.reduce((a, b) => a + b, 0) / stepRows.length),
  };

  const cycle = (cycleRes.data ?? [])[0] ?? null;

  return {
    client: client as ClientRow,
    blockLabel,
    weekNumber,
    phase: cycle?.phase ?? null,
    intensityCoefficient: cycle == null ? null : Number(cycle.intensity_coefficient),
    volumeCoefficient: cycle == null ? null : Number(cycle.volume_coefficient),
    adherence,
    sessionsThisWeek: { done: sessionsDone, total: sessionsTotal },
    sleep,
    steps,
    week,
    weekMoved: isMoved(plan),
  };
}
