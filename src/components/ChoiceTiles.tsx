"use client";

import { Icon } from "@/components/Icon";

export type Choice<T extends string> = {
  value: T;
  label: string;
  /** A line icon, or `big`: a figure written large in its place ("3–4"). */
  icon?: string;
  big?: string;
};

/**
 * One answer out of a few, as big tiles (Kevin, 1 Oct 2026) — the tappable
 * twin of `Tiles`, for forms: a radio group the thumb cannot miss.
 */
export function ChoiceTiles<T extends string>({
  label,
  options,
  value,
  onChange,
  columns = 2,
}: {
  label: string;
  options: Choice<T>[];
  value: T | null;
  onChange: (value: T) => void;
  columns?: 2 | 3 | 4;
}) {
  const grid = columns === 4 ? "grid-cols-2 sm:grid-cols-4" : columns === 3 ? "grid-cols-3" : "grid-cols-2";
  return (
    <div role="radiogroup" aria-label={label} className={`grid gap-2.5 ${grid}`}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(option.value)}
            className={`flex min-h-[96px] flex-col items-start justify-between gap-2.5 rounded-r3 border p-3.5 text-left transition-transform active:scale-[.98] ${
              on
                ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_16%,var(--glass2))]"
                : "glass border-[var(--edge)]"
            }`}
          >
            {option.big ? (
              <span
                className={`tnum font-display text-[28px] font-extrabold leading-none tracking-[-.02em] ${
                  on ? "text-[var(--accent)]" : "text-[var(--ink)]"
                }`}
              >
                {option.big}
              </span>
            ) : option.icon ? (
              <span className={on ? "text-[var(--accent)]" : "text-[var(--ink2)]"}>
                <Icon name={option.icon} size={32} />
              </span>
            ) : null}
            <span className="flex w-full items-end justify-between gap-2">
              <span className="text-[13px] font-bold uppercase leading-[1.2] tracking-[.08em]">
                {option.label}
              </span>
              <span
                aria-hidden
                className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                  on ? "cta border-transparent text-[var(--onA)]" : "border-[var(--edge)]"
                }`}
              >
                {on ? "✓" : ""}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** A yes-or-no option as a big tile that lights up when on. */
export function ToggleTile({
  icon,
  label,
  hint,
  on,
  onChange,
}: {
  icon: string;
  label: string;
  hint?: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`flex min-h-[96px] w-full flex-col items-start gap-2 rounded-r3 border p-3.5 text-left transition-transform active:scale-[.98] ${
        on
          ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_16%,var(--glass2))]"
          : "glass border-[var(--edge)]"
      }`}
    >
      <span className="flex w-full items-start justify-between gap-2">
        <span className={on ? "text-[var(--accent)]" : "text-[var(--ink2)]"}>
          <Icon name={icon} size={30} />
        </span>
        <span
          aria-hidden
          className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
            on ? "cta border-transparent text-[var(--onA)]" : "border-[var(--edge)]"
          }`}
        >
          {on ? "✓" : ""}
        </span>
      </span>
      <span className="text-[12.5px] font-bold uppercase leading-[1.2] tracking-[.08em]">{label}</span>
      {hint && <span className="text-[11.5px] leading-snug text-[var(--ink3)]">{hint}</span>}
    </button>
  );
}
