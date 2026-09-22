"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  CheckinAdherence,
  CheckinFeel,
  CheckinPain,
  ClientGoal,
} from "@/lib/supabase/types";

function num(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").replace(",", ".").trim();
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

/**
 * v1: the coach writes the check-in. Only `author` changes when the client
 * starts submitting them herself, so nothing here has to move.
 */
export async function saveCheckIn(formData: FormData) {
  const supabase = await createClient();

  const clientId = String(formData.get("client_id") ?? "");
  const weekStart = String(formData.get("week_start_date") ?? "");
  if (!clientId || !weekStart) return;

  const pick = <T extends string>(key: string): T | null => {
    const v = String(formData.get(key) ?? "");
    return v === "" ? null : (v as T);
  };

  await supabase.from("check_ins").upsert(
    {
      client_id: clientId,
      week_start_date: weekStart,
      feel: pick<CheckinFeel>("feel"),
      pain: pick<CheckinPain>("pain"),
      adherence: pick<CheckinAdherence>("adherence"),
      bodyweight_kg: num(formData.get("bodyweight_kg")),
      note: String(formData.get("note") ?? "").trim() || null,
      author: "coach",
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "client_id,week_start_date" },
  );

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}

export async function markCheckInReviewed(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("check_in_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!id) return;

  await supabase
    .from("check_ins")
    .update({ reviewed_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}

/** The record as typed, edited in place. */
export async function updateClientRecord(formData: FormData) {
  const supabase = await createClient();
  const clientId = String(formData.get("client_id") ?? "");
  if (!clientId) return;

  const lines = (key: string) =>
    String(formData.get(key) ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

  const days = String(formData.get("session_days") ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);

  const goal = String(formData.get("goal") ?? "");

  await supabase
    .from("clients")
    .update({
      name: String(formData.get("name") ?? "").trim() || undefined,
      goal: goal === "" ? null : (goal as ClientGoal),
      height_cm: num(formData.get("height_cm")),
      sleep_target_h: num(formData.get("sleep_target_h")),
      injuries: lines("injuries"),
      equipment: lines("equipment"),
      session_days: days,
      cycle_tracking: formData.get("cycle_tracking") === "on",
    })
    .eq("id", clientId);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}

/**
 * Destructive and irreversible, so it asks the coach to type the client's
 * first name. A single mis-click cannot reach it.
 */
export async function removeClient(formData: FormData) {
  const supabase = await createClient();

  const clientId = String(formData.get("client_id") ?? "");
  const typed = String(formData.get("confirm") ?? "").trim().toLowerCase();
  const expected = String(formData.get("expected") ?? "").trim().toLowerCase();

  if (!clientId || typed.length === 0 || typed !== expected) {
    redirect(`/clients/${clientId}?retrait=confirmation`);
  }

  await supabase.from("clients").delete().eq("id", clientId);

  revalidatePath("/clients");
  redirect("/clients");
}

/** 'CORDEIRO-4K2P' — readable aloud over WhatsApp, which is how it travels. */
function generateCode(coachName: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
  const stem =
    (coachName.split(/\s+/).pop() ?? "MASSE")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[^A-Z]/g, "")
      .slice(0, 8) || "MASSE";
  let tail = "";
  for (let i = 0; i < 4; i += 1) {
    tail += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${stem}-${tail}`;
}

export type CreatedInvite = { code: string; expiresAt: string };

/**
 * Returns the code rather than just writing it: a code the coach never sees is
 * a code she cannot send.
 */
export async function createInvite(askCycle: boolean): Promise<CreatedInvite | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: coach } = await supabase
    .from("coaches")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  // Codes are unique; retry a few times before giving up on a collision.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCode(coach?.name ?? "Masse");
    const { data, error } = await supabase
      .from("invite_codes")
      .insert({ coach_id: user.id, code, ask_cycle: askCycle })
      .select("code, expires_at")
      .single();

    if (!error && data) {
      revalidatePath("/clients");
      return { code: data.code, expiresAt: data.expires_at };
    }
    if (error && error.code !== "23505") return null;
  }

  return null;
}

export async function revokeInvite(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("invite_id") ?? "");
  if (!id) return;

  await supabase.from("invite_codes").update({ state: "revoked" }).eq("id", id);
  revalidatePath("/clients");
}

export async function deleteCheckIn(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("check_in_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!id) return;

  await supabase.from("check_ins").delete().eq("id", id);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}

/** Records a photo that the browser already put in the private bucket. */
export async function attachCheckInPhoto(
  checkInId: string,
  clientId: string,
  storagePath: string,
) {
  const supabase = await createClient();
  if (!checkInId || !clientId || !storagePath) return;

  await supabase.from("check_in_photos").insert({
    check_in_id: checkInId,
    client_id: clientId,
    storage_path: storagePath,
  });

  revalidatePath(`/clients/${clientId}`);
}

/** Removes the row and the file; a dangling object is still a stored photo. */
export async function deleteCheckInPhoto(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("photo_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!id) return;

  const { data: photo } = await supabase
    .from("check_in_photos")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  await supabase.from("check_in_photos").delete().eq("id", id);

  if (photo?.storage_path) {
    await supabase.storage.from("check-in-photos").remove([photo.storage_path]);
  }

  revalidatePath(`/clients/${clientId}`);
}
