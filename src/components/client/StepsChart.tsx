import { useTranslations } from "next-intl";
import { Kicker } from "./ui";

/**
 * Seven days of steps against what her coach asked for — StepsChart.swift, on
 * the web. Monday to Sunday, always: the week she is in, the week her coach
 * reads. A day with nothing logged is a gap, never a zero.
 */
export function StepsChart({
  days,
  target,
}: {
  /** Monday first, seven entries; null is "not logged". */
  days: (number | null)[];
  target: number | null;
}) {
  const t = useTranslations("stepsChart");
  const tDays = useTranslations("days");

  const logged = days.filter((d): d is number => d !== null);
  const average = logged.length
    ? Math.round(logged.reduce((a, b) => a + b, 0) / logged.length)
    : null;
  // Only days she logged count, so a week half entered is not a week half failed.
  const hit = target === null ? 0 : logged.filter((d) => d >= target).length;
  // The tallest bar is the larger of what she walked and what was asked, so
  // the target line never sits off the top of its own chart.
  const ceiling = Math.max(...logged, target ?? 0, 1);
  const fmt = (n: number) => n.toLocaleString("fr-FR");

  const spoken = days
    .map((steps, i) => (steps === null ? null : t("spoken", { day: tDays(String(i)), steps: fmt(steps) })))
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-3" role="img" aria-label={spoken || t("none")}>
      <div className="flex items-baseline justify-between gap-2">
        <Kicker icon="steps">{t("title")}</Kicker>
        {target !== null && (
          <span className="tnum text-[13px] text-[var(--ink2)]">
            {t("target", { steps: fmt(target) })}
          </span>
        )}
      </div>

      {logged.length === 0 ? (
        <p className="text-[13px] text-[var(--ink3)]">{t("none")}</p>
      ) : (
        <>
          <div className="flex gap-2">
            <Stat label={t("avgBox")} value={average === null ? "—" : fmt(average)} />
            {target !== null && (
              <Stat
                label={t("hitBox")}
                value={t("hitOf", { count: hit, total: logged.length })}
                lit={hit > 0}
              />
            )}
          </div>

          <div className="relative h-[104px]">
            <div className="absolute inset-0 flex items-end gap-1.5">
              {days.map((steps, i) =>
                steps === null ? (
                  <div key={i} className="h-[3px] flex-1 rounded-[2px] bg-[var(--hair)]" />
                ) : (
                  <div
                    key={i}
                    className="flex-1"
                    style={{
                      height: `${Math.max((steps / ceiling) * 100, 3)}%`,
                      borderRadius: "5px 5px 2px 2px",
                      background:
                        target !== null && steps >= target ? "var(--a1)" : "var(--glass2)",
                    }}
                  />
                ),
              )}
            </div>
            {/* The target across the bars: the question is which days cleared it. */}
            {target !== null && (
              <div
                aria-hidden
                className="absolute inset-x-0 h-px"
                style={{
                  bottom: `${(target / ceiling) * 100}%`,
                  background: "color-mix(in oklab, var(--a1) 55%, transparent)",
                }}
              />
            )}
          </div>

          <div className="flex gap-1.5">
            {days.map((_, i) => (
              <span key={i} className="flex-1 text-center text-[13px] text-[var(--ink3)]">
                {tDays(String(i)).slice(0, 1)}
              </span>
            ))}
          </div>

          {target === null && (
            <p className="text-[13px] leading-[1.45] text-[var(--ink3)]">{t("noTarget")}</p>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, lit = false }: { label: string; value: string; lit?: boolean }) {
  return (
    <div className="flex-1 rounded-r1 bg-[var(--glass2)] px-3 py-2.5">
      <p className="text-[13px] text-[var(--ink2)]">{label}</p>
      <p
        className={`tnum font-display text-[26px] font-extrabold tracking-[-.03em] ${
          lit ? "text-[var(--a1)]" : "text-[var(--ink)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
