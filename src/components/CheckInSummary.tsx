"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SectionTitle } from "@/components/Pane";
import { checkInWeekFigures } from "@/app/(coach)/clients/actions";
import { composeSummary, type SummaryWeek } from "@/lib/checkInSummary";
import { intl } from "@/lib/locale";
import { waNumber } from "@/lib/whatsapp";

/**
 * The check-in summary, ready to send: written from the week's figures when
 * the coach asks for it, hers to edit, then opened in WhatsApp — where she
 * and her clients talk. Nothing is sent by Masse.
 */
export function CheckInSummary({
  clientId,
  firstName,
  phone,
  weekNumber,
  week,
  previous,
  baseline,
}: {
  clientId: string;
  firstName: string;
  phone: string | null;
  weekNumber: number;
  week: SummaryWeek;
  previous: SummaryWeek | null;
  baseline: SummaryWeek | null;
}) {
  const t = useTranslations("summary");
  const locale = intl(useLocale());
  const [text, setText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const number = waNumber(phone);

  function prepare() {
    startTransition(async () => {
      const figures = await checkInWeekFigures(clientId, week.weekStart);
      setText(composeSummary({ firstName, week, previous, baseline, figures, locale, t }));
    });
  }

  async function copy() {
    if (text === null) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // No clipboard (an old browser, a refused permission): the text stays
      // on screen to be selected by hand.
    }
  }

  return (
    <section className="glass rounded-r3 p-4">
      <SectionTitle icon="whatsapp">{t("title", { n: weekNumber })}</SectionTitle>
      <p className="mt-1.5 text-[12px] leading-[1.5] text-[var(--ink2)]">{t("lede", { first: firstName })}</p>

      {text === null ? (
        <button
          type="button"
          onClick={prepare}
          disabled={pending}
          className="glass2 mt-3 h-10 rounded-r2 px-4 text-[13px] font-semibold text-[var(--ink)] disabled:opacity-50"
        >
          {pending ? t("preparing") : t("prepare")}
        </button>
      ) : (
        <>
          <textarea
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setCopied(false);
            }}
            aria-label={t("title", { n: weekNumber })}
            rows={Math.min(14, Math.max(7, text.split("\n").length + 2))}
            className="mt-3 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] p-3 text-[13px] leading-[1.5] text-[var(--ink)]"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {number && (
              <a
                href={`https://wa.me/${number}?text=${encodeURIComponent(text)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="cta inline-flex h-10 items-center rounded-r2 px-4 text-[13px] font-semibold text-[var(--on-accent)]"
              >
                {t("send")}
              </a>
            )}
            <button
              type="button"
              onClick={copy}
              className="glass2 h-10 rounded-r2 px-4 text-[13px] font-semibold text-[var(--ink)]"
            >
              {copied ? t("copied") : t("copy")}
            </button>
            <button
              type="button"
              onClick={prepare}
              disabled={pending}
              className="h-10 px-2 text-[12.5px] font-semibold text-[var(--accent)] disabled:opacity-50"
            >
              {t("again")}
            </button>
          </div>
          {!number && <p className="mt-2 text-[12px] text-[var(--ink3)]">{t("noPhone", { first: firstName })}</p>}
        </>
      )}
    </section>
  );
}
