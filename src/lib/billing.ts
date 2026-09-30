import type { BillingType, InvoiceStatus } from "@/lib/supabase/types";

/** The first of the month a date falls in — the period key for every invoice. */
export function monthStart(date = new Date()): string {
  return `${date.toISOString().slice(0, 7)}-01`;
}

/** The six periods before and including `from`, oldest first. */
export function lastMonths(from: string, count: number): string[] {
  const [y, m] = from.split("-").map(Number);
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(`${d.toISOString().slice(0, 7)}-01`);
  }
  return out;
}

/** The period after this one, derived from the string rather than the clock. */
export function nextMonthOf(period: string): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(Date.UTC(y, m, 1));
  return `${d.toISOString().slice(0, 7)}-01`;
}

export function euros(cents: number, locale = "fr-FR"): string {
  return (cents / 100).toLocaleString(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
}

/**
 * A day of the month as it is said: French takes an ordinal on the first and
 * nothing after it ("le 1er", "le 17"); English on every day ("the 17th").
 */
export function dayLabel(day: number, locale = "fr-FR"): string {
  if (locale.startsWith("en")) {
    const tens = day % 100;
    const suffix = tens >= 11 && tens <= 13 ? "th" : (["th", "st", "nd", "rd"][day % 10] ?? "th");
    return `${day}${suffix}`;
  }
  return day === 1 ? "1er" : String(day);
}

export function monthLabel(period: string, locale = "fr-FR"): string {
  return new Date(`${period}T00:00:00Z`).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function shortMonth(period: string, locale = "fr-FR"): string {
  return new Date(`${period}T00:00:00Z`).toLocaleDateString(locale, {
    month: "short",
    timeZone: "UTC",
  });
}

export type MonthState = "paid" | "awaiting" | "late";

/**
 * The state the coach set, nothing more. An earlier version derived lateness
 * from the calendar, which meant she could pick "awaiting" and the row would
 * answer "late" — the control looked broken. Whether the day has gone by is
 * still worth saying, so `isOverdue` says it beside the state instead of
 * replacing it.
 */
export function monthState(status: InvoiceStatus | null): MonthState {
  if (status === "paid") return "paid";
  if (status === "late") return "late";
  return "awaiting";
}

/** The agreed day has gone by. A remark, never a state. */
export function isOverdue(period: string, dayOfMonth: number, today = new Date()): boolean {
  const due = new Date(
    `${period.slice(0, 8)}${String(dayOfMonth).padStart(2, "0")}T00:00:00Z`,
  );
  return today > due;
}

/** The status a month is stored with once the coach picks a state for it. */
export function statusFor(state: MonthState): InvoiceStatus {
  return state === "paid" ? "paid" : state === "late" ? "late" : "sent";
}

/** What the client owes next, said the way the coach would say it. */
export function nextLabel(
  type: BillingType,
  dayOfMonth: number,
  packSessions: number,
  nextMonth: string,
  locale = "fr-FR",
  /** "forfait de 10 séances", in the reader's language. */
  packLabel: (sessions: number) => string = (sessions) => `forfait de ${sessions} séances`,
): string {
  if (type === "pack") return packLabel(packSessions);
  const month = new Date(`${nextMonth}T00:00:00Z`).toLocaleDateString(locale, {
    month: "short",
    timeZone: "UTC",
  });
  // "1er oct." in French; "17 Oct" in English, which drops the ordinal there.
  return `${locale.startsWith("en") ? dayOfMonth : dayLabel(dayOfMonth, locale)} ${month}`;
}
