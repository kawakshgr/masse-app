"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { InvoiceStatus } from "@/lib/supabase/types";

/** Euros in, integer cents stored. Money never goes through a float. */
function toCents(value: FormDataEntryValue | null): number {
  const raw = String(value ?? "").replace(",", ".").trim();
  if (raw === "") return 0;
  const n = Number(raw);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export async function createInvoice(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const clientId = String(formData.get("client_id") ?? "");
  const periodStart = String(formData.get("period_start") ?? "");
  if (!clientId || !periodStart) return;

  await supabase.from("invoices").insert({
    coach_id: user.id,
    client_id: clientId,
    period_start: periodStart,
    period_end: String(formData.get("period_end") ?? "") || null,
    amount_cents: toCents(formData.get("amount")),
    note: String(formData.get("note") ?? "").trim() || null,
  });

  revalidatePath("/facturation");
}

export async function updateInvoice(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("invoice_id") ?? "");
  if (!id) return;

  await supabase
    .from("invoices")
    .update({
      amount_cents: toCents(formData.get("amount")),
      note: String(formData.get("note") ?? "").trim() || null,
    })
    .eq("id", id);

  revalidatePath("/facturation");
}

/**
 * The tick. Marking paid records when the coach says she was paid; it moves no
 * money and talks to no payment processor, because none is wired in.
 */
export async function setInvoiceStatus(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("invoice_id") ?? "");
  const status = String(formData.get("status") ?? "") as InvoiceStatus;
  if (!id || !["draft", "sent", "paid", "void"].includes(status)) return;

  await supabase
    .from("invoices")
    .update({
      status,
      issued_at:
        status === "sent" || status === "paid" ? new Date().toISOString() : null,
      paid_at: status === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  revalidatePath("/facturation");
}

export async function deleteInvoice(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("invoice_id") ?? "");
  if (!id) return;

  await supabase.from("invoices").delete().eq("id", id);
  revalidatePath("/facturation");
}
