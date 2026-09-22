"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { NutritionMode } from "@/lib/supabase/types";

function intOr(value: FormDataEntryValue | null, fallback: number): number {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function num(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").replace(",", ".").trim();
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isNaN(n) || n < 0 ? null : n;
}

/** Macro targets, or the exact meals. Switching keeps the meal times. */
export async function setNutritionMode(formData: FormData) {
  const supabase = await createClient();
  const clientId = String(formData.get("client_id") ?? "");
  const mode = String(formData.get("mode") ?? "");
  if (!clientId || (mode !== "macros" && mode !== "plan")) return;

  await supabase
    .from("clients")
    .update({ nutrition_mode: mode as NutritionMode })
    .eq("id", clientId);

  revalidatePath(`/clients/${clientId}`);
}

export async function saveNutritionTargets(formData: FormData) {
  const supabase = await createClient();
  const clientId = String(formData.get("client_id") ?? "");
  if (!clientId) return;

  await supabase.from("nutrition_targets").upsert(
    {
      client_id: clientId,
      kcal: intOr(formData.get("kcal"), 2000),
      protein_g: intOr(formData.get("protein_g"), 0),
      carbs_g: intOr(formData.get("carbs_g"), 0),
      fat_g: intOr(formData.get("fat_g"), 0),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id" },
  );

  revalidatePath(`/clients/${clientId}`);
}

export async function addPlanMeal(formData: FormData) {
  const supabase = await createClient();
  const clientId = String(formData.get("client_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const at = String(formData.get("at_time") ?? "").trim();
  if (!clientId || name === "" || at === "") return;

  const { count } = await supabase
    .from("plan_meals")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);

  await supabase.from("plan_meals").insert({
    client_id: clientId,
    at_time: at,
    name,
    position: count ?? 0,
  });

  revalidatePath(`/clients/${clientId}`);
}

export async function updatePlanMeal(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("meal_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const at = String(formData.get("at_time") ?? "").trim();
  if (!id || name === "" || at === "") return;

  await supabase.from("plan_meals").update({ name, at_time: at }).eq("id", id);
  revalidatePath(`/clients/${clientId}`);
}

export async function deletePlanMeal(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("meal_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!id) return;

  await supabase.from("plan_meals").delete().eq("id", id);
  revalidatePath(`/clients/${clientId}`);
}

/**
 * Adds an item to a meal. Picking from the library snapshots its macros at the
 * quantity given, so editing the food later cannot rewrite a published plan.
 */
export async function addPlanMealItem(formData: FormData) {
  const supabase = await createClient();
  const mealId = String(formData.get("meal_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  const foodId = String(formData.get("food_id") ?? "") || null;
  const grams = num(formData.get("quantity_g"));
  let name = String(formData.get("name") ?? "").trim();

  if (!mealId) return;

  let kcal: number | null = null;
  let protein: number | null = null;
  let carbs: number | null = null;
  let fat: number | null = null;

  if (foodId) {
    const { data: food } = await supabase
      .from("foods")
      .select("name, kcal_100g, protein_100g, carbs_100g, fat_100g")
      .eq("id", foodId)
      .maybeSingle();

    if (food) {
      if (name === "") name = food.name;
      const factor = grams === null ? null : grams / 100;
      const scale = (per100: number | null) =>
        factor === null || per100 === null
          ? null
          : Number((per100 * factor).toFixed(2));
      kcal = scale(food.kcal_100g);
      protein = scale(food.protein_100g);
      carbs = scale(food.carbs_100g);
      fat = scale(food.fat_100g);
    }
  }

  if (name === "") return;

  const { count } = await supabase
    .from("plan_meal_items")
    .select("id", { count: "exact", head: true })
    .eq("meal_id", mealId);

  await supabase.from("plan_meal_items").insert({
    meal_id: mealId,
    food_id: foodId,
    name,
    quantity_g: grams,
    kcal,
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
    position: count ?? 0,
  });

  revalidatePath(`/clients/${clientId}`);
}

export async function deletePlanMealItem(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("item_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!id) return;

  await supabase.from("plan_meal_items").delete().eq("id", id);
  revalidatePath(`/clients/${clientId}`);
}
