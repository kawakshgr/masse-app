"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { addFood } from "@/app/(coach)/aliments/actions";

const cell =
  "h-8 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink3)]";

/**
 * Macros in, calories out. The prototype is explicit that calories are never
 * typed twice, so the figure here is computed as she types and sent derived.
 */
export function FoodForm() {
  const t = useTranslations("foods");
  const t2 = useTranslations("foods2");

  const [macros, setMacros] = useState({ protein: "", carbs: "", fat: "" });

  const value = (raw: string) => {
    const n = Number(raw.replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  const kcal = Math.round(
    value(macros.protein) * 4 + value(macros.carbs) * 4 + value(macros.fat) * 9,
  );

  return (
    <form action={addFood} className="flex flex-wrap items-end gap-2">
      <label className="block min-w-[160px] flex-1">
        <span className="block text-[11px] text-[var(--ink2)]">{t("name")}</span>
        <input name="name" required className={`mt-1 ${cell}`} />
      </label>

      <label className="block w-[120px]">
        <span className="block text-[11px] text-[var(--ink2)]">{t("brand")}</span>
        <input name="brand" className={`mt-1 ${cell}`} />
      </label>

      {(
        [
          ["protein_100g", t("protein"), "protein"],
          ["carbs_100g", t("carbs"), "carbs"],
          ["fat_100g", t("fat"), "fat"],
        ] as const
      ).map(([field, label, key]) => (
        <label key={field} className="block w-[78px]">
          <span className="block text-[11px] text-[var(--ink2)]">{label}</span>
          <input
            name={field}
            inputMode="decimal"
            value={macros[key]}
            onChange={(event) =>
              setMacros((m) => ({ ...m, [key]: event.target.value }))
            }
            className={`tnum mt-1 ${cell}`}
          />
        </label>
      ))}

      <div className="w-[96px]">
        <span className="block text-[11px] text-[var(--ink2)]">{t("kcal")}</span>
        <p className="tnum mt-1 flex h-8 items-center justify-center rounded-r2 border border-dashed border-[var(--edge)] text-[13px] font-semibold text-[var(--ink2)]">
          {kcal}
        </p>
      </div>

      <button
        type="submit"
        className="h-8 shrink-0 rounded-r2 cta px-4 text-[13px] font-semibold text-[var(--on-accent)]"
      >
        {t("add")}
      </button>

      <p className="w-full text-[11px] text-[var(--ink3)]">{t2("derived")}</p>
    </form>
  );
}
