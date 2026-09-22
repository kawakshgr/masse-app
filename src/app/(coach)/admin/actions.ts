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
