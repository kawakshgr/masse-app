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
}: {
  bars: Bar[];
  height?: number;
  ariaLabel: string;
}) {
  const values = bars.map((b) => b.value).filter((v): v is number => v != null);
  if (values.length === 0) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  // A flat series would otherwise render as seven full-height blocks, which
  // reads as "no change" far less honestly than a low, even row does.
  const floor = min === max ? 0 : min - (max - min) * 0.35;
  const span = max - floor || 1;

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="flex items-end gap-1"
      style={{ height }}
    >
      {bars.map((bar, index) => {
        const pct =
          bar.value == null ? 0 : Math.max(6, ((bar.value - floor) / span) * 100);

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
