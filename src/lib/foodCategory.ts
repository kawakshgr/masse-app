import type { FoodCategory } from "@/lib/supabase/types";

/**
 * A family guessed from the macros, for a food added or imported without
 * one: where most of its calories come from. Protein wins from a third up,
 * because lean meat, eggs and skyr carry fat too. Vegetables cannot be told
 * from their macros, so they stay hers to set. Always editable after.
 */
export function guessCategory(
  protein: number | null,
  carbs: number | null,
  fat: number | null,
): FoodCategory {
  const p = (protein ?? 0) * 4;
  const c = (carbs ?? 0) * 4;
  const f = (fat ?? 0) * 9;
  const kcal = p + c + f;
  if (kcal < 5) return "other";
  if (p / kcal >= 0.35) return "protein";
  if (f / kcal >= 0.5) return "fat";
  if (c / kcal >= 0.5) return "carb";
  return "other";
}
