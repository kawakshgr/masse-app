import { addDays, weekdayOf } from "@/lib/clientData";

/**
 * When a session of a pushed week is owed — the coach's side of the rule the
 * client's screens follow.
 *
 * A session sits on a weekday (0 = Monday) and a week may be pushed to start
 * on any date, so its day is the first such weekday from the start date, not
 * "start date plus day index". It is owed once that day is over; and never
 * when the next week started before the day came, because the client was
 * shown that week instead.
 */
export function sessionDate(startDate: string, weekday: number): string {
  return addDays(startDate, (weekday - weekdayOf(startDate) + 7) % 7);
}

export function sessionOwed(
  startDate: string,
  weekday: number,
  today: string,
  nextStart: string | null,
): boolean {
  const date = sessionDate(startDate, weekday);
  if (nextStart && date >= nextStart) return false;
  // A day still in progress is reported, never judged.
  return date < today;
}

/** The start date of the week that follows this one, among the same client's. */
export function nextStartAfter(starts: string[], startDate: string): string | null {
  return starts.filter((other) => other > startDate).sort()[0] ?? null;
}
