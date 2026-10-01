"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { issueAndSendMonth } from "@/app/(coach)/facturation/actions";
import { SectionTitle } from "@/components/Pane";

export type MonthCandidate = {
  id: string;
  name: string;
  amount: string;
  issued: boolean;
  hasEmail: boolean;
};

/**
 * The month's invoices in one press (1 Oct 2026): every monthly client whose
 * invoice has not gone out, ticked by default — she can leave one out —
 * then one button that writes, archives and e-mails them all.
 */
export function MonthInvoicing({
  period,
  periodLabel,
  candidates,
  companyReady,
}: {
  period: string;
  periodLabel: string;
  candidates: MonthCandidate[];
  companyReady: boolean;
}) {
  const t = useTranslations("monthInvoicing");
  const [picked, setPicked] = useState<string[]>(candidates.map((c) => c.id));

  return (
    <section className="glass rounded-r3 p-4">
      <SectionTitle
        icon="send"
        aside={<span className="tnum text-[12px] font-bold text-[var(--ink3)]">{candidates.length}</span>}
      >
        {t("title", { month: periodLabel })}
      </SectionTitle>
      <p className="mt-1 text-[12.5px] leading-[1.5] text-[var(--ink2)]">{t("lede")}</p>

      <form action={issueAndSendMonth} className="mt-3 space-y-3">
        <input type="hidden" name="period" value={period} />
        <ul className="grid gap-2 sm:grid-cols-2">
          {candidates.map((c) => {
            const on = picked.includes(c.id);
            return (
              <li key={c.id}>
                <label
                  className={`flex h-[60px] cursor-pointer items-center gap-3 rounded-r2 border px-3 ${
                    on
                      ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_18%,var(--deep))]"
                      : "border-[var(--edge)] bg-[var(--glass2)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="client_id"
                    value={c.id}
                    checked={on}
                    onChange={() => setPicked(on ? picked.filter((id) => id !== c.id) : [...picked, c.id])}
                    className="size-5 shrink-0 accent-[var(--accent)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold">{c.name}</span>
                    <span className={`block truncate text-[11.5px] ${c.hasEmail ? "text-[var(--ink2)]" : "text-[var(--a3)]"}`}>
                      {[c.issued ? t("issued") : t("toIssue"), c.hasEmail ? null : t("noEmail")].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="tnum shrink-0 text-[14px] font-bold">{c.amount}</span>
                </label>
              </li>
            );
          })}
        </ul>
        {companyReady ? (
          <Submit count={picked.length} />
        ) : (
          <p className="text-[12.5px] text-[var(--a3)]">{t("companyFirst")}</p>
        )}
      </form>
    </section>
  );
}

function Submit({ count }: { count: number }) {
  const t = useTranslations("monthInvoicing");
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || count === 0}
      className="cta h-12 w-full rounded-r2 text-[14px] font-semibold text-[var(--onA)] disabled:opacity-60"
    >
      {pending ? t("sending") : t("send", { count })}
    </button>
  );
}
