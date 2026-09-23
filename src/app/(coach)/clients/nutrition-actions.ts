"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  SUPPLEMENT_TIMINGS,
  SUPPLEMENT_UNITS,
  type NutritionMode,
  type SupplementTiming,
  type SupplementUnit,
} from "@/lib/supabase/types";

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

function dayTypeOf(formData: FormData): string | null {
  const raw = String(formData.get("day_type_id") ?? "").trim();
  return raw === "" ? null : raw;
}

export async function saveNutritionTargets(formData: FormData) {
  const supabase = await createClient();
  const clientId = String(formData.get("client_id") ?? "");
  if (!clientId) return;

  const dayTypeId = dayTypeOf(formData);
  const row = {
    client_id: clientId,
    day_type_id: dayTypeId,
    kcal: intOr(formData.get("kcal"), 2000),
    protein_g: intOr(formData.get("protein_g"), 0),
    carbs_g: intOr(formData.get("carbs_g"), 0),
    fat_g: intOr(formData.get("fat_g"), 0),
    updated_at: new Date().toISOString(),
  };

  // Two partial unique indexes, so the conflict target differs: the default row
  // is the one with a null type, and there is exactly one per day type.
  await supabase
    .from("nutrition_targets")
    .upsert(row, {
      onConflict: dayTypeId === null ? "client_id" : "client_id,day_type_id",
    });

  revalidatePath(`/clients/${clientId}`);
}

