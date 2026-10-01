"use server";

import { removeCheckInPhotos } from "@/lib/erase";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { pushTo } from "@/lib/push";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CALL_MINUTES, type CallMinutes } from "@/lib/supabase/types";
import type {
  ClientGoal,
  CyclePhase,
} from "@/lib/supabase/types";
import { addDays } from "@/lib/clientData";
import type { WeekFigures } from "@/lib/checkInSummary";

function num(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").replace(",", ".").trim();
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

/**
 * The coach asks for a check-in that has not come. Recorded, so her app can
 * show it on Today and the coach can see when she last asked.
 */
export async function recordCheckInReminder(clientId: string, weekStart: string) {
  const supabase = await createClient();
  if (!clientId || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return;

  await supabase.from("check_in_reminders").upsert(
    { client_id: clientId, week_start_date: weekStart, sent_at: new Date().toISOString() },
    { onConflict: "client_id,week_start_date" },
  );

  // And on her phone, if she said yes to notifications.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: coach } = await supabase
    .from("coaches")
    .select("first_name, name")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  const coachName = coach?.first_name ?? coach?.name ?? "";
  after(() =>
    pushTo([clientId], (t) => ({
      title: t("nudgeTitle"),
      body: t("nudgeBody", { coach: coachName }),
      url: "/aujourdhui",
      tag: "check-in-nudge",
    })),
  );

  revalidatePath(`/clients/${clientId}`);
}

/**
 * What the week of a check-in held beyond the check-in itself — sessions
 * logged, sleep, steps — for the summary the coach sends on WhatsApp. Read
 * when she asks for it, for that one week; RLS shows only her own clients.
 */
export async function checkInWeekFigures(clientId: string, weekStart: string): Promise<WeekFigures> {
  const figures: WeekFigures = {
    sessionsDone: 0,
    sessionsPlanned: 0,
    sleepAvgH: null,
    sleepNights: 0,
    stepsAvg: null,
    stepsTarget: null,
  };
  if (!clientId || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return figures;

  const supabase = await createClient();
  const sunday = addDays(weekStart, 6);
  const [metrics, assignments, client] = await Promise.all([
    supabase
      .from("daily_metrics")
      .select("sleep_h, steps")
      .eq("client_id", clientId)
      .gte("day", weekStart)
      .lte("day", sunday),
    // The week the client was in: the latest one started by that Sunday.
    supabase
      .from("assignments")
      .select("start_date, programme_weeks(sessions(id, session_exercises(id)))")
      .eq("client_id", clientId)
      .not("pushed_at", "is", null)
      .lte("start_date", sunday)
      .gt("start_date", addDays(weekStart, -7))
      .order("start_date", { ascending: false })
      .limit(1),
    supabase.from("clients").select("steps_target").eq("id", clientId).maybeSingle(),
  ]);

  const nights = (metrics.data ?? []).filter((row) => row.sleep_h != null).map((row) => Number(row.sleep_h));
  if (nights.length > 0) {
    figures.sleepAvgH = nights.reduce((a, b) => a + b, 0) / nights.length;
    figures.sleepNights = nights.length;
  }
  const steps = (metrics.data ?? []).filter((row) => row.steps != null).map((row) => Number(row.steps));
  if (steps.length > 0) figures.stepsAvg = Math.round(steps.reduce((a, b) => a + b, 0) / steps.length);
  figures.stepsTarget = client.data?.steps_target ?? null;

  const assignment = (assignments.data ?? [])[0];
  const week = assignment?.programme_weeks as unknown as {
    sessions: { id: string; session_exercises: { id: string }[] }[];
  } | null;
  const sessions = (week?.sessions ?? []).filter((session) => session.session_exercises.length > 0);
  figures.sessionsPlanned = sessions.length;

  const exerciseIds = sessions.flatMap((session) => session.session_exercises.map((e) => e.id));
  if (assignment && exerciseIds.length > 0) {
    // A session counts once any of its exercises carries a set, whichever
    // day of that week it was done — the rule the client's own week follows.
    const { data: logs } = await supabase
      .from("set_logs")
      .select("session_exercise_id")
      .eq("client_id", clientId)
      .in("session_exercise_id", exerciseIds)
      .gte("logged_at", `${assignment.start_date}T00:00:00Z`)
      .lt("logged_at", `${addDays(assignment.start_date, 8)}T00:00:00Z`);
    const logged = new Set((logs ?? []).map((row) => row.session_exercise_id));
    figures.sessionsDone = sessions.filter((session) =>
      session.session_exercises.some((e) => logged.has(e.id)),
    ).length;
  }

  return figures;
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

  // The file's free-text fields: absent means absent, not an empty string.
  const text = (key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    return value === "" ? null : value;
  };
  const date = (key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  };

  await supabase
    .from("clients")
    .update({
      name: String(formData.get("name") ?? "").trim() || undefined,
      goal: goal === "" ? null : (goal as ClientGoal),
      height_cm: num(formData.get("height_cm")),
      sleep_target_h: num(formData.get("sleep_target_h")),
      steps_target: num(formData.get("steps_target")),
      injuries: lines("injuries"),
      equipment: lines("equipment"),
      session_days: days,
      cycle_tracking: formData.get("cycle_tracking") === "on",
      email: text("email"),
      phone: text("phone"),
      whatsapp: text("whatsapp"),
      preferred_channel: text("preferred_channel"),
      timezone: text("timezone"),
      languages: text("languages"),
      instagram: text("instagram"),
      tiktok: text("tiktok"),
      strava: text("strava"),
      hevy: text("hevy"),
      birth_date: date("birth_date"),
      occupation: text("occupation"),
      training_age: text("training_age"),
      diet: text("diet"),
      emergency_contact: text("emergency_contact"),
    })
    .eq("id", clientId);

  // The note lives apart from her row, where only the coach can read it.
  const note = text("file_note");
  if (note) {
    await supabase
      .from("client_file_notes")
      .upsert(
        { client_id: clientId, note, updated_at: new Date().toISOString() },
        { onConflict: "client_id" },
      );
  } else {
    await supabase.from("client_file_notes").delete().eq("client_id", clientId);
  }

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

  // Erased for good: photos from storage first (SQL cannot), then the row,
  // every table under it and the login. Invoices stay, under the name they
  // were issued to — the law keeps them ten years.
  await removeCheckInPhotos(supabase, clientId);
  await supabase.rpc("erase_my_client", { p_client: clientId });

  revalidatePath("/clients");
  redirect("/clients");
}

/**
 * The coaching has ended: the client leaves the roster and the queue, and
 * the retention clock starts — photos erased after 3 months, everything
 * after 12. Bringing them back stops it.
 */
export async function setClientArchived(formData: FormData) {
  const supabase = await createClient();
  const clientId = String(formData.get("client_id") ?? "");
  const archive = String(formData.get("archive") ?? "") === "1";
  if (!clientId) return;

  await supabase
    .from("clients")
    .update(archive ? { status: "archived", archived_at: new Date().toISOString() } : { status: "active", archived_at: null })
    .eq("id", clientId);

  revalidatePath("/clients", "layout");
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
export async function createInvite(
  askCycle: boolean,
  callMinutes: CallMinutes | null = null,
  needsApproval = false,
): Promise<CreatedInvite | null> {
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
      .insert({
        coach_id: user.id,
        code,
        ask_cycle: askCycle,
        call_minutes: callMinutes && CALL_MINUTES.includes(callMinutes) ? callMinutes : null,
        needs_approval: needsApproval,
      })
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

/* ---------- cycle levers ---------- */

function intOr(value: FormDataEntryValue | null, fallback: number): number {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

/**
 * Programming settings, not cycle data — no date passes through here. The row
 * is per client and per phase, so saving one phase leaves the others alone.
 */
export async function saveCycleAdjustment(formData: FormData) {
  const supabase = await createClient();

  const clientId = String(formData.get("client_id") ?? "");
  const phase = String(formData.get("phase") ?? "") as CyclePhase;
  if (!clientId || !["menstrual", "follicular", "ovulatory", "luteal"].includes(phase)) {
    return;
  }

  const rpe = String(formData.get("rpe_cap") ?? "").trim();

  await supabase.from("cycle_adjustments").upsert(
    {
      client_id: clientId,
      phase,
      load_pct: intOr(formData.get("load_pct"), 0),
      rpe_cap: rpe === "" ? null : Number(rpe),
      sets_delta: intOr(formData.get("sets_delta"), 0),
      kcal_delta: intOr(formData.get("kcal_delta"), 0),
      carbs_g_delta: intOr(formData.get("carbs_g_delta"), 0),
    },
    { onConflict: "client_id,phase" },
  );

  revalidatePath(`/clients/${clientId}`);
}

/** Follow the log, or name the phase by hand when the log is out of step. */
export async function setCycleMode(formData: FormData) {
  const supabase = await createClient();

  const clientId = String(formData.get("client_id") ?? "");
  const mode = String(formData.get("mode") ?? "");
  if (!clientId || (mode !== "log" && mode !== "manual")) return;

  const manual = String(formData.get("phase_manual") ?? "");

  await supabase
    .from("clients")
    .update({
      cycle_mode: mode,
      cycle_phase_manual:
        mode === "manual" && manual !== "" ? (manual as CyclePhase) : null,
    })
    .eq("id", clientId);

  revalidatePath(`/clients/${clientId}`);
}

/**
 * The step target, set where it is read rather than buried in the record. A
 * target three tabs away from the chart it governs is a target nobody adjusts.
 */
export async function setStepsTarget(formData: FormData) {
  const supabase = await createClient();
  const clientId = String(formData.get("client_id") ?? "");
  if (!clientId) return;

  const count = (value: FormDataEntryValue | null): number | null => {
    const raw = String(value ?? "").replace(/[^0-9]/g, "");
    if (raw === "") return null;
    const parsed = Number(raw);
    return parsed > 0 && parsed <= 100_000 ? parsed : null;
  };

  await supabase
    .from("clients")
    .update({
      steps_target: count(formData.get("steps_target")),
    })
    .eq("id", clientId);

  revalidatePath(`/clients/${clientId}`);
}

/**
 * Cancels a booked call. The row stays, stamped, so the slot frees up and the
 * coach can still see it was booked; she tells the client on WhatsApp.
 */
export async function cancelAppointment(appointmentId: string, clientId: string) {
  const supabase = await createClient();
  await supabase
    .from("appointments")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("id", appointmentId)
    .is("cancelled_at", null);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}

/** The coach has read a pain report; it leaves À traiter. */
export async function markPainSeen(formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("pain_reports")
    .update({ seen_at: new Date().toISOString() })
    .eq("id", String(formData.get("id") ?? ""))
    .is("seen_at", null);
  // À traiter and the client's own page both show it.
  revalidatePath("/clients", "layout");
}


/** The coach takes the request: the client becomes active and the app opens. */
export async function acceptClient(formData: FormData) {
  const supabase = await createClient();
  const clientId = String(formData.get("client_id") ?? "");
  if (!clientId) return;
  await supabase.from("clients").update({ status: "active" }).eq("id", clientId).eq("status", "pending");
  revalidatePath("/clients", "layout");
  redirect(`/clients/${clientId}?bienvenue=1`);
}

/**
 * The coach declines the request. There is no coaching, so nothing is kept:
 * the account and its answers are erased at once. Only a pending client can
 * be refused this way — an active one is archived or removed from the file.
 */
export async function refuseClient(formData: FormData) {
  const supabase = await createClient();
  const clientId = String(formData.get("client_id") ?? "");
  const { data: client } = await supabase.from("clients").select("status").eq("id", clientId).maybeSingle();
  if (!client || client.status !== "pending") redirect("/clients");

  await removeCheckInPhotos(supabase, clientId);
  await supabase.rpc("erase_my_client", { p_client: clientId });
  revalidatePath("/clients", "layout");
  redirect("/clients");
}

/**
 * A video call offered to a client already coached: its length goes on the
 * client's row, and the client picks a free slot in the app. Offering again
 * replaces the length; a null length withdraws the offer.
 */
export async function offerCall(formData: FormData) {
  const supabase = await createClient();
  const clientId = String(formData.get("client_id") ?? "");
  const raw = formData.get("minutes");
  const minutes = raw === null || raw === "" ? null : (Number(raw) as CallMinutes);
  if (!clientId || (minutes !== null && !CALL_MINUTES.includes(minutes))) return;

  await supabase.from("clients").update({ call_offer_minutes: minutes }).eq("id", clientId);
  revalidatePath(`/clients/${clientId}`);
}
