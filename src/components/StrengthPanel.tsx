"use client";

import { SectionTitle } from "@/components/Pane";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { intl } from "@/lib/locale";
import { BarChart, barDate } from "@/components/BarChart";
import { Kicker } from "@/components/client/ui";
import type { StrengthPoint } from "@/lib/history";

/** The movements shown as tiles; the rest are in the dropdown. */
const TILES = 4;

/**
 * Strength over time (1 Oct 2026): the movements logged most often as big
 * tiles — the estimated 1RM now and since when it moved — and the chosen
 * one week by week, every figure written. The coach's History tab and the
 * client's Séance both show it; `client` dresses it as a client card.
 */
export function StrengthPanel({
  strengthByExercise,
  client = false,
}: {
  strengthByExercise: Record<string, StrengthPoint[]>;
  client?: boolean;
}) {
  const t = useTranslations("hist");
  const locale = intl(useLocale());
  // "28 sept." rather than the raw 2026-09-28 the rows carry.
  const day = (iso: string) =>
    new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "short" });
  const kg = (value: number) => value.toLocaleString(locale, { maximumFractionDigits: 1 });

  // The main lifts are the ones come back to most weeks, and among those the
  // heaviest — a squat before a lateral raise.
  const top = (name: string) => strengthByExercise[name].at(-1)?.best1rm ?? 0;
  const names = Object.keys(strengthByExercise).sort(
    (a, b) => strengthByExercise[b].length - strengthByExercise[a].length || top(b) - top(a),
  );
  const tiles = names.slice(0, TILES);
  const others = names.slice(TILES).sort((a, b) => a.localeCompare(b));
  const [selected, setSelected] = useState(names[0] ?? null);

  const gainOf = (name: string) => {
    const points = strengthByExercise[name] ?? [];
    const first = points[0]?.best1rm;
    const latest = points.at(-1)?.best1rm;
    return first != null && latest != null ? Math.round((latest - first) * 10) / 10 : null;
  };

  const head = client ? (
    <Kicker icon="trophy">{t("myStrength")}</Kicker>
  ) : (
    <SectionTitle icon="trophy">{t("strength")}</SectionTitle>
  );
  // A client card on Séance, a coach panel in History.
  const frame = client ? "glass space-y-3.5 rounded-r4 p-[18px]" : "glass space-y-3 rounded-r3 p-4";

  if (names.length === 0 || !selected) {
    return (
      <section className={frame}>
        {head}
        <p className="text-[12.5px] text-[var(--ink2)]">{t("noStrength")}</p>
      </section>
    );
  }

  const points = strengthByExercise[selected] ?? [];
  const shown = points.slice(-12);

  return (
    <section className={frame}>
      {head}

      {/* Movement names stay as written — in English. */}
      <div className={`grid gap-2 ${tiles.length >= 2 ? "grid-cols-2" : "grid-cols-1"}`}>
        {tiles.map((name) => {
          const on = name === selected;
          const latest = strengthByExercise[name].at(-1)?.best1rm ?? null;
          const gain = gainOf(name);
          return (
            <button
              key={name}
              type="button"
              aria-pressed={on}
              onClick={() => setSelected(name)}
              className={`flex min-h-[96px] flex-col justify-between gap-2 rounded-r3 border p-3 text-left ${
                on
                  ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_18%,var(--deep))]"
                  : "border-[var(--edge)] bg-[var(--glass2)]"
              }`}
            >
              <span className="line-clamp-2 text-[11.5px] font-bold uppercase leading-[1.25] tracking-[.06em] text-[var(--ink2)]">
                {name}
              </span>
              <span className="flex items-baseline justify-between gap-1.5">
                <span className="tnum font-display text-[22px] font-extrabold leading-none tracking-[-.03em]">
                  {latest == null ? "—" : `${kg(latest)} kg`}
                </span>
                {gain !== null && gain !== 0 && (
                  <span className={`tnum shrink-0 text-[12.5px] font-bold ${gain > 0 ? "text-[var(--accent-soft)]" : "text-[var(--a3)]"}`}>
                    {gain > 0 ? "+" : "−"}
                    {kg(Math.abs(gain))}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {others.length > 0 && (
        <select
          aria-label={t("otherMovement")}
          value={others.includes(selected) ? selected : ""}
          onChange={(e) => e.target.value && setSelected(e.target.value)}
          className="h-11 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-3 text-[16px] font-semibold text-[var(--ink)] md:text-[13px]"
        >
          <option value="">{t("otherMovement")}</option>
          {others.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      )}

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-[14px] font-semibold">{selected}</span>
        <span className="text-[11px] text-[var(--ink3)]">
          {t("estimated", { from: points[0] ? day(points[0].week) : "—" })}
        </span>
      </div>

      <BarChart
        ariaLabel={`${selected} — ${t("strength")}`}
        bars={shown.map((p, i) => ({
          value: p.best1rm,
          label: `${day(p.week)} · ${kg(p.best1rm)} kg`,
          figure: kg(p.best1rm),
          caption: barDate(p.week, locale),
          current: i === shown.length - 1,
        }))}
      />
      {client && <p className="text-[12px] leading-[1.45] text-[var(--ink3)]">{t("strengthHint")}</p>}
    </section>
  );
}
