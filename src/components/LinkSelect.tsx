"use client";

import { useRouter } from "next/navigation";

/**
 * A filter that lives in the URL, as a dropdown rather than a row of chips:
 * one control, its current value always visible, the other choices one
 * click away.
 */
export function LinkSelect({
  label,
  value,
  options,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; href: string }[];
}) {
  const router = useRouter();
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => {
        const next = options.find((option) => option.value === event.target.value);
        if (next) router.push(next.href);
      }}
      className="h-9 rounded-rp border border-[var(--edge)] bg-[var(--glass2)] pl-3.5 text-[11.5px] font-bold uppercase tracking-[.1em] text-[var(--ink)]"
      style={{ boxShadow: "var(--spec)" }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
