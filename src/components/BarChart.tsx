export type Bar = {
  /** Raw value; the chart scales against the tallest bar it is given. */
  value: number | null;
  label?: string;
  /** Marks the bar the reader should land on, usually the most recent. */
  current?: boolean;
  /** Something went wrong that week — a missed session, say. */
  alert?: boolean;
  /**
   * Semantic fill. `today` is in progress and never judged; `near` landed
   * within tolerance; `off` did not; `future` has not happened.
   */
  tone?: "future" | "today" | "near" | "off";
  /**
   * The value written above the bar ("3/4", "82,5"). Given on any bar, every
   * figure is on the chart: a coach on a phone has no hover to read them.
   */
  figure?: string;
  /** Written under the bar: the week or the day it stands for. */
  caption?: string;
};

/** "28/9" — short enough to sit under a bar. */
export function barDate(iso: string, locale: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString(locale, {
    day: "numeric",
    month: "numeric",
  });
}

/**
 * Bars, at the radius the handoff specifies: 5px 5px 2px 2px. Nothing here is
 * a library — one shape, one scale, drawn from the rows beside it.
 */
export function BarChart({
  bars,
  height = 58,
  ariaLabel,
  target,
}: {
  bars: Bar[];
  height?: number;
  ariaLabel: string;
  /**
   * A line across the bars. Given one, the scale starts at zero and reaches
   * past the target — a bar can only be read against a target when the chart
   * shows the whole distance to it.
   */
  target?: number | null;
}) {
  const values = bars.map((b) => b.value).filter((v): v is number => v != null);
  if (values.length === 0) return null;

  const max = Math.max(...values, target ?? 0);
  const min = Math.min(...values);
  // A flat series would otherwise render as seven full-height blocks, which
  // reads as "no change" far less honestly than a low, even row does. That
  // trick is off when there is a target: a floor above zero would put a bar
  // below the line that was actually above it.
  const floor =
    target != null ? 0 : min === max ? 0 : min - (max - min) * 0.35;
  const span = max - floor || 1;
  const targetPct =
    target == null ? null : ((target - floor) / span) * 100;

  const written = bars.some((b) => b.figure != null || b.caption != null);

  const fill = (bar: Bar) =>
    // A day still being lived is reported, never marked pass or fail.
    bar.tone === "future"
      ? "var(--hair)"
      : bar.tone === "today"
        ? "var(--a2)"
        : bar.tone === "near"
          ? "linear-gradient(180deg, var(--a1), var(--a2))"
          : bar.tone === "off"
            ? "var(--a3)"
            : bar.alert
              ? "var(--a3)"
              : bar.current
                ? "var(--accent)"
                : "color-mix(in oklab, var(--accent) 34%, var(--glass2))";

  // A day with nothing recorded gets a stub rather than nothing at all:
  // an invisible bar reads as a narrower chart, not as a missing day.
  const pctOf = (bar: Bar) =>
    bar.value == null ? 3 : Math.max(6, ((bar.value - floor) / span) * 100);

  const targetLine = targetPct != null && (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[var(--accent-soft)]"
      style={{ bottom: `${Math.min(targetPct, 100)}%` }}
    />
  );

  if (!written) {
    return (
      <div
        role="img"
        aria-label={ariaLabel}
        className="relative flex items-end gap-1"
        style={{ height }}
      >
        {targetLine}
        {bars.map((bar, index) => (
          <div
            key={index}
            title={bar.label}
            className="flex h-full min-w-0 flex-1 flex-col justify-end"
          >
            <div style={{ height: `${pctOf(bar)}%`, ...barStyle(fill(bar)) }} />
          </div>
        ))}
      </div>
    );
  }

  // With figures, each column keeps room to be read; past what the pane
  // holds, the chart scrolls sideways and opens on the latest (rtl start).
  return (
    <div role="img" aria-label={ariaLabel} dir="rtl" className="overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1">
      <div dir="ltr" className="flex w-max min-w-full flex-col">
        <div className="relative flex gap-1" style={{ height: height + 16 }}>
          <div className="pointer-events-none absolute inset-x-0 bottom-0" style={{ top: 16 }}>
            {targetLine}
          </div>
          {bars.map((bar, index) => (
            <div
              key={index}
              title={bar.label}
              className="flex h-full min-w-[30px] flex-1 basis-0 flex-col justify-end"
            >
              <span
                className={`tnum mb-[3px] whitespace-nowrap text-center text-[10px] leading-none ${
                  bar.current || bar.alert || bar.tone === "off"
                    ? "font-bold text-[var(--ink)]"
                    : "text-[var(--ink2)]"
                }`}
              >
                {bar.figure ?? "\u00a0"}
              </span>
              <div
                style={{
                  height: `${(pctOf(bar) / 100) * height}px`,
                  ...barStyle(fill(bar)),
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-1">
          {bars.map((bar, index) => (
            <span
              key={index}
              aria-hidden
              className="tnum min-w-[30px] flex-1 basis-0 whitespace-nowrap text-center text-[9.5px] leading-none text-[var(--ink3)]"
            >
              {bar.caption ?? ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function barStyle(background: string) {
  return {
    borderRadius: "5px 5px 2px 2px",
    background,
    transition: "height .5s cubic-bezier(.2,.9,.2,1)",
  } as const;
}
