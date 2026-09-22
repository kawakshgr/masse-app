/**
 * The macro split as one ring. Shares are computed from grams by energy —
 * 4/4/9 — so the ring and the percentages beside it cannot disagree.
 */
export function MacroDonut({
  proteinG,
  carbsG,
  fatG,
  centre,
  caption,
  size = 104,
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

  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const slices =
    total === 0
      ? []
      : ([
          { key: "p", value: kcal.p, colour: "var(--a1)", label: labels.protein },
          { key: "c", value: kcal.c, colour: "var(--a2)", label: labels.carbs },
          { key: "f", value: kcal.f, colour: "var(--a3)", label: labels.fat },
        ] as const);

  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label={centre}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--hair)"
            strokeWidth={stroke}
          />
          {slices.map((slice) => {
            const fraction = slice.value / total;
            const dash = fraction * circumference;
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
                strokeDashoffset={-offset}
                // Start at twelve o'clock rather than three.
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                strokeLinecap="butt"
              />
            );
            offset += dash;
            return element;
          })}
        </svg>

        <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tnum font-display text-[15px] font-extrabold leading-none tracking-[-.03em]">
            {centre}
          </span>
          {caption && (
            <span className="mt-0.5 text-[9px] text-[var(--ink3)]">{caption}</span>
          )}
        </span>
      </div>

      <ul className="min-w-0 flex-1 space-y-1">
        {slices.map((slice) => (
          <li key={slice.key} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: slice.colour }}
            />
            <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--ink2)]">
              {slice.label}
            </span>
            <span className="tnum shrink-0 text-[11px] font-semibold">
              {Math.round((slice.value / total) * 100)}%
            </span>
          </li>
        ))}
        {slices.length === 0 && (
          <li className="text-[11px] text-[var(--ink3)]">—</li>
        )}
      </ul>
    </div>
  );
}
