"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  SUPPLEMENT_CATEGORIES,
  SUPPLEMENT_TIMINGS,
  SUPPLEMENT_UNITS,
  type SupplementCategory,
  type SupplementTiming,
  type SupplementUnit,
} from "@/lib/supabase/types";
import {
  addSupplement,
  removeSupplement,
  unhideSupplement,
} from "@/app/(coach)/complements/actions";

export type LibraryEntry = {
  id: string;
  name: string;
  category: SupplementCategory;
  doseMin: number | null;
  doseMax: number | null;
  unit: SupplementUnit;
  timing: SupplementTiming;
  note: string | null;
  proteinPerUnit: number | null;
  usable: boolean;
  mine: boolean;
};

const cell =
  "h-9 rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2 text-[13px] text-[var(--ink)]";

/** "3 – 5 g", "1 capsule", "1 000 UI" — never a bare number. */
function doseLabel(
  entry: Pick<LibraryEntry, "doseMin" | "doseMax" | "unit">,
  unitName: (unit: SupplementUnit, count: number) => string,
): string | null {
  if (entry.doseMin === null && entry.doseMax === null) return null;

  const fmt = (n: number) => n.toLocaleString("fr-FR");
  const count = entry.doseMax ?? entry.doseMin ?? 1;
  const unit = unitName(entry.unit, count);

  if (entry.doseMin !== null && entry.doseMax !== null && entry.doseMax !== entry.doseMin) {
    return `${fmt(entry.doseMin)} – ${fmt(entry.doseMax)} ${unit}`;
  }
  return `${fmt(entry.doseMin ?? entry.doseMax!)} ${unit}`;
}

