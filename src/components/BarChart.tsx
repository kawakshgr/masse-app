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
};

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

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="relative flex items-end gap-1"
      style={{ height }}
    >
      {targetPct != null && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[var(--accent-soft)]"
          style={{ bottom: `${Math.min(targetPct, 100)}%` }}
        />
      )}

      {bars.map((bar, index) => {
        // A day with nothing recorded gets a stub rather than nothing at all:
        // an invisible bar reads as a narrower chart, not as a missing day.
        const pct =
          bar.value == null
            ? 3
            : Math.max(6, ((bar.value - floor) / span) * 100);

        // A day still being lived is reported, never marked pass or fail.
        const background =
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

        return (
          <div
            key={index}
            title={bar.label}
            className="flex h-full min-w-0 flex-1 flex-col justify-end"
          >
            <div
              style={{
                height: `${pct}%`,
                borderRadius: "5px 5px 2px 2px",
                background,
                transition: "height .5s cubic-bezier(.2,.9,.2,1)",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
