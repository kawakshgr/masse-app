import type { SupplementCategory, SupplementTiming, SupplementUnit } from "@/lib/supabase/types";

/**
 * A supplement as both the list (server) and the detail pane (client) read it.
 * Plain module on purpose: a helper exported from a "use client" file cannot
 * be called while the server renders.
 */
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
  carbsPerUnit: number | null;
  fatPerUnit: number | null;
  usable: boolean;
  mine: boolean;
};

/** "3 – 5 g", "1 capsule", "1 000 UI" — never a bare number. */
export function doseLabel(
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
