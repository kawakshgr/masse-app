"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { archiveInvoice, emailInvoice } from "@/app/(coach)/facturation/actions";

const button =
  "glass2 flex h-9 shrink-0 items-center justify-center rounded-r2 px-3.5 text-[13px] font-semibold text-[var(--ink)]";

/**
 * What she can do with the paper. Nothing here is automatic: each of these is
 * a press, and the one that leaves the building — the email — only appears
 * when a provider is actually configured.
 */
export function InvoiceActions({
  clientId,
  period,
  hasEmail,
  mailerReady,
  archivedAt,
  sentAt,
}: {
  clientId: string;
  period: string;
  hasEmail: boolean;
  /** A mail provider is configured, so Masse can actually send. */
  mailerReady: boolean;
  archivedAt: string | null;
  sentAt: string | null;
}) {
  const t = useTranslations("invoice");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href="/facturation" className={button}>
        {t("back")}
      </Link>

      <a
        href={`/facturation/${clientId}/${period}/pdf?telecharger=1`}
        download
        className="cta flex h-9 shrink-0 items-center justify-center rounded-r2 px-3.5 text-[13px] font-semibold text-[var(--onA)]"
      >
        {t("pdf")}
      </a>

      <form action={archiveInvoice}>
        <input type="hidden" name="client_id" value={clientId} />
        <input type="hidden" name="period" value={period} />
        <button type="submit" className={button}>
          {archivedAt ? t("archived") : t("archive")}
        </button>
      </form>

      {mailerReady && hasEmail && (
        <form action={emailInvoice}>
          <input type="hidden" name="client_id" value={clientId} />
          <input type="hidden" name="period" value={period} />
          <button type="submit" className={button}>
            {sentAt
              ? t("emailed", { date: new Date(sentAt).toLocaleDateString("fr-FR") })
              : t("email")}
          </button>
        </form>
      )}

      <div className="min-w-0 flex-1" />

      {!mailerReady && (
        <p className="min-w-0 basis-full text-[12px] leading-[1.45] text-[var(--ink3)]">
          {t("mailerOff")}
        </p>
      )}
      {mailerReady && !hasEmail && (
        <p className="min-w-0 basis-full text-[12px] leading-[1.45] text-[var(--ink3)]">
          {t("noAddress")}
        </p>
      )}
    </div>
  );
}
