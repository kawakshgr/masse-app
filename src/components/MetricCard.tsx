import { Icon } from "@/components/Icon";

/** Each metric wears the app's own line icon for it. */
export const METRIC_ICON = {
  adherence: "chart",
  sessions: "programmes",
  sleep: "sleep",
  steps: "steps",
  other: "scale",
} as const;

export type MetricKind = keyof typeof METRIC_ICON;

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
      {/* Decorative: the label beside it already says what this is. */}
      <div className="mb-3 flex items-center gap-2.5">
        <span
          aria-hidden
          className="glass2 flex size-9 shrink-0 items-center justify-center rounded-r2 text-[var(--ink)]"
        >
          <Icon name={METRIC_ICON[kind]} size={19} />
        </span>
        <p className="min-w-0 truncate text-[11.5px] font-bold uppercase tracking-[.12em]">
          {label}
        </p>
      </div>
      <p className="tnum font-display text-[28px] font-extrabold leading-none tracking-[-.03em]">
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
