import { addDays, localDay, weekdayOf } from "@/lib/clientData";
import { loadRoster } from "@/lib/roster";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, PainLevel } from "@/lib/supabase/types";

/**
 * The coach's "À traiter": who needs her today, and why, in one list she
 * opens the app on. Every reason is read from rows — the roster's own
 * attention rule for check-ins, missed sessions and sleep, and three more
 * here: silence, next week not sent, an invoice gone late.
 */
export type QueueKind =
  | "pain"
  | "request"
  | "call"
  | "late"
  | "checkin"
  | "unpaid"
  | "silent"
  | "missed"
  | "nextWeek"
  | "noProgramme"
  | "sleep";

/** The order the list is read in: what costs her client most, first. */
export const QUEUE_ORDER: QueueKind[] = [
  // Pain first: a client may be hurt. Then booked calls, which have a clock.
  "pain",
  // A sign-up waiting for her yes or no.
  "request",
  "call",
  "late",
  "checkin",
  "unpaid",
  "silent",
  "missed",
  "nextWeek",
  "noProgramme",
  "sleep",
];

export type QueueItem = {
  kind: QueueKind;
  clientId: string;
  name: string;
  firstName: string;
  initials: string;
  /** WhatsApp first, then her phone: the number a nudge goes to. */
  phone: string | null;
  /** For "unpaid": what is owed, already formatted, and the month. */
  amount?: string;
  period?: string;
  /** For "nextWeek": the programme to write it in. */
  programmeId?: string;
  /** For "call": the booked call. */
  call?: { id: string; startsAt: string; minutes: number };
  /** For "request": the call booked with the sign-up, if any, and whether it is over. */
  request?: { callAt: string | null; callOver: boolean };
  /** For "pain": what she flagged, on which exercise. */
  pain?: { id: string; exercise: string; level: PainLevel; note: string | null; at: string };
};

/** Three days without a single entry — no sleep, steps or set — is silence. */
const SILENT_DAYS = 3;

