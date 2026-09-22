"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BillingType } from "@/lib/supabase/types";

/** Euros in, integer cents stored. Money never goes through a float. */
function toCents(value: FormDataEntryValue | null): number {
  const raw = String(value ?? "").replace(",", ".").trim();
  if (raw === "") return 0;
  const n = Number(raw);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function intOr(value: FormDataEntryValue | null, fallback: number): number {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

async function coachId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

/**
 * One writer for the whole arrangement. The form posts the values it already
 * knows plus a delta for whichever stepper was pressed, so a round trip never
 * has to read the row back before writing it.
 */
export async function saveArrangement(formData: FormData) {
  const { supabase, userId } = await coachId();
  if (!userId) return;

  const clientId = String(formData.get("client_id") ?? "");
  if (!clientId) return;

  const type = String(formData.get("type") ?? "monthly") as BillingType;
  const amountCents = Math.max(
    0,
    toCents(formData.get("amount")) + intOr(formData.get("amount_delta"), 0) * 100,
  );
  // Clamped to the database's own range rather than trusting the form.
  const day = Math.min(
    28,
    Math.max(1, intOr(formData.get("day"), 1) + intOr(formData.get("day_delta"), 0)),
  );
  const pack = Math.min(
    200,
    Math.max(1, intOr(formData.get("pack"), 10) + intOr(formData.get("pack_delta"), 0)),
  );

  await supabase.from("billing_arrangements").upsert(
    {
      client_id: clientId,
      coach_id: userId,
      amount_cents: amountCents,
      type: type === "pack" ? "pack" : "monthly",
      day_of_month: day,
      pack_sessions: pack,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id" },
  );

  revalidatePath("/facturation");
}

/**
 * The tick. Marking a month paid records that the coach says she was paid; it
 * moves no money and talks to no payment processor, because none is wired in.
 */
export async function setMonthStatus(formData: FormData) {
  const { supabase, userId } = await coachId();
  if (!userId) return;

  const clientId = String(formData.get("client_id") ?? "");
  const period = String(formData.get("period") ?? "");
  const paid = String(formData.get("paid") ?? "") === "1";
  if (!clientId || !period) return;

  await supabase.from("invoices").upsert(
    {
      coach_id: userId,
      client_id: clientId,
      period_start: period,
      amount_cents: toCents(formData.get("amount")),
      status: paid ? "paid" : "sent",
      paid_at: paid ? new Date().toISOString() : null,
    },
    { onConflict: "client_id,period_start" },
  );

  revalidatePath("/facturation");
}

/** Every open month in the current period, in one write. */
export async function markAllPaid(formData: FormData) {
  const { supabase, userId } = await coachId();
  if (!userId) return;

  const period = String(formData.get("period") ?? "");
  const ids = String(formData.get("client_ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const amounts = String(formData.get("amounts") ?? "")
    .split(",")
    .map((s) => Number(s.trim()) || 0);
  if (!period || ids.length === 0) return;

  const now = new Date().toISOString();
  await supabase.from("invoices").upsert(
    ids.map((clientId, i) => ({
      coach_id: userId,
      client_id: clientId,
      period_start: period,
      amount_cents: amounts[i] ?? 0,
      status: "paid" as const,
      paid_at: now,
    })),
    { onConflict: "client_id,period_start" },
  );

  revalidatePath("/facturation");
}

/**
 * Writing the invoice means the month is now on the record as issued. There is
 * no PDF in v1 — the printable view is the browser's, and nothing is emailed.
 */
export async function issueInvoice(formData: FormData) {
  const { supabase, userId } = await coachId();
  if (!userId) return;

  const clientId = String(formData.get("client_id") ?? "");
  const period = String(formData.get("period") ?? "");
  if (!clientId || !period) return;

  await supabase.from("invoices").upsert(
    {
      coach_id: userId,
      client_id: clientId,
      period_start: period,
      amount_cents: toCents(formData.get("amount")),
      status: "sent",
      issued_at: new Date().toISOString(),
    },
    { onConflict: "client_id,period_start" },
  );

  revalidatePath("/facturation");
}
