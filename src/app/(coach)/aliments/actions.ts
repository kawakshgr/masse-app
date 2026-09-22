"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { searchOpenFoodFacts, type FoodCandidate } from "@/lib/openFoodFacts";

function num(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").replace(",", ".").trim();
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isNaN(n) || n < 0 ? null : n;
}

/** Protein and carbs at 4 kcal a gram, fat at 9. */
function kcalFromMacros(
  protein: number | null,
  carbs: number | null,
  fat: number | null,
): number | null {
  if (protein === null && carbs === null && fat === null) return null;
  return Math.round((protein ?? 0) * 4 + (carbs ?? 0) * 4 + (fat ?? 0) * 9);
}

export async function addFood(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const name = String(formData.get("name") ?? "").trim();
  if (name === "") return;

  const protein = num(formData.get("protein_100g"));
  const carbs = num(formData.get("carbs_100g"));
  const fat = num(formData.get("fat_100g"));

  await supabase.from("foods").insert({
    coach_id: user.id,
    name,
    brand: String(formData.get("brand") ?? "").trim() || null,
    // Derived, never typed: she would otherwise have two numbers to keep in
    // step. An imported food keeps its label value until she edits it.
    kcal_100g: kcalFromMacros(protein, carbs, fat),
    protein_100g: protein,
    carbs_100g: carbs,
    fat_100g: fat,
  });

  revalidatePath("/aliments");
}

export async function updateFood(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("food_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || name === "") return;

  const protein = num(formData.get("protein_100g"));
  const carbs = num(formData.get("carbs_100g"));
  const fat = num(formData.get("fat_100g"));

  await supabase
    .from("foods")
    .update({
      name,
      brand: String(formData.get("brand") ?? "").trim() || null,
      kcal_100g: kcalFromMacros(protein, carbs, fat),
      protein_100g: protein,
      carbs_100g: carbs,
      fat_100g: fat,
    })
    .eq("id", id);

  revalidatePath("/aliments");
}

/**
 * Meals snapshot their name and macros, so removing a library entry leaves a
 * client's history intact — meals.food_id simply goes null.
 */
export async function deleteFood(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("food_id") ?? "");
  if (!id) return;

  await supabase.from("foods").delete().eq("id", id);
  revalidatePath("/aliments");
}

/** Searches Open Food Facts. Returns candidates; imports nothing by itself. */
export async function searchFoods(term: string): Promise<FoodCandidate[]> {
  return searchOpenFoodFacts(term);
}

/** Copies a candidate into the coach's own library, where she can edit it. */
export async function importFood(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const name = String(formData.get("name") ?? "").trim();
  if (name === "") return;

  await supabase.from("foods").insert({
    coach_id: user.id,
    name,
    brand: String(formData.get("brand") ?? "").trim() || null,
    kcal_100g: num(formData.get("kcal_100g")),
    protein_100g: num(formData.get("protein_100g")),
    carbs_100g: num(formData.get("carbs_100g")),
    fat_100g: num(formData.get("fat_100g")),
  });

  revalidatePath("/aliments");
}