export async function addPlanMeal(formData: FormData) {
  const supabase = await createClient();
  const clientId = String(formData.get("client_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const at = String(formData.get("at_time") ?? "").trim();
  if (!clientId || name === "" || at === "") return;

  const dayTypeId = dayTypeOf(formData);
  let counter = supabase
    .from("plan_meals")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);
  counter =
    dayTypeId === null
      ? counter.is("day_type_id", null)
      : counter.eq("day_type_id", dayTypeId);
  const { count } = await counter;

  await supabase.from("plan_meals").insert({
    client_id: clientId,
    day_type_id: dayTypeId,
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

/* ---------- day types ---------- */

/**
 * A kind of day for this client: "Haut du corps", "OFF". Its targets and its
 * meals hang off it, so a client who moves a rest day carries the right plan
 * with them without anybody editing anything.
 */
export async function addDayType(formData: FormData) {
  const supabase = await createClient();
  const clientId = String(formData.get("client_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!clientId || name === "") return;

  const { count } = await supabase
    .from("day_types")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);

  await supabase.from("day_types").insert({
    client_id: clientId,
    name,
    is_rest: String(formData.get("is_rest") ?? "") === "1",
    position: count ?? 0,
  });

  revalidatePath(`/clients/${clientId}`);
}

export async function renameDayType(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("day_type_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || name === "") return;

  await supabase
    .from("day_types")
    .update({ name, is_rest: String(formData.get("is_rest") ?? "") === "1" })
    .eq("id", id);

  revalidatePath(`/clients/${clientId}`);
}

/**
 * Removing a type takes its targets and its meals with it — they describe that
 * day and nothing else. Any weekday pointing at it falls back to the default.
 */
export async function deleteDayType(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("day_type_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!id) return;

  await supabase.from("day_types").delete().eq("id", id);
  revalidatePath(`/clients/${clientId}`);
}

/** Which type a weekday is. Null puts it back on the default. */
export async function setWeekDay(formData: FormData) {
  const supabase = await createClient();
  const clientId = String(formData.get("client_id") ?? "");
  const dayIndex = Number(formData.get("day_index"));
  const raw = String(formData.get("day_type_id") ?? "");
  if (!clientId || !Number.isInteger(dayIndex)) return;

  await supabase.from("client_week_days").upsert(
    {
      client_id: clientId,
      day_index: dayIndex,
      day_type_id: raw === "" ? null : raw,
    },
    { onConflict: "client_id,day_index" },
  );

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/aujourdhui");
}

/**
 * Two days trade places. This is how a rest day moves, and why nutrition is
 * attached to the type rather than the weekday: nothing else has to change.
 */
export async function swapWeekDays(formData: FormData) {
  const supabase = await createClient();
  const clientId = String(formData.get("client_id") ?? "");
  const a = Number(formData.get("day_a"));
  const b = Number(formData.get("day_b"));
  if (!clientId || !Number.isInteger(a) || !Number.isInteger(b) || a === b) return;

  const { data: rows } = await supabase
    .from("client_week_days")
    .select("day_index, day_type_id")
    .eq("client_id", clientId)
    .in("day_index", [a, b]);

  const typeOf = (day: number) =>
    rows?.find((row) => row.day_index === day)?.day_type_id ?? null;

  await supabase.from("client_week_days").upsert(
    [
      { client_id: clientId, day_index: a, day_type_id: typeOf(b) },
      { client_id: clientId, day_index: b, day_type_id: typeOf(a) },
    ],
    { onConflict: "client_id,day_index" },
  );

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/aujourdhui");
}

function unitOf(
  value: FormDataEntryValue | null,
  fallback: SupplementUnit,
): SupplementUnit {
  const v = String(value ?? "");
  return (SUPPLEMENT_UNITS as string[]).includes(v)
    ? (v as SupplementUnit)
    : fallback;
}

function timingOf(
  value: FormDataEntryValue | null,
  fallback: SupplementTiming,
): SupplementTiming {
  const v = String(value ?? "");
  return (SUPPLEMENT_TIMINGS as string[]).includes(v)
    ? (v as SupplementTiming)
    : fallback;
}

/**
 * What a dose contributes, when we can honestly say.
 *
 * The library knows a density per unit of its own unit — per gram for a powder.
 * Ask for the same product in capsules and that density no longer applies: we do
 * not know what a capsule of it weighs. Returning nulls there is the honest
 * answer; scaling the grams figure onto capsules would put invented protein in
 * the day total.
 */
function macrosFor(
  entry: {
    unit: string;
    protein_per_unit: number | null;
    carbs_per_unit: number | null;
    fat_per_unit: number | null;
  },
  unit: SupplementUnit,
  dose: number | null,
) {
  if (dose === null || entry.unit !== unit) {
    return { protein_g: null, carbs_g: null, fat_g: null };
  }
  const per = (value: number | null) =>
    value === null ? null : Number((Number(value) * dose).toFixed(2));

  return {
    protein_g: per(entry.protein_per_unit),
    carbs_g: per(entry.carbs_per_unit),
    fat_g: per(entry.fat_per_unit),
  };
}

/**
 * A supplement joins this client's protocol. The dose, the unit, the moment and
 * the days are all hers to set — the library only supplies the defaults, because
 * nobody takes the same things on a leg day and a rest day.
 *
 * An entry marked unusable is refused here and not only in the UI: the database
 * cannot express the rule without a subquery in a check, and a rule enforced
 * only in a component is not a rule.
 */
export async function addClientSupplement(formData: FormData) {
  const supabase = await createClient();
  const clientId = String(formData.get("client_id") ?? "");
  const supplementId = String(formData.get("supplement_id") ?? "");
  if (!clientId || !supplementId) return;

  const { data: entry } = await supabase
    .from("supplements")
    .select(
      "id, name, unit, timing, usable, dose_min, protein_per_unit, carbs_per_unit, fat_per_unit",
    )
    .eq("id", supplementId)
    .maybeSingle();

  if (!entry || !entry.usable) return;

  const dose =
    num(formData.get("dose")) ??
    (entry.dose_min === null ? null : Number(entry.dose_min));
  const unit = unitOf(formData.get("unit"), entry.unit);
  const rawType = String(formData.get("day_type_id") ?? "");

  const { data: last } = await supabase
    .from("client_supplements")
    .select("position")
    .eq("client_id", clientId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("client_supplements").insert({
    client_id: clientId,
    supplement_id: entry.id,
    name: entry.name,
    dose,
    unit,
    timing: timingOf(formData.get("timing"), entry.timing),
    day_type_id: rawType === "" ? null : rawType,
    position: (last?.position ?? -1) + 1,
    ...macrosFor(entry, unit, dose),
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/aujourdhui");
}

/** Dose, unit, moment or days — and the macros follow whatever changed. */
export async function updateClientSupplement(formData: FormData) {
  const supabase = await createClient();
  const clientId = String(formData.get("client_id") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!clientId || !id) return;

  const { data: row } = await supabase
    .from("client_supplements")
    .select("unit, timing, supplement_id")
    .eq("id", id)
    .maybeSingle();

  if (!row) return;

  const dose = num(formData.get("dose"));
  const unit = unitOf(formData.get("unit"), row.unit);
  const rawType = String(formData.get("day_type_id") ?? "");

  const patch: {
    dose: number | null;
    unit: SupplementUnit;
    timing: SupplementTiming;
    day_type_id: string | null;
    protein_g?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
  } = {
    dose,
    unit,
    timing: timingOf(formData.get("timing"), row.timing),
    day_type_id: rawType === "" ? null : rawType,
  };

  // Recomputed from the library entry rather than scaled from the stored
  // figures: scaling would compound its own rounding on every nudge, and it
  // would survive a unit change that invalidates it.
  if (row.supplement_id) {
    const { data: entry } = await supabase
      .from("supplements")
      .select("unit, protein_per_unit, carbs_per_unit, fat_per_unit")
      .eq("id", row.supplement_id)
      .maybeSingle();

    if (entry) Object.assign(patch, macrosFor(entry, unit, dose));
  }

  await supabase.from("client_supplements").update(patch).eq("id", id);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/aujourdhui");
}

export async function deleteClientSupplement(formData: FormData) {
  const supabase = await createClient();
  const clientId = String(formData.get("client_id") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!clientId || !id) return;

  await supabase.from("client_supplements").delete().eq("id", id);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/aujourdhui");
}
