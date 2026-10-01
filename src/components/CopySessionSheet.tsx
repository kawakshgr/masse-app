"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

/**
 * A session copied to other weeks and a day (1 Oct 2026): the weeks as
 * tiles to tick, the day as tiles, one button. A panel on the right on a
 * computer, the whole screen on a phone — as ExerciseSheet.
 */
export function CopySessionSheet({
  title,
  weeks,
  currentWeekId,
  sourceDay,
  onCopy,
  onClose,
}: {
  title: string;
  weeks: { id: string; number: number }[];
  currentWeekId: string;
  sourceDay: number;
  onCopy: (targets: { weekId: string; dayIndex: number }[]) => Promise<{ copied: number; kept: number }>;
  onClose: () => void;
}) {
  const t = useTranslations("copySession");
  const tDays = useTranslations("days");
  const [picked, setPicked] = useState<string[]>(weeks.filter((w) => w.id !== currentWeekId).map((w) => w.id));
  const [day, setDay] = useState(sourceDay);
  const [result, setResult] = useState<{ copied: number; kept: number } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onClose]);

  const targets = picked
    .map((weekId) => ({ weekId, dayIndex: day }))
    .filter((target) => !(target.weekId === currentWeekId && target.dayIndex === sourceDay));

  const tile = (on: boolean) =>
    `h-12 rounded-r2 border text-[13px] font-semibold ${
      on
        ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_18%,var(--deep))] text-[var(--ink)]"
        : "border-[var(--edge)] bg-[var(--glass2)] text-[var(--ink2)]"
    }`;

  return (
    <>
      <div aria-hidden onClick={onClose} className="fixed inset-0 z-[59] bg-black/30 max-lg:hidden" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
        className="fixed inset-x-0 top-0 z-[60] flex h-[calc(var(--app-h,100dvh)-var(--app-gap,0px))] flex-col bg-[var(--deep)] pt-[env(safe-area-inset-top)] lg:left-auto lg:w-[440px] lg:border-l lg:border-[var(--edge)] lg:shadow-[-24px_0_60px_rgba(0,0,0,.35)]"
      >
        <header className="flex items-center gap-3 px-4 pb-3 pt-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-bold uppercase tracking-[.14em] text-[var(--accent)]">{title}</p>
            <h2 className="truncate font-display text-[24px] font-extrabold uppercase leading-none tracking-[-.01em]">
              {t("title")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="glass2 flex size-11 shrink-0 items-center justify-center rounded-full text-[24px] leading-none text-[var(--ink2)]"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 pb-4">
          <div className="space-y-2">
            <p className={micro}>{t("weeks")}</p>
            <div className="grid grid-cols-4 gap-2">
              {weeks.map((week) => {
                const on = picked.includes(week.id);
                return (
                  <button
                    key={week.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setResult(null);
                      setPicked(on ? picked.filter((id) => id !== week.id) : [...picked, week.id]);
                    }}
                    className={tile(on)}
                  >
                    {t("week", { number: week.number })}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className={micro}>{t("day")}</p>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={day === d}
                  onClick={() => {
                    setResult(null);
                    setDay(d);
                  }}
                  className={tile(day === d)}
                >
                  {tDays(String(d)).slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[12.5px] leading-[1.5] text-[var(--ink3)]">{t("rule")}</p>

          {result && (
            <p role="status" className="text-[13px] font-semibold text-[var(--accent-soft)]">
              {t("done", { count: result.copied })}
              {result.kept > 0 && <span className="block font-normal text-[var(--a2)]">{t("kept", { count: result.kept })}</span>}
            </p>
          )}
        </div>

        <div className="px-4 pb-[max(12px,calc(env(safe-area-inset-bottom)+8px-var(--app-gap,0px)))] pt-2">
          <button
            type="button"
            disabled={targets.length === 0 || pending}
            onClick={() =>
              startTransition(async () => {
                setResult(await onCopy(targets));
              })
            }
            className="cta h-12 w-full rounded-r2 text-[15px] font-semibold text-[var(--on-accent)] disabled:opacity-50"
          >
            {t("copy", { count: targets.length })}
          </button>
        </div>
      </div>
    </>
  );
}

const micro = "block text-[11px] font-bold uppercase tracking-[.14em] text-[var(--ink2)]";