export function SupplementLibrary({
  entries,
  hidden,
}: {
  entries: LibraryEntry[];
  hidden: { id: string; name: string }[];
}) {
  const t = useTranslations("supp");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SupplementCategory | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const unitName = (unit: SupplementUnit, count: number) =>
    t(`unit.${unit}`, { count });

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter(
      (entry) =>
        (category === null || entry.category === category) &&
        (!needle ||
          entry.name.toLowerCase().includes(needle) ||
          (entry.note ?? "").toLowerCase().includes(needle)),
    );
  }, [entries, query, category]);

  /** Grouped by category when nothing filters, flat when something does. */
  const sections = useMemo(() => {
    if (category !== null || query.trim()) return [{ title: null, rows: shown }];
    return SUPPLEMENT_CATEGORIES.map((key) => ({
      title: key,
      rows: shown.filter((entry) => entry.category === key),
    })).filter((section) => section.rows.length > 0);
  }, [shown, category, query]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("search")}
          aria-label={t("search")}
          className={`w-[260px] ${cell}`}
        />
        <span className="tnum text-[12px] text-[var(--ink3)]">
          {t("count", { count: shown.length })}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setAdding((on) => !on)}
          className="h-9 rounded-r2 border border-[var(--edge)] px-3 text-[13px] font-semibold text-[var(--accent)]"
        >
          {t("newOne")}
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <button
          type="button"
          aria-pressed={category === null}
          onClick={() => setCategory(null)}
          className={`rounded-rp border border-[var(--edge)] px-2.5 py-1 text-[11.5px] font-semibold ${
            category === null
              ? "sel text-[var(--ink)]"
              : "bg-[var(--glass2)] text-[var(--ink2)]"
          }`}
        >
          {t("allGroups")}
        </button>
        {SUPPLEMENT_CATEGORIES.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={category === key}
            onClick={() => setCategory(category === key ? null : key)}
            className={`rounded-rp border border-[var(--edge)] px-2.5 py-1 text-[11.5px] font-semibold ${
              category === key
                ? "sel text-[var(--ink)]"
                : "bg-[var(--glass2)] text-[var(--ink2)]"
            }`}
          >
            {t(`cat.${key}`)}
          </button>
        ))}
      </div>

      {adding && (
        <form
          action={addSupplement}
          onSubmit={() => setAdding(false)}
          className="glass2 mt-3 rounded-r3 p-3"
        >
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-[200px] flex-1">
              <span className="block text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
                {t("name")}
              </span>
              <input name="name" required className={`mt-1 w-full ${cell}`} />
            </label>
            <label>
              <span className="block text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
                {t("doseMin")}
              </span>
              <input
                name="dose_min"
                inputMode="decimal"
                className={`tnum mt-1 w-[88px] ${cell}`}
              />
            </label>
            <label>
              <span className="block text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
                {t("doseMax")}
              </span>
              <input
                name="dose_max"
                inputMode="decimal"
                className={`tnum mt-1 w-[88px] ${cell}`}
              />
            </label>
            <label>
              <span className="block text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
                {t("unit.g")}
              </span>
              <select name="unit" defaultValue="g" className={`mt-1 ${cell}`}>
                {SUPPLEMENT_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unitName(unit, 1)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="block text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
                {t("timing.anytime")}
              </span>
              <select name="timing" defaultValue="anytime" className={`mt-1 ${cell}`}>
                {SUPPLEMENT_TIMINGS.map((timing) => (
                  <option key={timing} value={timing}>
                    {t(`timing.${timing}`)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="block text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
                {t("cat.other")}
              </span>
              <select name="category" defaultValue="other" className={`mt-1 ${cell}`}>
                {SUPPLEMENT_CATEGORIES.map((key) => (
                  <option key={key} value={key}>
                    {t(`cat.${key}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-2 block">
            <span className="block text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
              {t("note")}
            </span>
            <input name="note" className={`mt-1 w-full ${cell}`} />
          </label>

          {/* Macros per unit of the dose — how a whey ends up in the day total. */}
          <div className="mt-2 flex flex-wrap gap-2">
            {(["protein_per_unit", "carbs_per_unit", "fat_per_unit"] as const).map(
              (field, index) => (
                <label key={field}>
                  <span className="block text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
                    {["P", "G", "L"][index]} / {unitName("g", 1)}
                  </span>
                  <input
                    name={field}
                    inputMode="decimal"
                    className={`tnum mt-1 w-[88px] ${cell}`}
                  />
                </label>
              ),
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              className="h-9 rounded-r2 cta px-4 text-[13px] font-semibold text-[var(--on-accent)]"
            >
              {t("save")}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="h-9 rounded-r2 px-3 text-[13px] text-[var(--ink3)]"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      )}

      {shown.length === 0 ? (
        <p className="mt-6 text-[13px] leading-[1.5] text-[var(--ink3)]">
          {query ? t("noMatch", { query }) : t("empty")}
        </p>
      ) : (
        sections.map((section) => (
          <section key={section.title ?? "flat"} className="mt-5">
            {section.title && (
              <h2 className="mb-2 text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
                {t(`cat.${section.title}`)}
              </h2>
            )}
            <ul className="grid gap-2 @2xl:grid-cols-2 @5xl:grid-cols-3">
              {section.rows.map((entry) => {
                const dose = doseLabel(entry, unitName);

                return (
                  <li
                    key={entry.id}
                    className={`glass rounded-r3 p-3 ${
                      // Shown, and visibly not on offer.
                      entry.usable ? "" : "opacity-55"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold">
                          {entry.name}
                        </p>
                        <p className="tnum mt-0.5 text-[12px] text-[var(--ink2)]">
                          {[dose, t(`timing.${entry.timing}`)]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>

                      {entry.usable ? (
                        <span className="shrink-0 rounded-rp border border-[var(--edge)] px-2 py-px text-[10px] uppercase tracking-[.14em] text-[var(--ink3)]">
                          {t(entry.mine ? "mine" : "builtIn")}
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-rp border border-[var(--a3)] px-2 py-px text-[10px] uppercase tracking-[.14em] text-[var(--a3)]">
                          {t("unusable")}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setConfirming(entry.id)}
                        aria-label={t(entry.mine ? "delete" : "hide")}
                        title={t(entry.mine ? "delete" : "hide")}
                        className="shrink-0 rounded-r1 px-1 text-[12px] text-[var(--ink3)] hover:text-[var(--a3)]"
                      >
                        ✕
                      </button>
                    </div>

                    {entry.note && (
                      <p className="mt-1.5 text-[12px] leading-[1.45] text-[var(--ink3)]">
                        {entry.note}
                      </p>
                    )}

                    {!entry.usable && (
                      <p className="mt-1.5 text-[12px] leading-[1.45] text-[var(--a3)]">
                        {t("unusableWhy")}
                      </p>
                    )}

                    {entry.proteinPerUnit !== null && (
                      <p className="tnum mt-1.5 text-[11px] text-[var(--ink3)]">
                        {t("perUnit", {
                          unit: unitName(entry.unit, 1),
                          protein: entry.proteinPerUnit.toLocaleString("fr-FR"),
                        })}
                      </p>
                    )}

                    {confirming === entry.id && (
                      <div className="mt-2 rounded-r2 border border-[var(--a3)] p-2.5">
                        <p className="text-[12px] leading-[1.45] text-[var(--ink2)]">
                          {t(entry.mine ? "deleteBody" : "hideBody", {
                            name: entry.name,
                          })}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <form
                            action={removeSupplement}
                            onSubmit={() => setConfirming(null)}
                          >
                            <input type="hidden" name="supplement_id" value={entry.id} />
                            <input type="hidden" name="mine" value={entry.mine ? "1" : "0"} />
                            <button
                              type="submit"
                              className="h-8 rounded-r2 border border-[var(--a3)] px-2.5 text-[12px] font-semibold text-[var(--a3)]"
                            >
                              {t(entry.mine ? "delete" : "hide")}
                            </button>
                          </form>
                          <button
                            type="button"
                            onClick={() => setConfirming(null)}
                            className="h-8 rounded-r2 px-2.5 text-[12px] text-[var(--ink3)]"
                          >
                            {t("cancel")}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {hidden.length > 0 && (
        <section className="mt-6 border-t border-[var(--hair)] pt-4">
          <h2 className="text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
            {t("hidden", { count: hidden.length })}
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {hidden.map((entry) => (
              <li key={entry.id}>
                <form action={unhideSupplement}>
                  <input type="hidden" name="supplement_id" value={entry.id} />
                  <button
                    type="submit"
                    className="h-8 rounded-rp border border-[var(--edge)] px-3 text-[12px] text-[var(--ink2)] hover:text-[var(--ink)]"
                  >
                    {entry.name} · {t("unhide")}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
