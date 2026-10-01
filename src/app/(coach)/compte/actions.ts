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

  // Mon compte opens one part at a time (1 Oct 2026), so a form carries only
  // its own fields: what it does not carry is left alone, never blanked.
  const part = text(formData, "partie").replace(/[^a-z]/g, "");
  const has = (key: string) => formData.has(key);
  const coach: { first_name?: string | null; name?: string; phone?: string | null; call_link?: string | null } = {};

  if (has("first_name")) {
    const first = text(formData, "first_name");
    const full = [first, text(formData, "last_name")].filter(Boolean).join(" ");
    if (!full) return;
    coach.first_name = first || null;
    coach.name = full;
  }
  if (has("phone")) coach.phone = text(formData, "phone") || null;
  if (has("call_link")) {
    // Her video link, joined to every booked call; only a web address.
    // "zoom.us/j/123" is read as https://zoom.us/j/123.
    const typed = text(formData, "call_link").replace(/^http:\/\//i, "https://");
    const link = typed && !/^https:\/\//i.test(typed) ? `https://${typed}` : typed;
    coach.call_link = /^https:\/\/[^\s.]+\.\S+$/i.test(link) ? link : null;
  }

  const [{ error: coachError }, { error: addressError }] = await Promise.all([
    Object.keys(coach).length > 0
      ? supabase.from("coaches").update(coach).eq("id", user.id)
      : Promise.resolve({ error: null }),
    has("address_line1")
      ? supabase.from("coach_billing_profiles").upsert(
          {
            coach_id: user.id,
            address_line1: text(formData, "address_line1") || null,
            address_line2: text(formData, "address_line2") || null,
            postcode: text(formData, "postcode") || null,
            city: text(formData, "city") || null,
            country: text(formData, "country") || "France",
          },
          { onConflict: "coach_id" },
        )
      : Promise.resolve({ error: null }),
  ]);

  revalidatePath("/", "layout");
  const back = part ? `/compte?partie=${part}&` : "/compte?";
  redirect(`${back}${coachError || addressError ? "erreur=1" : "enregistre=1"}`);
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
  if (!(weekday >= 0 && weekday <= 6) || !(end > start)) redirect("/compte?partie=dispos&creneau=invalide");
  await supabase.from("coach_availability").insert({ coach_id: id, weekday, start_min: start, end_min: end });
  // Re-rendered in place, so the page stays on this section.
  revalidatePath("/compte");
}

export async function removeAvailability(formData: FormData) {
  const { supabase } = await coachId();
  await supabase.from("coach_availability").delete().eq("id", String(formData.get("id")));
  revalidatePath("/compte");
}

/** A day off: no call is offered on it, whatever the windows say. */
export async function addUnavailableDay(formData: FormData) {
  const { supabase, id } = await coachId();
  const day = String(formData.get("day") ?? "");
  if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
  await supabase.from("coach_unavailable_days").upsert({ coach_id: id, day }, { onConflict: "coach_id,day" });
  revalidatePath("/compte");
}

export async function removeUnavailableDay(formData: FormData) {
  const { supabase, id } = await coachId();
  if (!id) return;
  await supabase.from("coach_unavailable_days").delete().eq("coach_id", id).eq("day", String(formData.get("day")));
  revalidatePath("/compte");
}
