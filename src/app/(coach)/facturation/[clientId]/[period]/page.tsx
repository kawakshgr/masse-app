import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { InvoiceSheet } from "@/components/InvoiceSheet";
import { InvoiceActions } from "@/components/InvoiceActions";
import { loadInvoice } from "@/lib/invoice";
import { mailerConfigured } from "@/lib/invoiceMail";

/**
 * The invoice as a page: what the browser prints, and what the PDF route
 * renders from the same rows. Every mandatory mention comes from the coach's
 * own profile — Masse validates none of it, which the banner says on screen
 * and never on the paper.
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
  const supabase = await createClient();
  const data = await loadInvoice(supabase, clientId, period);

  if (data === "not-found") notFound();

  if (data === "no-company") {
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

  const { data: row } = await supabase
    .from("invoices")
    .select("archived_at, sent_at")
    .eq("client_id", clientId)
    .eq("period_start", period)
    .maybeSingle();

  return (
    <div data-print-sheet className="min-w-0 flex-1 overflow-y-auto p-5">
      {/* On screen only. An invoice does not carry a disclaimer about itself. */}
      <div className="no-print mx-auto mb-4 max-w-[760px] rounded-r3 border border-[var(--edge)] bg-[var(--glass2)] p-3">
        <InvoiceActions
          clientId={clientId}
          period={period}
          hasEmail={data.client.email != null}
          mailerReady={mailerConfigured()}
          archivedAt={row?.archived_at ?? null}
          sentAt={row?.sent_at ?? null}
        />
        <p className="mt-3 text-[12.5px] leading-[1.5] text-[var(--ink2)]">
          {tCompany("disclaimer")}
        </p>
      </div>

      <InvoiceSheet
        profile={data.profile}
        client={data.client}
        invoice={data.invoice}
        net={data.net}
        description={data.description}
        monthName={data.monthName}
      />
    </div>
  );
}
