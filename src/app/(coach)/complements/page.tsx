import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { SupplementLibrary } from "@/components/SupplementLibrary";
import { LibrarySwitch } from "@/components/LibrarySwitch";
import type { SupplementRow } from "@/lib/supabase/types";

/**
 * The supplement library. It sits beside the food library rather than inside it:
 * a food is quantified in grams and carries macros, a supplement is quantified
 * in doses and mostly carries nothing, and one list cannot honestly do both.
 */
export default async function SupplementsPage() {
  const t = await getTranslations("supp");
  const supabase = await createClient();

  const [{ data: rows }, { data: hidden }] = await Promise.all([
    supabase
      .from("supplements")
      .select("*")
      .order("category")
      .order("name"),
    supabase.from("supplement_hidden").select("supplement_id"),
  ]);

  const hiddenIds = new Set((hidden ?? []).map((row) => row.supplement_id));
  const all = (rows ?? []) as SupplementRow[];

  return (
    <div className="@container min-w-0 flex-1 overflow-y-auto p-5">
      <header className="mb-4">
        <LibrarySwitch active="supplements" />
        <h1 className="mt-3 font-display text-[23px] font-extrabold leading-[1.05] tracking-[-.03em]">
          {t("title")}
        </h1>
        <p className="mt-1 max-w-[62ch] text-[13px] leading-[1.5] text-[var(--ink2)]">
          {t("lede")}
        </p>
      </header>

      <SupplementLibrary
        entries={all
          .filter((row) => !hiddenIds.has(row.id))
          .map((row) => ({
            id: row.id,
            name: row.name,
            category: row.category,
            doseMin: row.dose_min === null ? null : Number(row.dose_min),
            doseMax: row.dose_max === null ? null : Number(row.dose_max),
            unit: row.unit,
            timing: row.timing,
            note: row.note,
            proteinPerUnit:
              row.protein_per_unit === null ? null : Number(row.protein_per_unit),
            usable: row.usable,
            mine: row.coach_id !== null,
          }))}
        hidden={all
          .filter((row) => hiddenIds.has(row.id))
          .map((row) => ({ id: row.id, name: row.name }))}
      />
    </div>
  );
}
