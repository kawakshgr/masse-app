"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function coachId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function createProgramme(formData: FormData) {
  const supabase = await createClient();
  const id = await coachId();
  if (!id) return;

  const name = String(formData.get("name") ?? "").trim() || "Nouveau bloc";

  const { data } = await supabase
    .from("programmes")
    .insert({ coach_id: id, name })
    .select("id")
    .single();

  if (!data) return;

  // A programme with no week cannot be edited, so week 1 comes with it.
  await supabase
    .from("programme_weeks")
    .insert({ programme_id: data.id, week_number: 1 });

  revalidatePath("/programmes");
  redirect(`/programmes/${data.id}`);
}

export async function addWeek(programmeId: string) {
  const supabase = await createClient();

  const { data: last } = await supabase
    .from("programme_weeks")
    .select("week_number")
    .eq("programme_id", programmeId)
    .order("week_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("programme_weeks").insert({
    programme_id: programmeId,
    week_number: (last?.week_number ?? 0) + 1,
  });

  revalidatePath(`/programmes/${programmeId}`);
}

/** The biggest time-saver: last week, copied forward, then edited. */
export async function duplicateWeek(weekId: string, programmeId: string) {
  const supabase = await createClient();

  const { data: source } = await supabase
    .from("programme_weeks")
    .select("week_number, sessions(day_index, name, notes, session_exercises(position, name, scheme, target_sets, target_reps, target_weight_kg, cue))")
    .eq("id", weekId)
    .maybeSingle();

  if (!source) return;

  const { data: last } = await supabase
    .from("programme_weeks")
    .select("week_number")
    .eq("programme_id", programmeId)
    .order("week_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: created } = await supabase
    .from("programme_weeks")
    .insert({ programme_id: programmeId, week_number: (last?.week_number ?? 0) + 1 })
    .select("id")
    .single();

  if (!created) return;

  const sessions = (source.sessions ?? []) as unknown as {
    day_index: number;
    name: string | null;
    notes: string | null;
    session_exercises: {
      position: number;
      name: string;
      scheme: string | null;
      target_sets: number | null;
      target_reps: number | null;
      target_weight_kg: number | null;
      cue: string | null;
    }[];
  }[];

  for (const session of sessions) {
    const { data: newSession } = await supabase
      .from("sessions")
      .insert({
        week_id: created.id,
        day_index: session.day_index,
        name: session.name,
        notes: session.notes,
      })
      .select("id")
      .single();

    if (!newSession) continue;

    const exercises = (session.session_exercises ?? []).map((e) => ({
      ...e,
      session_id: newSession.id,
    }));

    if (exercises.length > 0) {
      await supabase.from("session_exercises").insert(exercises);
    }
  }

  revalidatePath(`/programmes/${programmeId}`);
}

export async function toggleTemplate(programmeId: string, isTemplate: boolean) {
  const supabase = await createClient();
  await supabase
    .from("programmes")
    .update({ is_template: isTemplate })
    .eq("id", programmeId);
  revalidatePath(`/programmes/${programmeId}`);
  revalidatePath("/programmes");
}

export async function addSession(weekId: string, dayIndex: number, programmeId: string) {
  const supabase = await createClient();
  await supabase.from("sessions").insert({ week_id: weekId, day_index: dayIndex });
  revalidatePath(`/programmes/${programmeId}`);
}

export async function deleteSession(sessionId: string, programmeId: string) {
  const supabase = await createClient();
  await supabase.from("sessions").delete().eq("id", sessionId);
  revalidatePath(`/programmes/${programmeId}`);
}

export async function renameSession(sessionId: string, name: string, programmeId: string) {
  const supabase = await createClient();
  await supabase.from("sessions").update({ name: name.trim() || null }).eq("id", sessionId);
  revalidatePath(`/programmes/${programmeId}`);
}

export async function addExercise(sessionId: string, programmeId: string) {
  const supabase = await createClient();

  const { data: last } = await supabase
    .from("session_exercises")
    .select("position")
    .eq("session_id", sessionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("session_exercises").insert({
    session_id: sessionId,
    position: (last?.position ?? -1) + 1,
    name: "Nouvel exercice",
  });

  revalidatePath(`/programmes/${programmeId}`);
}

export async function updateExercise(
  exerciseId: string,
  patch: { name?: string; scheme?: string | null; cue?: string | null },
  programmeId: string,
) {
  const supabase = await createClient();
  await supabase.from("session_exercises").update(patch).eq("id", exerciseId);

  // A name she typed that the catalogue does not know becomes hers, so the
  // next week autocompletes it. No button needed to "create" one.
  if (patch.name && patch.name.trim() !== "") {
    await rememberExercise(patch.name.trim());
  }

  revalidatePath(`/programmes/${programmeId}`);
}

async function rememberExercise(name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: known } = await supabase
    .from("exercises")
    .select("id")
    .ilike("name", name)
    .limit(1)
    .maybeSingle();

  if (known) return;

  // A collision with a built-in is caught by the unique index and ignored.
  await supabase.from("exercises").insert({ coach_id: user.id, name });
}

export async function deleteExercise(exerciseId: string, programmeId: string) {
  const supabase = await createClient();
  await supabase.from("session_exercises").delete().eq("id", exerciseId);
  revalidatePath(`/programmes/${programmeId}`);
}

/** Reorders within a day, or moves the exercise to another day's session. */
export async function moveExercise(
  exerciseId: string,
  toSessionId: string,
  toPosition: number,
  programmeId: string,
) {
  const supabase = await createClient();

  const { data: siblings } = await supabase
    .from("session_exercises")
    .select("id, position")
    .eq("session_id", toSessionId)
    .order("position");

  const remaining = (siblings ?? []).filter((s) => s.id !== exerciseId);
  const ordered = [
    ...remaining.slice(0, toPosition).map((s) => s.id),
    exerciseId,
    ...remaining.slice(toPosition).map((s) => s.id),
  ];

  await supabase
    .from("session_exercises")
    .update({ session_id: toSessionId })
    .eq("id", exerciseId);

  for (const [index, id] of ordered.entries()) {
    await supabase.from("session_exercises").update({ position: index }).eq("id", id);
  }

  revalidatePath(`/programmes/${programmeId}`);
}

/**
 * Pushing is always an explicit act, never a background sync — and it is the
 * only moment anything becomes visible to a client.
 */
export async function pushWeek(
  weekId: string,
  clientIds: string[],
  startDate: string,
  programmeId: string,
) {
  const supabase = await createClient();
  if (clientIds.length === 0) return;

  const rows = clientIds.map((client_id) => ({
    client_id,
    week_id: weekId,
    start_date: startDate,
    pushed_at: new Date().toISOString(),
  }));

  await supabase.from("assignments").upsert(rows, { onConflict: "client_id,week_id" });

  revalidatePath(`/programmes/${programmeId}`);
  revalidatePath("/clients");
}

export async function renameProgramme(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("programme_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || name === "") return;

  await supabase.from("programmes").update({ name }).eq("id", id);
  revalidatePath(`/programmes/${id}`);
  revalidatePath("/programmes");
}

/**
 * Destructive: weeks, sessions and exercises cascade, and any assignment
 * pointing at those weeks goes with them. Guarded by a typed confirmation.
 */
export async function deleteProgramme(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("programme_id") ?? "");
  const typed = String(formData.get("confirm") ?? "").trim().toLowerCase();
  const expected = String(formData.get("expected") ?? "").trim().toLowerCase();

  if (!id || typed === "" || typed !== expected) {
    redirect(`/programmes/${id}?suppression=confirmation`);
  }

  await supabase.from("programmes").delete().eq("id", id);

  revalidatePath("/programmes");
  redirect("/programmes");
}

export async function deleteWeek(weekId: string, programmeId: string) {
  const supabase = await createClient();
  await supabase.from("programme_weeks").delete().eq("id", weekId);
  revalidatePath(`/programmes/${programmeId}`);
  revalidatePath("/clients");
}

/**
 * Takes a pushed week back. pushed_at null means invisible again — the same
 * boundary, read in the other direction. Without this a coach who pushes the
 * wrong week has no way back.
 */
export async function retractWeek(
  weekId: string,
  clientId: string,
  programmeId: string,
) {
  const supabase = await createClient();

  await supabase
    .from("assignments")
    .update({ pushed_at: null })
    .eq("week_id", weekId)
    .eq("client_id", clientId);

  revalidatePath(`/programmes/${programmeId}`);
  revalidatePath("/clients");
}

/** Adds a catalogue exercise straight into a day, at the end or at a position. */
export async function addExerciseNamed(
  sessionId: string,
  name: string,
  programmeId: string,
) {
  const supabase = await createClient();
  const clean = name.trim();
  if (clean === "") return;

  const { data: last } = await supabase
    .from("session_exercises")
    .select("position")
    .eq("session_id", sessionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("session_exercises").insert({
    session_id: sessionId,
    position: (last?.position ?? -1) + 1,
    name: clean,
  });

  revalidatePath(`/programmes/${programmeId}`);
}

/**
 * Creates the day if it has no session yet, then drops the exercise in. Lets a
 * library item land on an empty column without two steps.
 */
export async function addExerciseToDay(
  weekId: string,
  dayIndex: number,
  name: string,
  programmeId: string,
) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("sessions")
    .select("id")
    .eq("week_id", weekId)
    .eq("day_index", dayIndex)
    .maybeSingle();

  let sessionId = existing?.id;

  if (!sessionId) {
    const { data: created } = await supabase
      .from("sessions")
      .insert({ week_id: weekId, day_index: dayIndex })
      .select("id")
      .single();
    sessionId = created?.id;
  }

  if (!sessionId) return;

  await addExerciseNamed(sessionId, name, programmeId);
}

/** A rest day is a decision. An empty day is only an undecided one. */
export async function setRestDay(
  weekId: string,
  dayIndex: number,
  programmeId: string,
) {
  const supabase = await createClient();
  await supabase
    .from("sessions")
    .upsert(
      { week_id: weekId, day_index: dayIndex, kind: "rest", name: null },
      { onConflict: "week_id,day_index" },
    );
  revalidatePath(`/programmes/${programmeId}`);
}

/** Back to a training day, ready to take exercises again. */
export async function setTrainingDay(sessionId: string, programmeId: string) {
  const supabase = await createClient();
  await supabase.from("sessions").update({ kind: "training" }).eq("id", sessionId);
  revalidatePath(`/programmes/${programmeId}`);
}

/**
 * Her own entry, gone for good. A built-in belongs to every coach, so it is
 * hidden from her list instead — reversible, and nobody else's list moves.
 */
export async function removeFromLibrary(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const id = String(formData.get("exercise_id") ?? "");
  const mine = String(formData.get("mine") ?? "") === "1";
  if (!user || !id) return;

  if (mine) {
    await supabase.from("exercises").delete().eq("id", id);
  } else {
    await supabase
      .from("exercise_hidden")
      .upsert({ coach_id: user.id, exercise_id: id }, { onConflict: "coach_id,exercise_id" });
  }

  revalidatePath("/programmes", "layout");
}

/** Puts a hidden built-in back. */
export async function restoreToLibrary(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const id = String(formData.get("exercise_id") ?? "");
  if (!user || !id) return;

  await supabase
    .from("exercise_hidden")
    .delete()
    .eq("coach_id", user.id)
    .eq("exercise_id", id);

  revalidatePath("/programmes", "layout");
}
