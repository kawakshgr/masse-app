import { getTranslations } from "next-intl/server";
import { monthLabel } from "@/lib/billing";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { CoachBillingProfileRow } from "@/lib/supabase/types";

export type InvoiceData = {
  profile: CoachBillingProfileRow;
  client: { id: string; name: string; email: string | null; phone: string | null };
  invoice: {
    invoice_number: string | null;
    issued_at: string | null;
    status: string;
    paid_at: string | null;
  } | null;
  /** Net, in integer cents. VAT is computed from the profile, never stored. */
  net: number;
  vatRate: number;
  vat: number;
  gross: number;
  description: string;
  monthName: string;
};

export type InvoiceProblem = "not-found" | "no-company";

/**
 * One loader for the paper, the PDF and the archive. They must agree down to
 * the cent, so they read the same rows through the same arithmetic rather than
 * each doing it again.
 */
export async function loadInvoice(
  supabase: SupabaseClient<Database>,
  clientId: string,
  period: string,
): Promise<InvoiceData | InvoiceProblem> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileRes, clientRes, invoiceRes, arrangementRes] = await Promise.all([
    supabase
      .from("coach_billing_profiles")
      .select("*")
      .eq("coach_id", user?.id ?? "")
      .maybeSingle(),
    supabase
      .from("clients")
      .select("id, name, email, phone")
      .eq("id", clientId)
      .maybeSingle(),
    supabase
      .from("invoices")
      .select("invoice_number, amount_cents, issued_at, status, paid_at")
      .eq("client_id", clientId)
      .eq("period_start", period)
      .maybeSingle(),
    supabase
      .from("billing_arrangements")
      .select("amount_cents, type, pack_sessions")
      .eq("client_id", clientId)
      .maybeSingle(),
  ]);

  const client = clientRes.data;
  if (!client) return "not-found";

  const profile = profileRes.data;
  // Without a legal name and a SIRET the paper would be missing mentions it is
  // required to carry, so there is nothing to render.
  if (!profile?.legal_name || !profile?.siret) return "no-company";

  const t = await getTranslations("invoice");
  const invoice = invoiceRes.data;
  const arrangement = arrangementRes.data;
  const monthName = monthLabel(period);

  const net = invoice?.amount_cents ?? arrangement?.amount_cents ?? 0;
  const vatRate = profile.vat_regime === "assujetti" ? Number(profile.vat_rate) : 0;
  const vat = Math.round((net * vatRate) / 100);

  return {
    profile,
    client,
    invoice,
    net,
    vatRate,
    vat,
    gross: net + vat,
    description:
      arrangement?.type === "pack"
        ? t("linePack", { count: arrangement.pack_sessions ?? 0, month: monthName })
        : t("lineMonthly", { month: monthName }),
    monthName,
  };
}

/** `Facture-F2026-0007.pdf`, or the period when no number has been spent yet. */
export function invoiceFileName(data: InvoiceData, period: string): string {
  const stem = data.invoice?.invoice_number ?? period;
  return `Facture-${stem}.pdf`.replace(/[^\w.\-]+/g, "-");
}

/**
 * The paper's strings. Placeholders are resolved with themselves so the PDF,
 * which has no ICU formatter of its own, gets the template back intact.
 */
export async function invoiceLabels() {
  const t = await getTranslations("invoice");
  return {
    invoice: t("title"),
    issuedOn: t("issuedOn", { date: "{date}" }),
    notIssued: t("notIssued"),
    period: t("period", { month: "{month}" }),
    billTo: t("billTo"),
    description: t("description"),
    net: t("net"),
    subtotal: t("subtotal"),
    vat: t("vat"),
    vatAt: t("vatAt", { rate: "{rate}" }),
    total: t("total"),
    payment: t("payment"),
    legal: t("legal"),
    defaultPenalty: t("defaultPenalty"),
    recovery: t("recovery", { amount: "{amount}" }),
    settledOn: t("settledOn", { date: "{date}" }),
    vatNumber: (await getTranslations("company"))("vatNumber"),
    franchise: "TVA non applicable, art. 293 B du CGI",
  };
}
