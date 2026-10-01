"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Read, and on to the next (1 Oct 2026). The one just read leaves the run,
 * so the next one is at the same place in it.
 */
export async function readAndNext(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("check_in_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  const at = Math.max(0, Number(formData.get("i") ?? 0) || 0);
  if (id) {
    // The trigger lets a coach change reviewed_at and nothing else.
    await supabase.from("check_ins").update({ reviewed_at: new Date().toISOString() }).eq("id", id);
    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/clients");
  }
  redirect(at > 0 ? `/bilans?i=${at}` : "/bilans");
}
