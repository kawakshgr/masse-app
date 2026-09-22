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
