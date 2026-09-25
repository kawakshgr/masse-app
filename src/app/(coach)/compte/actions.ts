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

  const [{ error: coachError }, { error: addressError }] = await Promise.all([
    supabase
      .from("coaches")
      .update({ first_name: first || null, name: full, phone: text(formData, "phone") || null })
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
