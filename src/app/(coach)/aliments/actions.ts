"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { searchOpenFoodFacts, type FoodCandidate } from "@/lib/openFoodFacts";
import { FOOD_CATEGORIES, type FoodCategory } from "@/lib/supabase/types";

function num(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").replace(",", ".").trim();
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isNaN(n) || n < 0 ? null : n;
}

function text(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim();
  return raw === "" ? null : raw;
}

function category(value: FormDataEntryValue | null): FoodCategory {
  const raw = String(value ?? "");
  return (FOOD_CATEGORIES as readonly string[]).includes(raw)
    ? (raw as FoodCategory)
    : "other";
}

/**
 * Macros only. Calories are a generated column now: the database computes them
 * from the three grams, and there is no way to write a figure that disagrees.
 */
export async function addFood(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const name = String(formData.get("name") ?? "").trim();
  if (name === "") return;

  const { data } = await supabase
    .from("foods")
    .insert({
      coach_id: user.id,
      name,
      brand: text(formData.get("brand")),
      protein_100g: num(formData.get("protein_100g")),
      carbs_100g: num(formData.get("carbs_100g")),
      fat_100g: num(formData.get("fat_100g")),
      serving_label: text(formData.get("serving_label")),
      serving_g: num(formData.get("serving_g")),
      category: category(formData.get("category")),
    })
    .select("id")
    .single();

  revalidatePath("/aliments");
  // Land on the new row: adding something and then having to find it is a
  // second job.
  if (data?.id) redirect(`/aliments?aliment=${data.id}`);
}

export async function updateFood(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("food_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || name === "") return;

  await supabase
    .from("foods")
    .update({
      name,
      brand: text(formData.get("brand")),
      protein_100g: num(formData.get("protein_100g")),
      carbs_100g: num(formData.get("carbs_100g")),
      fat_100g: num(formData.get("fat_100g")),
      serving_label: text(formData.get("serving_label")),
      serving_g: num(formData.get("serving_g")),
      category: category(formData.get("category")),
    })
    .eq("id", id);

  revalidatePath("/aliments");
}

/** A near-copy is faster to correct than a blank row is to fill. */
export async function duplicateFood(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const id = String(formData.get("food_id") ?? "");
  if (!user || !id) return;

  const { data: source } = await supabase
    .from("foods")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!source) return;

  const { data } = await supabase
    .from("foods")
    .insert({
      coach_id: user.id,
      // The unique index is on name plus brand, so a copy needs its own name.
      name: `${source.name} (copie)`,
      brand: source.brand,
      protein_100g: source.protein_100g,
      carbs_100g: source.carbs_100g,
      fat_100g: source.fat_100g,
      serving_label: source.serving_label,
      serving_g: source.serving_g,
      category: source.category,
    })
    .select("id")
    .single();

  revalidatePath("/aliments");
  if (data?.id) redirect(`/aliments?aliment=${data.id}`);
}

/**
 * Meals and plan items snapshot their name and macros, so removing a library
 * entry leaves a client's history intact — their food_id simply goes null.
 */
export async function deleteFood(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("food_id") ?? "");
  if (!id) return;

  await supabase.from("foods").delete().eq("id", id);
  revalidatePath("/aliments");
  redirect("/aliments");
}

/** Searches Open Food Facts. Returns candidates; imports nothing by itself. */
export async function searchFoods(term: string): Promise<FoodCandidate[]> {
  return searchOpenFoodFacts(term);
}

/**
 * Copies a candidate into the coach's own library, where she can edit it. The
 * label's calorie figure is dropped on purpose: it often disagrees with its own
 * macros, and here the macros are the only thing that counts.
 */
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
    brand: text(formData.get("brand")),
    protein_100g: num(formData.get("protein_100g")),
    carbs_100g: num(formData.get("carbs_100g")),
    fat_100g: num(formData.get("fat_100g")),
    serving_label: "100 g",
    serving_g: 100,
  });

  revalidatePath("/aliments");
}