export async function loadQueue(
  supabase: SupabaseClient<Database>,
  // The coach layout has already loaded it; no need to read it twice.
  roster?: Awaited<ReturnType<typeof loadRoster>>,
): Promise<QueueItem[]> {
  roster ??= await loadRoster(supabase);
  if (roster.entries.length === 0) return [];

  const ids = roster.entries.map((e) => e.id);
  const today = localDay("Europe/Paris");
  const nextMonday = addDays(today, 7 - weekdayOf(today));
  const since = addDays(today, -SILENT_DAYS);
  const sinceInstant = new Date(Date.now() - SILENT_DAYS * 86_400_000).toISOString();

  const [clientsRes, metricsRes, setsRes, assignmentsRes, invoicesRes, callsRes, painRes, requestCallsRes] = await Promise.all([
    supabase.from("clients").select("id, whatsapp, phone, created_at").in("id", ids),
    supabase.from("daily_metrics").select("client_id").in("client_id", ids).gte("day", since),
    supabase.from("set_logs").select("client_id").in("client_id", ids).gte("logged_at", sinceInstant),
    supabase
      .from("assignments")
      .select("client_id, start_date, programme_weeks(programme_id)")
      .in("client_id", ids)
      .not("pushed_at", "is", null),
    supabase
      .from("invoices")
      .select("client_id, amount_cents, currency, period_start")
      .in("client_id", ids)
      .eq("status", "late"),
    // Calls booked for the next seven days, and one running now.
    supabase
      .from("appointments")
      .select("id, client_id, starts_at, minutes")
      .in("client_id", ids)
      .is("cancelled_at", null)
      .gte("starts_at", new Date(Date.now() - 60 * 60_000).toISOString())
      .lt("starts_at", new Date(Date.now() + 7 * 86_400_000).toISOString())
      .order("starts_at"),
    // Pain not yet seen by the coach, however old: it stays until she has.
    supabase
      .from("pain_reports")
      .select("id, client_id, exercise_name, level, note, created_at")
      .in("client_id", ids)
      .is("seen_at", null)
      .order("created_at", { ascending: false }),
    // The call each pending sign-up booked, past ones included: once it is
    // over, the request says the decision is due.
    supabase
      .from("appointments")
      .select("client_id, starts_at, minutes")
      .in("client_id", roster.entries.filter((e) => e.pending).map((e) => e.id))
      .is("cancelled_at", null)
      .order("starts_at", { ascending: false }),
  ]);

  const contact = new Map(
    (clientsRes.data ?? []).map((c) => [c.id, { phone: c.whatsapp ?? c.phone, since: c.created_at }]),
  );
  const heard = new Set([
    ...(metricsRes.data ?? []).map((r) => r.client_id),
    ...(setsRes.data ?? []).map((r) => r.client_id),
  ]);

  // Her latest delivered week, and the programme it came from.
  const latest = new Map<string, { start: string; programmeId: string | null }>();
  for (const row of assignmentsRes.data ?? []) {
    const week = row.programme_weeks as unknown as { programme_id: string } | null;
    const known = latest.get(row.client_id);
    if (!known || row.start_date > known.start) {
      latest.set(row.client_id, { start: row.start_date, programmeId: week?.programme_id ?? null });
    }
  }

  const unpaid = new Map<string, { cents: number; currency: string; period: string }[]>();
  for (const row of invoicesRes.data ?? []) {
    if (!row.client_id) continue;
    const list = unpaid.get(row.client_id) ?? [];
    list.push({ cents: row.amount_cents, currency: row.currency, period: row.period_start });
    unpaid.set(row.client_id, list);
  }

  const items: QueueItem[] = [];

  for (const entry of roster.entries) {
    // Coaching ended: nothing is owed to an archived client.
    if (entry.archived) continue;

    const base = {
      clientId: entry.id,
      name: entry.name,
      firstName: entry.firstName ?? entry.name.split(/\s+/)[0] ?? entry.name,
      initials: entry.initials,
      phone: contact.get(entry.id)?.phone ?? null,
    };

    for (const report of (painRes.data ?? []).filter((row) => row.client_id === entry.id)) {
      items.push({
        ...base,
        kind: "pain",
        pain: {
          id: report.id,
          exercise: report.exercise_name,
          level: report.level,
          note: report.note,
          at: report.created_at,
        },
      });
    }

    for (const call of (callsRes.data ?? []).filter((row) => row.client_id === entry.id)) {
      items.push({
        ...base,
        kind: "call",
        call: { id: call.id, startsAt: call.starts_at, minutes: call.minutes },
      });
    }

    // A request: nothing is owed yet but her decision.
    if (entry.pending) {
      const call = (requestCallsRes.data ?? []).find((row) => row.client_id === entry.id) ?? null;
      items.push({
        ...base,
        kind: "request",
        request: {
          callAt: call?.starts_at ?? null,
          callOver: call ? new Date(call.starts_at).getTime() + call.minutes * 60_000 < Date.now() : false,
        },
      });
      continue;
    }

    const joined = contact.get(entry.id)?.since ?? "";
    const silent = joined !== "" && joined < sinceInstant && !heard.has(entry.id);

    // The roster's one reason, unless silence already says more.
    if (entry.attention && !(silent && entry.attention === "missed")) {
      items.push({ ...base, kind: entry.attention });
    }
    if (silent) items.push({ ...base, kind: "silent" });

    for (const invoice of unpaid.get(entry.id) ?? []) {
      items.push({
        ...base,
        kind: "unpaid",
        amount: (invoice.cents / 100).toLocaleString("fr-FR", {
          style: "currency",
          currency: invoice.currency || "EUR",
          maximumFractionDigits: 0,
        }),
        period: new Date(`${invoice.period}T12:00:00Z`).toLocaleDateString("fr-FR", {
          month: "long",
          year: "numeric",
        }),
      });
    }

    const week = latest.get(entry.id);
    if (!week) {
      items.push({ ...base, kind: "noProgramme" });
    } else if (week.start < nextMonday) {
      // Nothing starts next Monday or later: her next week is not written.
      items.push({ ...base, kind: "nextWeek", programmeId: week.programmeId ?? undefined });
    }
  }

  return items.sort(
    (a, b) =>
      QUEUE_ORDER.indexOf(a.kind) - QUEUE_ORDER.indexOf(b.kind) ||
      // Calls in the order they happen; everything else by name.
      (a.call && b.call ? a.call.startsAt.localeCompare(b.call.startsAt) : a.name.localeCompare(b.name, "fr")),
  );
}
