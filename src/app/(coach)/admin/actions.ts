"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Suspending a coach is an audited act: the reason travels with it into
 * admin_access_log, and the database refuses anything under ten characters.
 */
export async function setCoachSuspended(formData: FormData) {
  const supabase = await createClient();

  const coachId = String(formData.get("coach_id") ?? "");
  const suspend = String(formData.get("suspend") ?? "") === "1";
  const reason = String(formData.get("reason") ?? "");

  if (!coachId || reason.trim().length < 10) return;

  await supabase.rpc("admin_set_coach_suspended", {
    p_coach: coachId,
    p_suspended: suspend,
    p_reason: reason,
  });

  revalidatePath("/admin");
}

export async function allowCoachEmail(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (email === "") return;

  await supabase.from("allowed_coach_emails").insert({
    email,
    note: String(formData.get("note") ?? "").trim() || null,
    added_by: user?.id ?? null,
  });

  revalidatePath("/admin");
}

/**
 * Removing an address stops anyone new signing up with it. A coach who already
 * has an account keeps it — suspend her instead, which is audited.
 */
export async function disallowCoachEmail(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "");
  if (email === "") return;

  await supabase.from("allowed_coach_emails").delete().eq("email", email);
  revalidatePath("/admin");
}

/**
 * The coach's own company. Every field is optional here and none is checked
 * against a registry: it is what she tells us, and her accountant is the one
 * who says whether an invoice built from it is in order.
 */
export async function saveBillingProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const text = (key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    return value === "" ? null : value;
  };
  const num = (key: string, fallback: number) => {
    const n = Number(String(formData.get(key) ?? "").replace(",", ".").trim());
    return Number.isFinite(n) ? n : fallback;
  };

  const regime = String(formData.get("vat_regime") ?? "franchise");

  await supabase.from("coach_billing_profiles").upsert(
    {
      coach_id: user.id,
      legal_name: text("legal_name"),
      legal_form: text("legal_form"),
      address_line1: text("address_line1"),
      address_line2: text("address_line2"),
      postcode: text("postcode"),
      city: text("city"),
      country: text("country") ?? "France",
      siret: text("siret"),
      rcs_city: text("rcs_city"),
      ape_code: text("ape_code"),
      vat_number: text("vat_number"),
      vat_regime: regime === "assujetti" ? "assujetti" : "franchise",
      // A rate is meaningless under the franchise, so it is not kept there.
      vat_rate: regime === "assujetti" ? Math.min(100, Math.max(0, num("vat_rate", 20))) : 0,
      iban: text("iban"),
      bic: text("bic"),
      payment_terms: text("payment_terms"),
      late_penalty: text("late_penalty"),
      recovery_fee_cents: Math.max(0, Math.round(num("recovery_fee", 40) * 100)),
      invoice_prefix: text("invoice_prefix") ?? "F",
      next_invoice_no: Math.max(1, Math.round(num("next_invoice_no", 1))),
      insurance: text("insurance"),
      footer_note: text("footer_note"),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "coach_id" },
  );

  revalidatePath("/admin");
  revalidatePath("/facturation");
}

/** When her clients' weekly check-in is due. Hers to set, for all of them. */
export async function setCheckInDue(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const offset = Number(formData.get("check_in_due_offset"));
  if (!Number.isInteger(offset) || offset < 4 || offset > 10) return;

  await supabase.from("coaches").update({ check_in_due_offset: offset }).eq("id", user.id);

  revalidatePath("/admin");
  revalidatePath("/clients", "layout");
}
