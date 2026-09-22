import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { monthLabel } from "@/lib/billing";
import { InvoiceSheet } from "@/components/InvoiceSheet";

/**
 * The invoice as a page, printed by the browser. No PDF library: print to PDF
 * is a system dialog the coach already knows, and it keeps her fonts.
 *
 * Every mandatory mention comes from her own profile. Masse validates none of
 * it — see the banner, which is on screen and never on the paper.
 */
export default async function InvoicePage({
  params,
}: {
  params: Promise<{ clientId: string; period: string }>;
}) {
  const { clientId, period } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(period)) notFound();

  const t = await getTranslations("invoice");
  const tCompany = await getTranslations("company");
  const tBilling = await getTranslations("billing");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileRes, clientRes, invoiceRes, arrangementRes] = await Promise.all(
    [
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
    ],
  );

  const client = clientRes.data;
  if (!client) notFound();

  const profile = profileRes.data;
  const invoice = invoiceRes.data;
  const arrangement = arrangementRes.data;
  const monthName = monthLabel(period);

  if (!profile?.legal_name || !profile?.siret) {
    return (
      <div className="min-w-0 flex-1 p-5">
        <p className="text-[13px] text-[var(--ink2)]">
          {tCompany("incomplete")}
        </p>
        <Link
          href="/admin"
          className="mt-3 inline-flex h-9 items-center rounded-r2 cta px-4 text-[13px] font-semibold text-[var(--on-accent)]"
        >
          {t("goToCompany")}
        </Link>
      </div>
    );
  }

  const net = invoice?.amount_cents ?? arrangement?.amount_cents ?? 0;
  const description =
    arrangement?.type === "pack"
      ? t("linePack", {
          count: arrangement.pack_sessions ?? 0,
          month: monthName,
        })
      : t("lineMonthly", { month: monthName });

  return (
    <div data-print-sheet className="min-w-0 flex-1 overflow-y-auto p-5">
      {/* On screen only. An invoice does not carry a disclaimer about itself. */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-r3 border border-[var(--edge)] bg-[var(--glass2)] p-3 print:hidden">
        <p className="min-w-0 flex-1 text-[12.5px] leading-[1.5] text-[var(--ink2)]">
          {tCompany("disclaimer")}
        </p>
        <Link
          href="/facturation"
          className="glass2 h-9 shrink-0 rounded-r2 px-3 text-[13px] leading-9 font-semibold text-[var(--ink2)]"
        >
          {t("back")}
        </Link>
      </div>

      <InvoiceSheet
        profile={profile}
        client={client}
        invoice={invoice}
        net={net}
        description={description}
        monthName={monthName}
      />

      <p className="mx-auto mt-4 max-w-[760px] text-[12px] text-[var(--ink3)] print:hidden">
        {tBilling("nothingAutomaticBody")}
      </p>
    </div>
  );
}
