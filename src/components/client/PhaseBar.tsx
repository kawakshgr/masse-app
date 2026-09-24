import { useTranslations } from "next-intl";

export type PhaseSpan = { phase: string; first_day: number; last_day: number };

/**
 * The cycle as a strip — PhaseBar.swift. Four phases at their real widths,
 * which come from the database: one phase is not a quarter of a cycle, and
 * drawing them equal would say something untrue about a body. Only the
 * current phase is filled, so "where am I" is what the eye lands on.
 */
export function PhaseBar({
  spans,
  current,
  day,
  length,
}: {
  spans: PhaseSpan[];
  current: string | null;
  day: number | null;
  length: number;
}) {
  const t = useTranslations("phase");
  const tChart = useTranslations("cycleChart");
  const spoken =
    current && day ? tChart("spoken", { phase: t(current), day }) : tChart("none");

  return (
    <div className="space-y-2.5" role="img" aria-label={spoken}>
      <div className="relative h-[30px]">
        <div className="flex h-full gap-0.5">
          {spans.map((span) => {
            const now = span.phase === current;
            return (
              <div
                key={span.phase}
                className={`h-full rounded-[4px] ${now ? "sel" : "bg-[var(--glass2)]"}`}
                style={{
                  flexGrow: span.last_day - span.first_day + 1,
                  flexBasis: 0,
                  // Inset, not a border: .sel owns border-color and would win.
                  boxShadow: now ? "inset 0 0 0 1px var(--a1)" : undefined,
                }}
              />
            );
          })}
        </div>
        {/* Today, on the same scale, centred on the day's own slice. */}
        {day !== null && (
          <div
            aria-hidden
            className="absolute top-0 h-[30px] w-0.5 rounded-full bg-[var(--ink)]"
            style={{
              left: `calc(${((Math.min(Math.max(day, 1), length) - 0.5) / Math.max(length, 1)) * 100}% - 1px)`,
            }}
          />
        )}
      </div>
      <div className="flex gap-1.5">
        {spans.map((span) => (
          <span
            key={span.phase}
            className={`min-w-0 flex-1 truncate text-[12px] ${
              span.phase === current ? "text-[var(--ink)]" : "text-[var(--ink3)]"
            }`}
          >
            {t(span.phase)}
          </span>
        ))}
      </div>
    </div>
  );
}
