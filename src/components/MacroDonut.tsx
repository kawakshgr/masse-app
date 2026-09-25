/**
 * The macro split as one ring. Shares are computed from grams by energy —
 * 4/4/9 — so the ring, the percentages and the bars beside it cannot
 * disagree: they are all read from the same three numbers.
 */
export function MacroDonut({
  proteinG,
  carbsG,
  fatG,
  centre,
  caption,
  size = 148,
  labels,
}: {
  proteinG: number;
  carbsG: number;
  fatG: number;
  centre: string;
  caption?: string;
  size?: number;
  labels: { protein: string; carbs: string; fat: string };
}) {
  const kcal = { p: proteinG * 4, c: carbsG * 4, f: fatG * 9 };
  const total = kcal.p + kcal.c + kcal.f;

  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const slices = [
    { key: "p", value: kcal.p, grams: proteinG, colour: "var(--a1)", label: labels.protein },
    { key: "c", value: kcal.c, grams: carbsG, colour: "var(--a2)", label: labels.carbs },
    { key: "f", value: kcal.f, grams: fatG, colour: "var(--a3)", label: labels.fat },
  ] as const;
  const drawn = total === 0 ? [] : slices.filter((slice) => slice.value > 0);
  // A small gap between segments, only when there is more than one to part.
  const gap = drawn.length > 1 ? 6 : 0;
  const share = (value: number) => (total === 0 ? 0 : Math.round((value / total) * 100));

  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label={`${centre} ${caption ?? ""}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--hair)"
            strokeWidth={stroke}
          />
          {drawn.map((slice) => {
            const length = (slice.value / total) * circumference;
            const dash = Math.max(0, length - gap);
            const element = (
              <circle
                key={slice.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.colour}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-(offset + gap / 2)}
                // Start at twelve o'clock rather than three.
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                strokeLinecap={gap ? "round" : "butt"}
              />
            );
            offset += length;
            return element;
          })}
        </svg>

        <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tnum font-display text-[28px] font-extrabold leading-none tracking-[-.03em]">
            {centre}
          </span>
          {caption && (
            <span className="mt-1 text-[10px] font-bold uppercase tracking-[.14em] text-[var(--ink3)]">
              {caption}
            </span>
          )}
        </span>
      </div>

      <ul className="flex min-w-[200px] flex-1 flex-col gap-1.5">
        {slices.map((slice) => (
          <li key={slice.key} className="glass2 rounded-r2 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: slice.colour, boxShadow: `0 0 8px ${slice.colour}` }}
              />
              <span className="min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-[.12em]">
                {slice.label}
              </span>
              <span className="tnum shrink-0 text-[14px] font-extrabold">
                {Math.round(slice.grams)} g
              </span>
              <span className="tnum w-10 shrink-0 text-right text-[12px] font-semibold text-[var(--ink3)]">
                {share(slice.value)}%
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-rp bg-[var(--hair)]">
              <div
                className="h-full rounded-rp"
                style={{
                  width: `${share(slice.value)}%`,
                  background: slice.colour,
                  transition: "width .4s",
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
