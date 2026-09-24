import { getLocale, getTranslations } from "next-intl/server";
import { clientSession } from "@/lib/clientData";
import { euros, monthLabel } from "@/lib/billing";
import { BackHeader, Card, Kicker } from "@/components/client/ui";

/**
 * Her side of the coach's billing register — BillingView.swift. Read only:
 * the app moves no money, the coach ticks a month when it arrives, and this
 * is that register seen from the other side. Drafts are never shown.
 */
export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ pdf?: string }>;
}) {
  const { supabase } = await clientSession();
  const { pdf } = await searchParams;
  const t = await getTranslations("settings");
  const tCommon = await getTranslations("common");
  const english = (await getLocale()) === "en";
  const locale = english ? "en-GB" : "fr-FR";

  const [planRes, invoicesRes] = await Promise.all([
    supabase
      .from("billing_arrangements")
      .select("amount_cents, type, day_of_month, pack_sessions")
      .maybeSingle(),
    supabase
      .from("invoices")
      .select("id, period_start, amount_cents, status, paid_at, invoice_number, pdf_path")
      .order("period_start", { ascending: false })
      .limit(24),
  ]);

  const plan = planRes.data;
  const invoices = invoicesRes.data ?? [];

  const planLine = !plan
    ? null
    : plan.type === "pack"
      ? t("planPack", { amount: euros(plan.amount_cents, locale), count: plan.pack_sessions ?? 0 })
      : t("planMonthly", {
          amount: euros(plan.amount_cents, locale),
          day: ordinal(plan.day_of_month ?? 1, english),
        });

  const day = (stamp: string) =>
    new Date(stamp).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });

  function status(row: (typeof invoices)[number]) {
    if (row.status === "paid") {
      return row.paid_at ? t("statusPaidOn", { date: day(row.paid_at) }) : t("statusPaid");
    }
    if (row.status === "late") return t("statusLate");
    if (row.status === "void") return t("statusVoid");
    return t("statusSent");
  }

  // Paid is the accent; late is coral, the one thing here that asks something
  // of her. Waiting is neither.
  const tone = (value: string) =>
    value === "paid" ? "text-[var(--a1)]" : value === "late" ? "text-[var(--a3)]" : "text-[var(--ink2)]";

  return (
    <>
      <BackHeader
        href="/reglages"
        back={tCommon("back")}
        title={t("billing")}
        lede={t("billingLede")}
      />

      <Card className="space-y-2">
        <Kicker>{t("plan")}</Kicker>
        <p
          className={
            planLine ? "text-[15px] font-semibold" : "text-[15px] leading-[1.45] text-[var(--ink2)]"
          }
        >
          {planLine ?? t("noPlan")}
        </p>
      </Card>

      <Card className="space-y-2.5">
        <Kicker>{t("payments")}</Kicker>
        {invoices.length === 0 ? (
          <p className="text-[15px] text-[var(--ink2)]">{t("noPayments")}</p>
        ) : (
          <ul className="space-y-2">
            {invoices.map((row) => (
              <li key={row.id} className="min-h-[72px] space-y-1.5 rounded-r1 bg-[var(--glass2)] px-3 py-2.5">
                <p className="flex items-baseline justify-between gap-2 text-[15px] font-semibold">
                  <span className="capitalize">{monthLabel(row.period_start, locale)}</span>
                  <span className="tnum">{euros(row.amount_cents, locale)}</span>
                </p>
                <p className="flex items-baseline justify-between gap-2 text-[13px]">
                  <span className={tone(row.status)}>{status(row)}</span>
                  {row.pdf_path && (
                    <a
                      href={`/reglages/facturation/${row.id}`}
                      target="_blank"
                      rel="noopener"
                      className="text-[var(--a1)] underline"
                    >
                      {t("invoicePdf")}
                    </a>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
        {pdf === "echec" && <p className="text-[13px] text-[var(--a3)]">{t("pdfFailed")}</p>}
      </Card>
    </>
  );
}

/** "1er" in French, "1st" in English; plain numbers after that in French. */
function ordinal(day: number, english: boolean) {
  if (!english) return day === 1 ? "1er" : String(day);
  const tens = day % 100;
  const suffix =
    tens >= 11 && tens <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[day % 10] ?? "th";
  return `${day}${suffix}`;
}
