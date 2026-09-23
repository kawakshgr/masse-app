"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { euros, statusFor, type MonthState } from "@/lib/billing";
import { invoiceFileName, invoiceLabels, loadInvoice } from "@/lib/invoice";
import { renderInvoicePdf } from "@/lib/invoicePdf";
import { sendInvoiceMail } from "@/lib/invoiceMail";
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
  const raw = String(formData.get("state") ?? "awaiting");
  const state: MonthState =
    raw === "paid" || raw === "late" ? raw : "awaiting";
  if (!clientId || !period) return;

  await supabase.from("invoices").upsert(
    {
      coach_id: userId,
      client_id: clientId,
      period_start: period,
      amount_cents: toCents(formData.get("amount")),
      status: statusFor(state),
      paid_at: state === "paid" ? new Date().toISOString() : null,
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
 * Writing the invoice spends one number from the coach's sequence. The database
 * does it under a row lock: a French number has to be continuous and unique,
 * and two browser tabs must not be able to agree on the same one.
 */
export async function issueInvoice(formData: FormData) {
  const { supabase, userId } = await coachId();
  if (!userId) return;

  const clientId = String(formData.get("client_id") ?? "");
  const period = String(formData.get("period") ?? "");
  if (!clientId || !period) return;

  const { error } = await supabase.rpc("assign_invoice_number", {
    p_client: clientId,
    p_period: period,
    p_amount: toCents(formData.get("amount")),
  });

  if (error) {
    // The one failure a coach can act on herself: she has no company yet.
    const reason = error.message.includes("no billing profile")
      ? "entreprise"
      : "echec";
    redirect(`/facturation?ligne=${clientId}&probleme=${reason}`);
  }

  revalidatePath("/facturation");
}

/* ---------- the PDF: archived, and sent if a mailer is configured ---------- */

/**
 * Renders the invoice and keeps it. The file is the record: re-rendering it
 * next year, after she has moved or changed her rate, would produce a
 * different document from the one the client received.
 */
async function renderAndArchive(clientId: string, period: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const data = await loadInvoice(supabase, clientId, period);
  if (data === "not-found" || data === "no-company") return { problem: data };

  const pdf = await renderInvoicePdf(data, await invoiceLabels());
  const fileName = invoiceFileName(data, period);
  const path = `${user.id}/${clientId}/${period}-${data.invoice?.invoice_number ?? "brouillon"}.pdf`;

  const { error } = await supabase.storage
    .from("invoices")
    .upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (error) return { problem: "archive" as const };

  await supabase
    .from("invoices")
    .update({ pdf_path: path, archived_at: new Date().toISOString() })
    .eq("client_id", clientId)
    .eq("period_start", period);

  return { data, pdf, fileName, path };
}

export async function archiveInvoice(formData: FormData) {
  const clientId = String(formData.get("client_id") ?? "");
  const period = String(formData.get("period") ?? "");
  if (!clientId || !period) return;

  const result = await renderAndArchive(clientId, period);
  if (!result || "problem" in result) {
    redirect(`/facturation?ligne=${clientId}&probleme=echec`);
  }

  revalidatePath("/facturation");
  redirect(`/facturation?ligne=${clientId}&fait=archive`);
}

/**
 * Sends the invoice to the client, from the coach's own configured address.
 * The send is hers: she presses it, Masse never sends on its own schedule.
 */
export async function emailInvoice(formData: FormData) {
  const clientId = String(formData.get("client_id") ?? "");
  const period = String(formData.get("period") ?? "");
  if (!clientId || !period) return;

  const result = await renderAndArchive(clientId, period);
  if (!result || "problem" in result) {
    redirect(`/facturation?ligne=${clientId}&probleme=echec`);
  }

  const to = result.data.client.email;
  if (!to) redirect(`/facturation?ligne=${clientId}&probleme=adresse`);

  const t = await getTranslations("invoice");
  const sent = await sendInvoiceMail({
    to,
    subject: t("mailSubject", {
      number: result.data.invoice?.invoice_number ?? "",
      month: result.data.monthName,
    }),
    body: t("mailBody", {
      name: result.data.client.name,
      month: result.data.monthName,
      amount: euros(result.data.gross),
      coach: result.data.profile.legal_name ?? "",
    }),
    fileName: result.fileName,
    pdf: result.pdf,
  });

  if (!sent.ok) {
    redirect(`/facturation?ligne=${clientId}&probleme=envoi`);
  }

  const supabase = await createClient();
  await supabase
    .from("invoices")
    .update({ sent_at: new Date().toISOString() })
    .eq("client_id", clientId)
    .eq("period_start", period);

  revalidatePath("/facturation");
  redirect(`/facturation?ligne=${clientId}&fait=envoye`);
}
