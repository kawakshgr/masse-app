"use client";

import { SectionTitle } from "@/components/Pane";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { swapWeekDays } from "@/app/(coach)/clients/nutrition-actions";

/**
 * Her own week, and the one thing she needs to do to it: move a day.
 *
 * Life moves a rest day — a late meeting, a bad night, a gym that shuts. A rest
 * day she cannot move is a rest day she trains through, so this is hers to
 * change, and her nutrition follows because it hangs off the day type rather
 * than the weekday.
 */
export function MyWeek({
  clientId,
  week,
  types,
}: {
  clientId: string;
  /** day_index → day type name, or null when it is the default. */
  week: (string | null)[];
  types: { id: string; name: string; isRest: boolean }[];
}) {
  const t = useTranslations("myWeek");
  const tDays = useTranslations("days");
  const [picked, setPicked] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  if (types.length === 0) return null;

  function choose(day: number) {
    if (picked === null) {
      setPicked(day);
      return;
    }
    if (picked === day) {
      setPicked(null);
      return;
    }
    const body = new FormData();
    body.set("client_id", clientId);
    body.set("day_a", String(picked));
    body.set("day_b", String(day));
    setPicked(null);
    startTransition(() => {
      void swapWeekDays(body);
    });
  }

  return (
    <section className="glass rounded-r4 p-[18px]">
      <SectionTitle icon="checkIns">{t("title")}</SectionTitle>
      <p className="mt-1.5 text-[13px] leading-[1.5] text-[var(--ink2)]">
        {picked === null ? t("lede") : t("pickSecond", { day: tDays(String(picked)) })}
      </p>

      <ul className={`mt-3 flex flex-col gap-1.5 ${pending ? "opacity-60" : ""}`}>
        {[0, 1, 2, 3, 4, 5, 6].map((day) => {
          const label = week[day];
          const chosen = picked === day;
          return (
            <li key={day}>
              <button
                type="button"
                aria-pressed={chosen}
                onClick={() => choose(day)}
                className={`flex w-full items-center gap-3 rounded-r2 border px-3.5 text-left ${
                  chosen
                    ? "sel border-[var(--accent-soft)]"
                    : "border-[var(--edge)] bg-[var(--glass2)]"
                }`}
                style={{ minHeight: 52 }}
              >
                <span className="w-20 shrink-0 text-[13px] text-[var(--ink2)]">
                  {tDays(String(day))}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">
                  {label ?? t("default")}
                </span>
                <span aria-hidden className="shrink-0 text-[13px] text-[var(--ink3)]">
                  {chosen ? "↕" : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-2.5 text-[12.5px] leading-[1.45] text-[var(--ink3)]">
        {t("note")}
      </p>
    </section>
  );
}
