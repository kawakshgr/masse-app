"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BarChart } from "@/components/BarChart";
import type { StrengthPoint } from "@/lib/history";

/** Per-exercise progression. The exercise is picked here, so this is client. */
export function StrengthPanel({
  strengthByExercise,
}: {
  strengthByExercise: Record<string, StrengthPoint[]>;
}) {
  const t = useTranslations("hist");
  const names = Object.keys(strengthByExercise).sort();
  const [selected, setSelected] = useState(names[0] ?? null);

  if (names.length === 0 || !selected) {
    return (
      <section className="glass rounded-r3 p-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
          {t("strength")}
        </h3>
        <p className="mt-2 text-[11px] text-[var(--ink2)]">{t("noStrength")}</p>
      </section>
    );
  }

  const points = strengthByExercise[selected] ?? [];
  const latest = points.at(-1)?.best1rm ?? null;
  const first = points[0]?.best1rm ?? null;
  const gain =
    latest != null && first != null ? Math.round((latest - first) * 10) / 10 : null;

  return (
    <section className="glass rounded-r3 p-4">
      <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
        {t("strength")}
      </h3>

      <div className="mt-2 flex flex-wrap gap-1">
        {names.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={name === selected}
            onClick={() => setSelected(name)}
            className={`h-7 rounded-rp px-2.5 text-[11px] font-semibold ${
              name === selected
                ? "sel text-[var(--ink)]"
                : "border border-[var(--edge)] text-[var(--ink2)]"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-2">
        <span className="tnum font-display text-[24px] font-extrabold leading-none tracking-[-.04em]">
          {latest == null ? "—" : `${latest} kg`}
        </span>
        {gain !== null && gain !== 0 && (
          <span
            className={`tnum text-[13px] font-semibold ${
              gain > 0 ? "text-[var(--accent-soft)]" : "text-[var(--a3)]"
            }`}
          >
            {gain > 0 ? "+" : ""}
            {gain} kg
          </span>
        )}
        <span className="ml-auto text-[10px] text-[var(--ink3)]">
          {t("estimated", { from: points[0]?.week ?? "—" })}
        </span>
      </div>

      <div className="mt-3">
        <BarChart
          ariaLabel={`${selected} — ${t("strength")}`}
          bars={points.map((p, i) => ({
            value: p.best1rm,
            label: `${p.week} · ${p.best1rm} kg`,
            current: i === points.length - 1,
          }))}
        />
      </div>
    </section>
  );
}
