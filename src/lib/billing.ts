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

/** French takes an ordinal on the first of the month and nothing after it. */
export function dayLabel(day: number): string {
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
 * Lateness is not stored. It is a fact about the calendar: an unpaid month
 * whose agreed day has gone by. Storing it would go stale the moment the month
 * turns, and the coach would be the one keeping it true.
 */
export function monthState(
  status: InvoiceStatus | null,
  period: string,
  dayOfMonth: number,
  today = new Date(),
): MonthState {
  if (status === "paid") return "paid";
  const due = new Date(`${period.slice(0, 8)}${String(dayOfMonth).padStart(2, "0")}T00:00:00Z`);
  return today > due ? "late" : "awaiting";
}

/** What the client owes next, said the way the coach would say it. */
export function nextLabel(
  type: BillingType,
  dayOfMonth: number,
  packSessions: number,
  nextMonth: string,
  locale = "fr-FR",
): string {
  if (type === "pack") return `forfait de ${packSessions} séances`;
  const month = new Date(`${nextMonth}T00:00:00Z`).toLocaleDateString(locale, {
    month: "short",
    timeZone: "UTC",
  });
  return `${dayLabel(dayOfMonth)} ${month}`;
}
