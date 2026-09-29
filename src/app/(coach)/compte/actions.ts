"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

/**
 * Her own details. Name and phone live on her coach row — the trigger
 * `coaches_self_update_guard` allows those and nothing else. The address is
 * the one her invoices print, so it is written to her billing profile rather
 * than kept twice.
 */
export async function saveAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const first = text(formData, "first_name");
  const last = text(formData, "last_name");
  const full = [first, last].filter(Boolean).join(" ");
  if (!full) return;
  // Her video link, joined to every booked call; only a web address.
  // "zoom.us/j/123" is read as https://zoom.us/j/123.
  const typed = text(formData, "call_link").replace(/^http:\/\//i, "https://");
  const link = typed && !/^https:\/\//i.test(typed) ? `https://${typed}` : typed;
  const callLink = /^https:\/\/[^\s.]+\.\S+$/i.test(link) ? link : null;

  const [{ error: coachError }, { error: addressError }] = await Promise.all([
    supabase
      .from("coaches")
      .update({ first_name: first || null, name: full, phone: text(formData, "phone") || null, call_link: callLink })
      .eq("id", user.id),
    supabase.from("coach_billing_profiles").upsert(
      {
        coach_id: user.id,
        address_line1: text(formData, "address_line1") || null,
        address_line2: text(formData, "address_line2") || null,
        postcode: text(formData, "postcode") || null,
        city: text(formData, "city") || null,
        country: text(formData, "country") || "France",
      },
      { onConflict: "coach_id" },
    ),
  ]);

  revalidatePath("/", "layout");
  redirect(coachError || addressError ? "/compte?erreur=1" : "/compte?enregistre=1");
}

/* ---------- video calls ---------- */

async function coachId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, id: user?.id ?? null };
}

/** A weekly window she takes calls in, in half hours; Monday = 0. */
export async function addAvailability(formData: FormData) {
  const { supabase, id } = await coachId();
  if (!id) return;
  const weekday = Number(formData.get("weekday"));
  const start = Number(formData.get("start"));
  const end = Number(formData.get("end"));
  if (!(weekday >= 0 && weekday <= 6) || !(end > start)) redirect("/compte?creneau=invalide#visio");
  await supabase.from("coach_availability").insert({ coach_id: id, weekday, start_min: start, end_min: end });
  revalidatePath("/compte");
  redirect("/compte#visio");
}

export async function removeAvailability(formData: FormData) {
  const { supabase } = await coachId();
  await supabase.from("coach_availability").delete().eq("id", String(formData.get("id")));
  revalidatePath("/compte");
  redirect("/compte#visio");
}

/** A day off: no call is offered on it, whatever the windows say. */
export async function addUnavailableDay(formData: FormData) {
  const { supabase, id } = await coachId();
  const day = String(formData.get("day") ?? "");
  if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
  await supabase.from("coach_unavailable_days").upsert({ coach_id: id, day }, { onConflict: "coach_id,day" });
  revalidatePath("/compte");
  redirect("/compte#visio");
}

export async function removeUnavailableDay(formData: FormData) {
  const { supabase, id } = await coachId();
  if (!id) return;
  await supabase.from("coach_unavailable_days").delete().eq("coach_id", id).eq("day", String(formData.get("day")));
  revalidatePath("/compte");
  redirect("/compte#visio");
}
