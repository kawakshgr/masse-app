/**
 * A client's week as they rearranged it (`client_day_moves`).
 *
 * The coach plans by weekday twice: the session in the programme, the day
 * type — so the food — in the ordinary week. When two weekdays trade places,
 * both follow, because every reader goes through the same "planned day":
 * the session and the day type of a weekday are those of `plan[weekday]`.
 * This week only; nothing of the coach's is rewritten.
 */
export type DayMove = { day_index: number; planned_day: number };

const inWeek = (n: number) => Number.isInteger(n) && n >= 0 && n <= 6;

/** weekday → the planned day done on it. Itself where nothing moved. */
export function plannedDays(moves: DayMove[] | null | undefined): number[] {
  const plan = [0, 1, 2, 3, 4, 5, 6];
  for (const move of moves ?? []) {
    if (inWeek(move.day_index) && inWeek(move.planned_day)) plan[move.day_index] = move.planned_day;
  }
  return plan;
}

/** The weekday a planned day now falls on — the coach's reading. */
export function weekdayFor(plan: number[], plannedDay: number): number {
  const at = plan.indexOf(plannedDay);
  return at === -1 ? plannedDay : at;
}

export const isMoved = (plan: number[]) => plan.some((planned, day) => planned !== day);
