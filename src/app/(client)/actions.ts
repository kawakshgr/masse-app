"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";
import type {
  CheckinAdherence,
  CheckinFeel,
  CheckinPain,
} from "@/lib/supabase/types";

function num(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").replace(",", ".").trim();
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

async function signedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/* ---------- today ---------- */

/** One row a day: saving twice corrects rather than duplicates. */
export async function saveDailyMetrics(input: {
  day: string;
  sleepH: number | null;
  sleepQuality: number | null;
  steps: number | null;
}): Promise<{ ok: boolean }> {
  const { supabase, user } = await signedIn();
  if (!user) return { ok: false };

  const { error } = await supabase.from("daily_metrics").upsert(
    {
      client_id: user.id,
      day: input.day,
      sleep_h: input.sleepH,
      sleep_quality: input.sleepQuality,
      steps: input.steps,
    },
    { onConflict: "client_id,day" },
  );

  revalidatePath("/aujourdhui");
  return { ok: !error };
}

/* ---------- check-in ---------- */

/**
 * The row a photo hangs off, made if it is not there yet — she should not have
 * to answer three questions before she is allowed to take a picture.
 */
export async function ensureCheckIn(weekStart: string): Promise<string | null> {
  const { supabase, user } = await signedIn();
  if (!user) return null;

  const { data: existing } = await supabase
    .from("check_ins")
    .select("id")
    .eq("week_start_date", weekStart)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created } = await supabase
    .from("check_ins")
    .insert({ client_id: user.id, week_start_date: weekStart, author: "client" })
    .select("id")
    .single();
  return created?.id ?? null;
}

/** Files hers, or corrects the one she filed. Never as the coach — RLS checks. */
export async function submitCheckIn(input: {
  weekStart: string;
  feel: CheckinFeel | null;
  pain: CheckinPain | null;
  adherence: CheckinAdherence | null;
  bodyweightKg: number | null;
  waistCm: number | null;
  chestCm: number | null;
  hipsCm: number | null;
  thighCm: number | null;
  note: string | null;
}): Promise<{ ok: boolean }> {
  const { supabase, user } = await signedIn();
  if (!user) return { ok: false };

  const { error } = await supabase.from("check_ins").upsert(
    {
      client_id: user.id,
      week_start_date: input.weekStart,
      feel: input.feel,
      pain: input.pain,
      adherence: input.adherence,
      bodyweight_kg: input.bodyweightKg,
      waist_cm: input.waistCm,
      chest_cm: input.chestCm,
      hips_cm: input.hipsCm,
      thigh_cm: input.thighCm,
      note: input.note,
      author: "client",
    },
    { onConflict: "client_id,week_start_date" },
  );

  revalidatePath("/aujourdhui");
  return { ok: !error };
}

/* ---------- cycle ---------- */

/** Dates only. There is no column here that could receive a symptom. */
export async function saveCycleLog(start: string, lengthDays: number) {
  const { supabase, user } = await signedIn();
  if (!user || !start) return;

  await supabase.from("cycle_logs").insert({
    client_id: user.id,
    period_start_date: start,
    cycle_length_days: Math.round(Math.min(60, Math.max(15, lengthDays))),
  });

  revalidatePath("/cycle");
}

/** Her special-category data, and hers to take back: erasure on her own rows. */
export async function deleteCycleLog(id: string) {
  const { supabase, user } = await signedIn();
  if (!user || !id) return;

  await supabase.from("cycle_logs").delete().eq("id", id).eq("client_id", user.id);
  revalidatePath("/cycle");
}

/* ---------- meals ---------- */

export async function logMeal(formData: FormData) {
  const { supabase, user } = await signedIn();
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

  revalidatePath("/nutrition");
}

export async function deleteMeal(formData: FormData) {
  const { supabase, user } = await signedIn();
  if (!user) return;

  const id = String(formData.get("meal_id") ?? "");
  if (!id) return;

  await supabase.from("meals").delete().eq("id", id).eq("client_id", user.id);
  revalidatePath("/nutrition");
}

/* ---------- settings ---------- */

/**
 * Her own details. The database refuses any other column from her
 * (clients_self_update_guard), so this list is a convenience, not the boundary.
 */
export async function saveProfile(input: {
  firstName: string | null;
  name: string;
  phone: string | null;
  birthDate: string | null;
  heightCm: number | null;
  occupation: string | null;
  emergencyContact: string | null;
}): Promise<{ ok: boolean }> {
  const { supabase, user } = await signedIn();
  if (!user || !input.name.trim()) return { ok: false };

  const { error } = await supabase
    .from("clients")
    .update({
      first_name: input.firstName,
      name: input.name.trim(),
      phone: input.phone,
      birth_date: input.birthDate,
      height_cm: input.heightCm,
      occupation: input.occupation,
      emergency_contact: input.emergencyContact,
    })
    .eq("id", user.id);

  revalidatePath("/", "layout");
  return { ok: !error };
}

/** The app's language on this device. A cookie, read by next-intl per request. */
export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

export async function signOut() {
  const { supabase } = await signedIn();
  await supabase.auth.signOut();
  redirect("/connexion");
}
