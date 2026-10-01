"use server";

import { removeCheckInPhotos } from "@/lib/erase";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { isFiled } from "@/lib/checkIns";
import { pushAdmin, pushReady, pushTo } from "@/lib/push";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { clientSession } from "@/lib/clientData";
import { plannedDays } from "@/lib/dayMoves";
import type {
  CheckinAdherence,
  CheckinFeel,
  CheckinPain,
  PainLevel,
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

  // Was it already filed? The coach hears of a check-in once, when it
  // first holds something — not at every correction.
  const { data: before } = await supabase
    .from("check_ins")
    .select("feel, pain, adherence, bodyweight_kg, note, waist_cm, chest_cm, hips_cm, thigh_cm, check_in_photos(id)")
    .eq("client_id", user.id)
    .eq("week_start_date", input.weekStart)
    .maybeSingle();
  const filedBefore = before ? isFiled(before, before.check_in_photos?.length ?? 0) : false;

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

  const filedNow = isFiled(
    {
      feel: input.feel,
      pain: input.pain,
      adherence: input.adherence,
      bodyweight_kg: input.bodyweightKg,
      note: input.note,
      waist_cm: input.waistCm,
      chest_cm: input.chestCm,
      hips_cm: input.hipsCm,
      thigh_cm: input.thighCm,
    },
    before?.check_in_photos?.length ?? 0,
  );
  if (!error && !filedBefore && filedNow) {
    after(() => tellCoach(user.id, (first) => (t) => ({
      title: t("filedTitle"),
      body: t("filedBody", { first }),
      url: `/clients/${user.id}?onglet=checkins`,
      tag: `checkin-${user.id}`,
    })));
  }

  revalidatePath("/aujourdhui");
  return { ok: !error };
}

/** A notification to the client's coach, on her phones (lib/push.ts). */
async function tellCoach(
  clientId: string,
  compose: (first: string) => Parameters<typeof pushTo>[1],
) {
  if (!pushReady()) return;
  const { data: row } = await pushAdmin()
    .from("clients")
    .select("coach_id, first_name, name")
    .eq("id", clientId)
    .maybeSingle();
  if (!row?.coach_id) return;
  await pushTo([row.coach_id], compose(row.first_name ?? row.name.split(/\s+/)[0] ?? row.name));
}

/* ---------- pain ---------- */

/**
 * Pain on an exercise, sent to the coach at once. Health data: RLS refuses it
 * without the client's consent, and withdrawing consent erases it.
 */
export async function reportPain(input: {
  sessionExerciseId: string;
  exerciseName: string;
  level: PainLevel;
  note: string;
}): Promise<{ ok: boolean }> {
  const { supabase, user } = await signedIn();
  if (!user || !["mild", "sharp", "stopped"].includes(input.level)) return { ok: false };
  const { error } = await supabase.from("pain_reports").insert({
    client_id: user.id,
    session_exercise_id: input.sessionExerciseId,
    exercise_name: input.exerciseName.slice(0, 200),
    level: input.level,
    note: input.note.trim().slice(0, 500) || null,
  });
  if (!error) {
    after(() => tellCoach(user.id, (first) => (t) => ({
      title: t("painTitle"),
      body: t("painBody", { first, exercise: input.exerciseName.slice(0, 80) }),
      url: `/clients/${user.id}`,
      tag: `pain-${user.id}`,
    })));
  }
  return { ok: !error };
}

/* ---------- the week, rearranged ---------- */

/**
 * Two weekdays trade places, for this week: the session and the day type —
 * so the food — go together, because both are read through the same plan
 * (lib/dayMoves.ts). Nothing of the coach's is rewritten.
 */
export async function moveDay(a: number, b: number): Promise<{ ok: boolean }> {
  const inWeek = (n: number) => Number.isInteger(n) && n >= 0 && n <= 6;
  if (!inWeek(a) || !inWeek(b) || a === b) return { ok: false };
  const { supabase, client, monday } = await clientSession();

  const { data } = await supabase
    .from("client_day_moves")
    .select("day_index, planned_day")
    .eq("client_id", client.id)
    .eq("week_start", monday);
  const plan = plannedDays(data);

  const { error } = await supabase.from("client_day_moves").upsert(
    [
      { client_id: client.id, week_start: monday, day_index: a, planned_day: plan[b] },
      { client_id: client.id, week_start: monday, day_index: b, planned_day: plan[a] },
    ],
    { onConflict: "client_id,week_start,day_index" },
  );
  // Weeks that are over say nothing any more: nothing is kept of them.
  await supabase.from("client_day_moves").delete().eq("client_id", client.id).lt("week_start", monday);

  revalidatePath("/", "layout");
  return { ok: !error };
}

/** From another day's session: "I am doing this one today". */
export async function swapWithToday(formData: FormData) {
  const { weekday } = await clientSession();
  await moveDay(weekday, Number(formData.get("day")));
  redirect("/seance");
}

/** The week as the coach planned it again. */
export async function resetWeek() {
  const { supabase, client, monday } = await clientSession();
  await supabase.from("client_day_moves").delete().eq("client_id", client.id).eq("week_start", monday);
  revalidatePath("/", "layout");
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

/* ---------- their data (GDPR) ---------- */

/**
 * Erases the account for good: photos from storage first — SQL cannot —
 * then everything else in one database call. Invoices stay, under the name
 * they were issued to: the law keeps them ten years.
 */
export async function deleteMyAccount(confirmation: string) {
  const { supabase, user } = await signedIn();
  if (!user || confirmation.trim().toUpperCase() !== "SUPPRIMER") return { ok: false as const };

  await removeCheckInPhotos(supabase, user.id);
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { ok: false as const };

  await supabase.auth.signOut();
  redirect("/connexion?compte=supprime");
}

/**
 * A pending client changes their mind before the coach has answered: the
 * request and the account go at once. Only while pending — an accepted
 * client deletes the account from settings, with the typed confirmation.
 */
export async function cancelMyRequest() {
  const { supabase, user } = await signedIn();
  if (!user) return { ok: false as const };
  const { data: client } = await supabase.from("clients").select("status").eq("id", user.id).maybeSingle();
  if (client?.status !== "pending") return { ok: false as const };

  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { ok: false as const };
  await supabase.auth.signOut();
  redirect("/connexion?compte=supprime");
}

/** Withdraws consent to health data; injuries, cycle dates and sleep go. */
export async function withdrawHealthConsent() {
  const { supabase } = await signedIn();
  await supabase.rpc("withdraw_health_consent");
  revalidatePath("/", "layout");
}

export async function giveHealthConsent() {
  const { supabase } = await signedIn();
  await supabase.rpc("give_health_consent");
  revalidatePath("/", "layout");
}
