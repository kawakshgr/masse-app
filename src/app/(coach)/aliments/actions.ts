"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function num(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").replace(",", ".").trim();
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isNaN(n) || n < 0 ? null : n;
}

export async function addFood(formData: FormData) {
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

export async function updateFood(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("food_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || name === "") return;

  await supabase
    .from("foods")
    .update({
      name,
      brand: String(formData.get("brand") ?? "").trim() || null,
      kcal_100g: num(formData.get("kcal_100g")),
      protein_100g: num(formData.get("protein_100g")),
      carbs_100g: num(formData.get("carbs_100g")),
      fat_100g: num(formData.get("fat_100g")),
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
