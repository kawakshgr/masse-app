"use client";

import { SectionTitle } from "@/components/Pane";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { moveDay, resetWeek } from "@/app/(client)/actions";

/**
 * The client's own week, and the one thing to do to it: move a day.
 *
 * Life moves a rest day — a late meeting, a bad night, a gym that shuts. A
 * day that cannot move is a rest day trained through, so two days can trade
 * places, for this week. The session and the day type go together
 * (lib/dayMoves.ts): nutrition hangs off the day type, so the food follows.
 */
export function MyWeek({
  today,
  moved,
  week,
  hasTypes,
}: {
  today: number;
  /** Whether anything was moved this week. */
  moved: boolean;
  /** Per weekday, as arranged: the day type, the session, and whether it moved. */
  week: { type: string | null; session: string | null; moved: boolean }[];
  hasTypes: boolean;
}) {
  const t = useTranslations("myWeek");
  const tDays = useTranslations("days");
  const [picked, setPicked] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  // Without day types the food is the same every day: the week is moved
  // from Séance, where the sessions are.
  if (!hasTypes) return null;

  function choose(day: number) {
    if (picked === null) {
      setPicked(day);
      return;
    }
    if (picked === day) {
      setPicked(null);
      return;
    }
    const other = picked;
    setPicked(null);
    startTransition(async () => {
      await moveDay(other, day);
    });
  }

  return (
    <section className="glass rounded-r4 p-[18px]">
      <SectionTitle icon="checkIns">{t("title")}</SectionTitle>
      <p className="mt-1.5 text-[13px] leading-[1.5] text-[var(--ink2)]">
        {picked === null ? t("lede") : t("pickSecond", { day: tDays(String(picked)) })}
      </p>

      <ul className={`mt-3 flex flex-col gap-1.5 ${pending ? "opacity-60" : ""}`}>
        {week.map((row, day) => {
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
                style={{ height: 56 }}
              >
                <span className="w-20 shrink-0 text-[13px] text-[var(--ink2)]">
                  {tDays(String(day))}
                  {day === today && (
                    <span className="block text-[10.5px] font-bold uppercase tracking-[.1em] text-[var(--accent)]">
                      {t("today")}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{row.type ?? t("default")}</span>
                  <span className="block truncate text-[12px] text-[var(--ink3)]">
                    {row.session ?? t("rest")}
                  </span>
                </span>
                <span aria-hidden className="w-3 shrink-0 text-[13px] text-[var(--ink3)]">
                  {chosen || row.moved ? "↕" : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {moved && (
        <form action={resetWeek} className="mt-2.5 flex items-center justify-between gap-3">
          <p className="text-[13px] text-[var(--ink2)]">{t("moved")}</p>
          <button type="submit" className="min-h-11 shrink-0 text-[13px] font-semibold text-[var(--accent)]">
            {t("reset")}
          </button>
        </form>
      )}

      <p className="mt-2.5 text-[12.5px] leading-[1.45] text-[var(--ink3)]">{t("note")}</p>
    </section>
  );
}
