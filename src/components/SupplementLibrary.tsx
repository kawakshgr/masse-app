"use client";

import { SectionTitle } from "@/components/Pane";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { SupplementUnit } from "@/lib/supabase/types";
import { doseLabel, type LibraryEntry } from "@/lib/supplementEntry";
import { removeSupplement } from "@/app/(coach)/complements/actions";

/** A label and its value, on the same row the food sheet uses. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass2 flex items-center gap-2.5 rounded-r2 p-2.5">
      <span className="min-w-0 flex-1 text-[12.5px] leading-[1.35] text-[var(--ink2)]">
        {label}
      </span>
      <span className="tnum shrink-0 text-[13px] font-bold">{value}</span>
    </div>
  );
}

/**
 * One supplement, read in the detail pane — the same header, sections and rows
 * as a food, so moving between the two libraries changes only what is said.
 * Hers can be deleted; a built-in is hidden instead.
 */
export function SupplementDetail({ entry }: { entry: LibraryEntry }) {
  const t = useTranslations("supp");
  const tf = useTranslations("foods");
  const [confirming, setConfirming] = useState(false);

  const unitName = (unit: SupplementUnit, count: number) => t(`unit.${unit}`, { count });
  const dose = doseLabel(entry, unitName);
  const macros = [
    { label: tf("protein"), value: entry.proteinPerUnit },
    { label: tf("carbs"), value: entry.carbsPerUnit },
    { label: tf("fat"), value: entry.fatPerUnit },
  ].filter((macro) => macro.value !== null);

  return (
    <div className="min-w-0 flex-1 overflow-y-auto p-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="truncate py-1 font-display text-[28px] font-extrabold uppercase leading-none tracking-[-.01em]">
            {entry.name}
          </h1>
          <p className="tnum mt-1 pl-0.5 text-[13px] text-[var(--ink2)]">
            {[dose, t(`timing.${entry.timing}`)].filter(Boolean).join(" · ")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="glass2 h-10 shrink-0 rounded-r2 px-3.5 text-[13px] font-semibold text-[var(--ink2)] hover:text-[var(--a3)]"
        >
          {t(entry.mine ? "delete" : "hide")}
        </button>
      </header>

      {confirming && (
        <div role="alertdialog" className="mt-3 rounded-r2 border border-[var(--a3)] p-3">
          <p className="text-[13px] leading-[1.5] text-[var(--ink2)]">
            {t(entry.mine ? "deleteBody" : "hideBody", { name: entry.name })}
          </p>
          <div className="mt-3 flex gap-2">
            <form action={removeSupplement}>
              <input type="hidden" name="supplement_id" value={entry.id} />
              <input type="hidden" name="mine" value={entry.mine ? "1" : "0"} />
              <button
                type="submit"
                className="h-9 rounded-r2 border border-[var(--a3)] px-3 text-[13px] font-semibold text-[var(--a3)]"
              >
                {t(entry.mine ? "delete" : "hide")}
              </button>
            </form>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="h-9 rounded-r2 px-3 text-[13px] text-[var(--ink3)]"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(268px,1fr))] items-start gap-3">
        <section className="glass flex flex-col gap-2.5 rounded-r3 p-4">
          <SectionTitle icon="scale">{t("dose")}</SectionTitle>
          <Row label={t("dose")} value={dose ?? t("doseNone")} />
          <Row label={t("timingLabel")} value={t(`timing.${entry.timing}`)} />
          <Row label={t("category")} value={t(`cat.${entry.category}`)} />
          <Row label={t("origin")} value={t(entry.mine ? "mine" : "builtIn")} />
        </section>

        <section className="glass flex flex-col gap-2.5 rounded-r3 p-4">
          <SectionTitle icon="note">{t("note")}</SectionTitle>
          <p className="text-[13px] leading-[1.5] text-[var(--ink2)]">
            {entry.note ?? t("noNote")}
          </p>
          {!entry.usable && (
            <p className="rounded-r2 border border-[var(--a3)] p-2.5 text-[12.5px] leading-[1.45] text-[var(--a3)]">
              <span className="block text-[11px] font-semibold uppercase tracking-[.14em]">
                {t("unusable")}
              </span>
              {t("unusableWhy")}
            </p>
          )}
        </section>

        <section className="glass flex flex-col gap-2.5 rounded-r3 p-4">
          <SectionTitle icon="foods">{t("macrosPerUnit")}</SectionTitle>
          {macros.length === 0 ? (
            <p className="text-[13px] leading-[1.5] text-[var(--ink3)]">{t("noMacros")}</p>
          ) : (
            macros.map((macro) => (
              <Row
                key={macro.label}
                label={t("perUnitOf", { macro: macro.label })}
                value={`${macro.value!.toLocaleString("fr-FR")} g`}
              />
            ))
          )}
        </section>
      </div>
    </div>
  );
}
