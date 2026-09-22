/**
 * The prototype keys a card's glyph off the metric and falls back to ◈ where it
 * has none — its own rule, kept rather than invented around. Every mark here is
 * one it already uses somewhere in the file.
 */
export const METRIC_GLYPH = {
  adherence: "◉",
  sessions: "⟷",
  sleep: "☾",
  steps: "⇡",
  other: "◈",
} as const;

export type MetricKind = keyof typeof METRIC_GLYPH;

export function MetricCard({
  label,
  value,
  sub,
  wash,
  kind = "other",
  delta,
}: {
  label: string;
  value: string;
  sub: string | null;
  wash: "wash-1" | "wash-2" | "wash-3";
  kind?: MetricKind;
  /** Change against the period before. Null when there is nothing to compare. */
  delta?: { text: string; direction: "up" | "down" | "flat" } | null;
}) {
  // Direction is coloured, never judged: more sleep and fewer steps are both
  // just movement, and the coach reads what it means.
  const tone =
    delta?.direction === "up"
      ? "text-[var(--accent-soft)]"
      : delta?.direction === "down"
        ? "text-[var(--a3)]"
        : "text-[var(--ink3)]";
  return (
    <div
      className={`${wash} flex min-w-0 flex-1 flex-col justify-between rounded-r3 border border-[var(--edge)] p-4`}
      style={{ boxShadow: "var(--spec)" }}
    >
      {/* Decorative: the label underneath already says what this is. */}
      <span
        aria-hidden
        className="glass2 mb-2.5 flex size-6 items-center justify-center rounded-r2 text-[11px] leading-none text-[var(--ink2)]"
      >
        {METRIC_GLYPH[kind]}
      </span>
      <p className="truncate text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
        {label}
      </p>
      <p className="tnum mt-2 font-display text-[24px] font-extrabold leading-none tracking-[-.03em]">
        {value}
      </p>
      <p className="tnum mt-1 truncate text-[12px] text-[var(--ink2)]">
        {sub ?? "—"}
      </p>
      {delta && (
        <p className={`tnum mt-1 truncate text-[12px] font-bold ${tone}`}>
          {delta.direction === "up" ? "↑" : delta.direction === "down" ? "↓" : "="}{" "}
          {delta.text}
        </p>
      )}
    </div>
  );
}
