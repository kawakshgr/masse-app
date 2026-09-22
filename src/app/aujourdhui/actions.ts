"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function num(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").replace(",", ".").trim();
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

/** Manual entry in v1. No Apple Health, no Health Connect. */
export async function saveDailyMetrics(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const day = String(formData.get("day") ?? "") || new Date().toISOString().slice(0, 10);
  const quality = num(formData.get("sleep_quality"));

  await supabase.from("daily_metrics").upsert(
    {
      client_id: user.id,
      day,
      sleep_h: num(formData.get("sleep_h")),
      sleep_quality: quality === null ? null : Math.round(quality),
      steps: num(formData.get("steps")),
    },
    { onConflict: "client_id,day" },
  );

  revalidatePath("/aujourdhui");
}

/**
 * Dates only. The form has a symptom field, but it never reaches this action —
 * it stays in the browser. There is no column here that could receive it.
 */
export async function saveCycleLog(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const start = String(formData.get("period_start_date") ?? "");
  if (!start) return;

  const length = num(formData.get("cycle_length_days"));

  await supabase.from("cycle_logs").insert({
    client_id: user.id,
    period_start_date: start,
    cycle_length_days: length === null ? 28 : Math.round(length),
  });

  revalidatePath("/aujourdhui");
}

/**
 * Her cycle data is special-category and hers. Being able to take it back is
 * not a nicety — it is the erasure right on the row she created.
 */
export async function deleteCycleLog(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const id = String(formData.get("cycle_log_id") ?? "");
  if (!id) return;

  // RLS already scopes this to her own rows; the filter states the intent.
  await supabase.from("cycle_logs").delete().eq("id", id).eq("client_id", user.id);
  revalidatePath("/aujourdhui");
}

/** A mistyped set has to be removable, or the log stops being trustworthy. */
export async function deleteSetLog(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const id = String(formData.get("set_log_id") ?? "");
  if (!id) return;

  await supabase.from("set_logs").delete().eq("id", id).eq("client_id", user.id);
  revalidatePath("/aujourdhui");
}

/* ---------- meals ---------- */

export async function logMeal(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const foodId = String(formData.get("food_id") ?? "") || null;
  const grams = num(formData.get("quantity_g"));
  let name = String(formData.get("name") ?? "").trim();

  let kcal = null as number | null;
  let protein = null as number | null;
  let carbs = null as number | null;
  let fat = null as number | null;

  if (foodId) {
    const { data: food } = await supabase
      .from("foods")
      .select("name, kcal_100g, protein_100g, carbs_100g, fat_100g")
      .eq("id", foodId)
      .maybeSingle();

    if (food) {
      // Snapshot the name and the scaled macros: deleting the library entry
      // later must not rewrite what she ate.
      if (name === "") name = food.name;
      const factor = grams === null ? null : grams / 100;
      const scale = (per100: number | null) =>
        factor === null || per100 === null ? null : Number((per100 * factor).toFixed(2));
      kcal = scale(food.kcal_100g);
      protein = scale(food.protein_100g);
      carbs = scale(food.carbs_100g);
      fat = scale(food.fat_100g);
    }
  }

  if (name === "") return;

  await supabase.from("meals").insert({
    client_id: user.id,
    day: String(formData.get("day") ?? "") || new Date().toISOString().slice(0, 10),
    slot: String(formData.get("slot") ?? "").trim() || null,
    food_id: foodId,
    name,
    quantity_g: grams,
    kcal,
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
  });

  revalidatePath("/aujourdhui");
}

export async function deleteMeal(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const id = String(formData.get("meal_id") ?? "");
  if (!id) return;

  await supabase.from("meals").delete().eq("id", id).eq("client_id", user.id);
  revalidatePath("/aujourdhui");
}
