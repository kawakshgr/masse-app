import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { euros, monthLabel } from "@/lib/billing";

const micro = "text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]";

function Address({ lines }: { lines: (string | null)[] }) {
  return (
    <>
      {lines.filter(Boolean).map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
    </>
  );
}

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
  const vatRate =
    profile.vat_regime === "assujetti" ? Number(profile.vat_rate) : 0;
  // Integer cents throughout: the VAT line is computed, never stored.
  const vat = Math.round((net * vatRate) / 100);
  const gross = net + vat;

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

      <article className="mx-auto max-w-[760px] rounded-r3 border border-[var(--edge)] bg-[var(--glass)] p-8 print:rounded-none print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 text-[13px] leading-[1.5]">
            <p className="font-display text-[20px] font-extrabold tracking-[-.03em]">
              {profile.legal_name}
            </p>
            <Address
              lines={[
                profile.legal_form,
                profile.address_line1,
                profile.address_line2,
                [profile.postcode, profile.city].filter(Boolean).join(" ") ||
                  null,
                profile.country,
              ]}
            />
            <p className="mt-2 text-[12px] text-[var(--ink2)]">
              SIRET {profile.siret}
              {profile.ape_code ? ` · APE ${profile.ape_code}` : ""}
              {profile.rcs_city ? ` · RCS ${profile.rcs_city}` : ""}
            </p>
            {profile.vat_number && (
              <p className="text-[12px] text-[var(--ink2)]">
                {tCompany("vatNumber")} {profile.vat_number}
              </p>
            )}
          </div>

          <div className="min-w-0 text-right text-[13px] leading-[1.5]">
            <p className={micro}>{t("title")}</p>
            <p className="tnum mt-1 font-display text-[20px] font-extrabold tracking-[-.03em]">
              {invoice?.invoice_number ?? t("draftNumber")}
            </p>
            <p className="tnum mt-2 text-[12px] text-[var(--ink2)]">
              {invoice?.issued_at
                ? t("issuedOn", {
                    date: new Date(invoice.issued_at).toLocaleDateString(
                      "fr-FR",
                    ),
                  })
                : t("notIssued")}
            </p>
            <p className="tnum text-[12px] text-[var(--ink2)]">
              {t("period", { month: monthName })}
            </p>
          </div>
        </header>

        <section className="mt-8">
          <p className={micro}>{t("billTo")}</p>
          <p className="mt-1.5 text-[14px] font-semibold">{client.name}</p>
          {client.email && (
            <p className="text-[13px] text-[var(--ink2)]">{client.email}</p>
          )}
          {client.phone && (
            <p className="tnum text-[13px] text-[var(--ink2)]">
              {client.phone}
            </p>
          )}
        </section>

        <table className="mt-8 w-full text-left text-[13px]">
          <thead>
            <tr className={`border-b border-[var(--edge)] ${micro}`}>
              <th className="pb-2 font-normal">{t("description")}</th>
              <th className="pb-2 text-right font-normal">{t("net")}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[var(--hair)]">
              <td className="py-3">{description}</td>
              <td className="tnum py-3 text-right">{euros(net)}</td>
            </tr>
          </tbody>
          <tfoot className="text-[13px]">
            <tr>
              <td className="pt-3 text-right text-[var(--ink2)]">
                {t("subtotal")}
              </td>
              <td className="tnum pt-3 text-right">{euros(net)}</td>
            </tr>
            <tr>
              <td className="pt-1 text-right text-[var(--ink2)]">
                {vatRate > 0 ? t("vatAt", { rate: vatRate }) : t("vat")}
              </td>
              <td className="tnum pt-1 text-right">{euros(vat)}</td>
            </tr>
            <tr>
              <td className="pt-2 text-right font-semibold">{t("total")}</td>
              <td className="tnum pt-2 text-right font-display text-[20px] font-extrabold tracking-[-.03em]">
                {euros(gross)}
              </td>
            </tr>
          </tfoot>
        </table>

        {profile.vat_regime === "franchise" && (
          <p className="mt-4 text-[12.5px] text-[var(--ink2)]">
            TVA non applicable, art. 293 B du CGI
          </p>
        )}

        <section className="mt-8 grid gap-4 text-[12.5px] leading-[1.5] sm:grid-cols-2">
          <div className="min-w-0">
            <p className={micro}>{t("payment")}</p>
            {profile.payment_terms && (
              <p className="mt-1.5 text-[var(--ink2)]">
                {profile.payment_terms}
              </p>
            )}
            {profile.iban && (
              <p className="tnum mt-1 [overflow-wrap:anywhere]">
                IBAN {profile.iban}
              </p>
            )}
            {profile.bic && <p className="tnum">BIC {profile.bic}</p>}
            {invoice?.status === "paid" && invoice.paid_at && (
              <p className="mt-1.5 font-semibold">
                {t("settledOn", {
                  date: new Date(invoice.paid_at).toLocaleDateString("fr-FR"),
                })}
              </p>
            )}
          </div>
          <div className="min-w-0 text-[var(--ink2)]">
            <p className={micro}>{t("legal")}</p>
            <p className="mt-1.5">
              {profile.late_penalty ?? t("defaultPenalty")}
            </p>
            <p className="mt-1">
              {t("recovery", {
                amount: euros(profile.recovery_fee_cents),
              })}
            </p>
            {profile.insurance && <p className="mt-1">{profile.insurance}</p>}
          </div>
        </section>

        {profile.footer_note && (
          <p className="mt-6 text-[12px] text-[var(--ink3)]">
            {profile.footer_note}
          </p>
        )}
        <p className="mt-6 text-[12px] text-[var(--ink3)] print:hidden">
          {tBilling("nothingAutomaticBody")}
        </p>
      </article>
    </div>
  );
}
