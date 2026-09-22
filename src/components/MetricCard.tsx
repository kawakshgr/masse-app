export function MetricCard({
  label,
  value,
  sub,
  wash,
  delta,
}: {
  label: string;
  value: string;
  sub: string | null;
  wash: "wash-1" | "wash-2" | "wash-3";
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
      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
        {label}
      </p>
      <p className="tnum mt-3 font-display text-[24px] font-extrabold leading-none tracking-[-.04em]">
        {value}
      </p>
      <p className="tnum mt-1 truncate text-[11px] text-[var(--ink3)]">
        {sub ?? "—"}
      </p>
      {delta && (
        <p className={`tnum mt-1 truncate text-[11px] font-semibold ${tone}`}>
          {delta.direction === "up" ? "↑" : delta.direction === "down" ? "↓" : "="}{" "}
          {delta.text}
        </p>
      )}
    </div>
  );
}
