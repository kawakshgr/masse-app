"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  SUPPLEMENT_CATEGORIES,
  SUPPLEMENT_TIMINGS,
  SUPPLEMENT_UNITS,
  type SupplementCategory,
  type SupplementTiming,
  type SupplementUnit,
} from "@/lib/supabase/types";

function num(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function category(value: FormDataEntryValue | null): SupplementCategory {
  const v = String(value ?? "");
  return (SUPPLEMENT_CATEGORIES as string[]).includes(v)
    ? (v as SupplementCategory)
    : "other";
}

function unit(value: FormDataEntryValue | null): SupplementUnit {
  const v = String(value ?? "");
  return (SUPPLEMENT_UNITS as string[]).includes(v)
    ? (v as SupplementUnit)
    : "g";
}

function timing(value: FormDataEntryValue | null): SupplementTiming {
  const v = String(value ?? "");
  return (SUPPLEMENT_TIMINGS as string[]).includes(v)
    ? (v as SupplementTiming)
    : "anytime";
}

/**
 * Her own addition. `usable` is not accepted from the form: a verdict belongs to
 * the built-in list, and what she adds herself is hers to judge.
 */
export async function addSupplement(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const name = String(formData.get("name") ?? "").trim();
  if (name === "") return;

  const min = num(formData.get("dose_min"));
  const max = num(formData.get("dose_max"));

  await supabase.from("supplements").insert({
    coach_id: user.id,
    name,
    category: category(formData.get("category")),
    dose_min: min,
    // A max below the min would fail the check constraint; drop it instead of
    // handing her a database error for a typo.
    dose_max: max !== null && min !== null && max < min ? null : max,
    unit: unit(formData.get("unit")),
    timing: timing(formData.get("timing")),
    note: String(formData.get("note") ?? "").trim() || null,
    protein_per_unit: num(formData.get("protein_per_unit")),
    carbs_per_unit: num(formData.get("carbs_per_unit")),
    fat_per_unit: num(formData.get("fat_per_unit")),
  });

  revalidatePath("/complements");
}

/**
 * Hers is deleted; a built-in is hidden, because it belongs to every coach and
 * one of them must not empty the shelf for the rest.
 */
export async function removeSupplement(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const id = String(formData.get("supplement_id") ?? "");
  if (id === "") return;

  if (String(formData.get("mine") ?? "") === "1") {
    await supabase.from("supplements").delete().eq("id", id);
  } else {
    await supabase
      .from("supplement_hidden")
      .upsert({ coach_id: user.id, supplement_id: id });
  }

  revalidatePath("/complements");
}

export async function unhideSupplement(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("supplement_id") ?? "");
  if (id === "") return;

  await supabase.from("supplement_hidden").delete().eq("supplement_id", id);
  revalidatePath("/complements");
}
