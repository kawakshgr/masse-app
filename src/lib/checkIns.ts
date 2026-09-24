import type { CheckInRow } from "@/lib/supabase/types";

type Content = Pick<
  CheckInRow,
  "feel" | "pain" | "adherence" | "bodyweight_kg" | "note" | "waist_cm" | "chest_cm" | "hips_cm" | "thigh_cm"
>;

/**
 * Whether a check-in row holds anything yet.
 *
 * Opening the form in the client app makes an empty row — a photo has to hang
 * off one before a single question is answered. Until she has written or
 * photographed something, that row is not a check-in, and must not be counted
 * as one for the coach to review.
 */
export function isFiled(row: Content, photoCount: number): boolean {
  return (
    photoCount > 0 ||
    row.feel !== null ||
    row.pain !== null ||
    row.adherence !== null ||
    row.bodyweight_kg !== null ||
    row.note !== null ||
    row.waist_cm !== null ||
    row.chest_cm !== null ||
    row.hips_cm !== null ||
    row.thigh_cm !== null
  );
}

function addDays(day: string, delta: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

/** Days after the week's Monday the check-in is due: 6 is its Sunday. */
export const DEFAULT_DUE_OFFSET = 6;
/** Days she keeps after the due day to catch up. */
export const GRACE_DAYS = 2;
/** Days before the due day the form opens. */
export const OPENS_BEFORE = 3;

/**
 * The seven days a coach can choose, Monday to Sunday, as offsets from the
 * reviewed week's Monday. A check-in reviews one Monday–Sunday week: due
 * Friday to Sunday it is that week's (4–6); due Monday to Thursday, the week
 * just ended (7–10).
 */
export const DUE_OFFSETS = [7, 8, 9, 10, 4, 5, 6] as const;

/**
 * Which week's check-in is asked for today, and where it stands.
 *
 * Each week's check-in has a window: it opens three days before its due day
 * and closes two days after. The week shown is last week's while its window
 * is still open — filed or not, so "sent" stays on screen until it closes —
 * and this week's otherwise. Before this week's opens it is `upcoming`; past
 * its due day it is `late`. The iPhone (CheckInFeed.open) and the coach's
 * side use this same rule, so all three agree.
 *
 * `weekday` is 0 for Monday, as everywhere else.
 */
export function checkInWindow(monday: string, weekday: number, dueOffset: number = DEFAULT_DUE_OFFSET) {
  const inLastWeek = weekday + 7 <= dueOffset + GRACE_DAYS;
  const weekStart = inLastWeek ? addDays(monday, -7) : monday;
  // Days since the Monday of the week being asked for.
  const since = inLastWeek ? weekday + 7 : weekday;
  return {
    weekStart,
    due: addDays(weekStart, dueOffset),
    lastChance: addDays(weekStart, dueOffset + GRACE_DAYS),
    upcoming: since < dueOffset - OPENS_BEFORE,
    late: since > dueOffset,
  };
}
