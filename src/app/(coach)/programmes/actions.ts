"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { localDay } from "@/lib/clientData";
import { formatScheme, parseScheme, schemeColumns } from "@/lib/scheme";
import {
  fetchExerciseTemplates,
  splitTitle,
  titleise,
} from "@/lib/hevy";

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
    .select("week_number, sessions(day_index, name, notes, session_exercises(position, name, scheme, target_sets, target_reps, target_weight_kg, cue, rest_min_s, rest_max_s, alternatives))")
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
      rest_min_s: number | null;
      rest_max_s: number | null;
      alternatives: string[];
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

/** How a week grows from the last: more load, or more reps. */
export type Progression = "load" | "reps";

const LOAD_STEP_KG = 2.5;
const REPS_STEP = 1;

/**
 * The next week, written from how the last one went. Each exercise moves on
 * only when every client who logged it hit every prescribed set — reps and
 * load — and otherwise stays as it was; with no sets logged, or no target to
 * judge against, it stays too and is counted as unknown. The new week is not
 * pushed: delivery is never a side effect of saving.
 */
export async function progressWeek(weekId: string, programmeId: string, rule: Progression) {
  const supabase = await createClient();

  const { data: source } = await supabase
    .from("programme_weeks")
    .select(
      "week_number, sessions(day_index, name, notes, session_exercises(id, position, name, scheme, target_sets, target_reps, target_weight_kg, cue, rest_min_s, rest_max_s, alternatives))",
    )
    .eq("id", weekId)
    .maybeSingle();
  if (!source) return;

  type Exercise = {
    id: string;
    position: number;
    name: string;
    scheme: string | null;
    target_sets: number | null;
    target_reps: number | null;
    target_weight_kg: number | null;
    cue: string | null;
    rest_min_s: number | null;
    rest_max_s: number | null;
    alternatives: string[];
  };
  const sessions = (source.sessions ?? []) as unknown as {
    day_index: number;
    name: string | null;
    notes: string | null;
    session_exercises: Exercise[];
  }[];
  const exerciseIds = sessions.flatMap((s) => (s.session_exercises ?? []).map((e) => e.id));

  const { data: logs } = exerciseIds.length
    ? await supabase
        .from("set_logs")
        .select("client_id, session_exercise_id, reps, weight_kg, done_as")
        .in("session_exercise_id", exerciseIds)
    : { data: [] as { client_id: string; session_exercise_id: string; reps: number | null; weight_kg: number | null; done_as: string | null }[] };

  // Per exercise: the clients who logged it at all.
  const byExercise = new Map<string, Set<string>>();
  for (const log of logs ?? []) {
    const clients = byExercise.get(log.session_exercise_id) ?? new Set<string>();
    clients.add(log.client_id);
    byExercise.set(log.session_exercise_id, clients);
  }

  const outcome = new Map<string, "up" | "hold" | "unknown">();
  for (const session of sessions) {
    for (const e of session.session_exercises ?? []) {
      const clients = byExercise.get(e.id);
      if (!clients || e.target_sets == null || e.target_reps == null) {
        outcome.set(e.id, "unknown");
        continue;
      }
      const target = e.target_weight_kg == null ? null : Number(e.target_weight_kg);
      let everyone = true;
      for (const clientId of clients) {
        const hit = (logs ?? []).filter(
          (l) =>
            l.session_exercise_id === e.id &&
            l.client_id === clientId &&
            // A set done as a stand-in says nothing of the movement itself.
            l.done_as == null &&
            (l.reps ?? 0) >= (e.target_reps ?? 0) &&
            (target == null || Number(l.weight_kg ?? 0) >= target),
        ).length;
        if (hit < (e.target_sets ?? 0)) everyone = false;
      }
      // More load needs a load to add to; without one, the week holds.
      outcome.set(e.id, everyone && !(rule === "load" && target == null) ? "up" : "hold");
    }
  }

  const { data: last } = await supabase
    .from("programme_weeks")
    .select("week_number")
    .eq("programme_id", programmeId)
    .order("week_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const number = (last?.week_number ?? 0) + 1;

  const { data: created } = await supabase
    .from("programme_weeks")
    .insert({ programme_id: programmeId, week_number: number })
    .select("id")
    .single();
  if (!created) return;

  for (const session of sessions) {
    const { data: newSession } = await supabase
      .from("sessions")
      .insert({ week_id: created.id, day_index: session.day_index, name: session.name, notes: session.notes })
      .select("id")
      .single();
    if (!newSession) continue;

    const rows = (session.session_exercises ?? []).map(({ id, ...e }) => {
      const up = outcome.get(id) === "up";
      const target_weight_kg =
        up && rule === "load" && e.target_weight_kg != null
          ? Math.round((Number(e.target_weight_kg) + LOAD_STEP_KG) * 2) / 2
          : e.target_weight_kg;
      const target_reps = up && rule === "reps" && e.target_reps != null ? e.target_reps + REPS_STEP : e.target_reps;
      // The coach reads the scheme text: it moves with the numbers.
      const scheme =
        up && parseScheme(e.scheme) && e.target_sets != null && target_reps != null
          ? formatScheme({ sets: e.target_sets, reps: target_reps, weight: target_weight_kg == null ? null : Number(target_weight_kg) })
          : e.scheme;
      return { ...e, session_id: newSession.id, scheme, target_weight_kg, target_reps };
    });
    if (rows.length > 0) await supabase.from("session_exercises").insert(rows);
  }

  const count = (kind: "up" | "hold" | "unknown") => [...outcome.values()].filter((v) => v === kind).length;
  revalidatePath(`/programmes/${programmeId}`);
  redirect(
    `/programmes/${programmeId}?semaine=${number}&progres=${count("up")}&stable=${count("hold")}&inconnu=${count("unknown")}&regle=${rule}`,
  );
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
  patch: {
    name?: string;
    scheme?: string | null;
    cue?: string | null;
    rest_min_s?: number | null;
    rest_max_s?: number | null;
    alternatives?: string[];
  },
  programmeId: string,
) {
  const supabase = await createClient();
  // A scheme she types is read into targets — "4×8 @ 60 kg" — so logging,
  // the cycle levers and next week's progression have numbers to work from.
  const row = "scheme" in patch ? { ...patch, ...schemeColumns(patch.scheme) } : { ...patch };
  if (patch.alternatives) {
    // Three at most, each once, never the movement itself.
    row.alternatives = [...new Set(patch.alternatives.map((a) => a.trim()).filter(Boolean))]
      .filter((a) => a.toLowerCase() !== (patch.name ?? "").trim().toLowerCase())
      .map((a) => a.slice(0, 120))
      .slice(0, 3);
  }
  await supabase.from("session_exercises").update(row).eq("id", exerciseId);

  // A name she typed that the catalogue does not know becomes hers, so the
  // next week autocompletes it. No button needed to "create" one.
  if (patch.name && patch.name.trim() !== "") {
    await rememberExercise(patch.name.trim());
  }
  for (const alternative of row.alternatives ?? []) await rememberExercise(alternative);

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
  if (clientIds.length === 0) return { kept: 0 };

  const begun = await weeksBegun(supabase, clientIds, [weekId]);
  const rows = clientIds
    .filter((client_id) => !begun.has(`${client_id}:${weekId}`))
    .map((client_id) => ({
      client_id,
      week_id: weekId,
      start_date: startDate,
      pushed_at: new Date().toISOString(),
    }));

  if (rows.length > 0) {
    await supabase.from("assignments").upsert(rows, { onConflict: "client_id,week_id" });
  }

  revalidatePath(`/programmes/${programmeId}`);
  revalidatePath("/clients");
  return { kept: begun.size };
}

/**
 * The (client, week) pairs already delivered and begun. A push never moves
 * them: the week's start date is what the client's history, adherence and
 * missed sessions are read against, so re-dating a week she has trained
 * would wipe it from her past and owe it again in the future.
 */
async function weeksBegun(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientIds: string[],
  weekIds: string[],
) {
  const { data } = await supabase
    .from("assignments")
    .select("client_id, week_id")
    .in("client_id", clientIds)
    .in("week_id", weekIds)
    .not("pushed_at", "is", null)
    .lte("start_date", localDay("Europe/Paris"));
  return new Set((data ?? []).map((row) => `${row.client_id}:${row.week_id}`));
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
  /** Where it landed. Omitted means the end — a click on "add", not a drop. */
  atPosition?: number,
) {
  const supabase = await createClient();
  const clean = name.trim();
  if (clean === "") return;

  const { data: siblings } = await supabase
    .from("session_exercises")
    .select("id, position")
    .eq("session_id", sessionId)
    .order("position");

  const rows = siblings ?? [];

  if (atPosition === undefined) {
    await supabase.from("session_exercises").insert({
      session_id: sessionId,
      position: rows.length,
      name: clean,
    });
    revalidatePath(`/programmes/${programmeId}`);
    return;
  }

  // Dropped between two movements, so it belongs between them. Insert at the
  // end first, then renumber the session — the same path moveExercise takes,
  // and it leaves positions contiguous whatever they were before.
  const { data: created } = await supabase
    .from("session_exercises")
    .insert({ session_id: sessionId, position: rows.length, name: clean })
    .select("id")
    .single();

  if (!created) return;

  const at = Math.max(0, Math.min(atPosition, rows.length));
  const ordered = [
    ...rows.slice(0, at).map((row) => row.id),
    created.id,
    ...rows.slice(at).map((row) => row.id),
  ];

  for (const [index, id] of ordered.entries()) {
    await supabase.from("session_exercises").update({ position: index }).eq("id", id);
  }

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
  atPosition?: number,
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

  await addExerciseNamed(sessionId, name, programmeId, atPosition);
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

/**
 * Pulls her Hevy exercise templates into the library. Additive and idempotent:
 * a name she already has is left alone, because her own muscle group and
 * equipment are edits, not stale data.
 */
export async function importHevyTemplates(): Promise<{
  added: number;
  skipped: number;
  reason?: "not-configured" | "unauthorised" | "failed";
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { added: 0, skipped: 0, reason: "failed" };

  const result = await fetchExerciseTemplates();
  if (!result.ok) return { added: 0, skipped: 0, reason: result.reason };

  // Everything already in the catalogue, built-in or hers, by lowered name.
  const { data: existing } = await supabase.from("exercises").select("name");
  const known = new Set(
    (existing ?? []).map((row) => row.name.trim().toLowerCase()),
  );

  const rows: { coach_id: string; name: string; muscle_group: string | null; equipment: string | null }[] = [];
  let skipped = 0;

  for (const template of result.templates) {
    const { name, equipment } = splitTitle(template);
    if (!name || known.has(name.toLowerCase())) {
      skipped += 1;
      continue;
    }
    known.add(name.toLowerCase());
    rows.push({
      coach_id: user.id,
      name,
      muscle_group: titleise(template.primary_muscle_group),
      equipment,
    });
  }

  if (rows.length > 0) {
    await supabase.from("exercises").insert(rows);
  }

  revalidatePath("/programmes", "layout");
  return { added: rows.length, skipped };
}

/**
 * The whole programme to several clients at once — a group, a challenge.
 * Week 1 starts on the date given, each later week seven days after the one
 * before; every client sees a week only from its own start date.
 */
export async function pushProgramme(programmeId: string, clientIds: string[], startDate: string) {
  const supabase = await createClient();
  if (clientIds.length === 0 || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return { kept: 0 };

  const { data: weeks } = await supabase
    .from("programme_weeks")
    .select("id, week_number")
    .eq("programme_id", programmeId)
    .order("week_number");
  if (!weeks?.length) return { kept: 0 };

  const begun = await weeksBegun(supabase, clientIds, weeks.map((week) => week.id));
  const first = weeks[0].week_number;
  const at = (offset: number) => {
    const d = new Date(`${startDate}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + offset * 7);
    return d.toISOString().slice(0, 10);
  };
  const now = new Date().toISOString();
  const rows = weeks.flatMap((week) =>
    clientIds
      .filter((client_id) => !begun.has(`${client_id}:${week.id}`))
      .map((client_id) => ({
        client_id,
        week_id: week.id,
        start_date: at(week.week_number - first),
        pushed_at: now,
      })),
  );

  if (rows.length > 0) {
    await supabase.from("assignments").upsert(rows, { onConflict: "client_id,week_id" });
  }
  revalidatePath(`/programmes/${programmeId}`);
  revalidatePath("/programmes");
  revalidatePath("/clients");
  return { kept: begun.size };
}

/**
 * A session copied to other days or weeks (1 Oct 2026): its name and its
 * movements, in order, with schemes, targets, cues and rest. A target day
 * already holding a session is replaced — unless a client has logged a set
 * on it: deleting it would take their sets with it (set_logs cascade), so
 * that one is left alone and counted as kept.
 */
export async function copySession(
  sessionId: string,
  targets: { weekId: string; dayIndex: number }[],
  programmeId: string,
): Promise<{ copied: number; kept: number }> {
  const supabase = await createClient();
  const { data: source } = await supabase
    .from("sessions")
    .select("week_id, day_index, name, notes, session_exercises(position, name, scheme, target_sets, target_reps, target_weight_kg, cue, rest_min_s, rest_max_s, alternatives)")
    .eq("id", sessionId)
    .maybeSingle();
  if (!source) return { copied: 0, kept: 0 };

  const exercises = ((source.session_exercises ?? []) as unknown as {
    position: number;
    name: string;
    scheme: string | null;
    target_sets: number | null;
    target_reps: number | null;
    target_weight_kg: number | null;
    cue: string | null;
    rest_min_s: number | null;
    rest_max_s: number | null;
    alternatives: string[];
  }[]).sort((a, b) => a.position - b.position);

  let copied = 0;
  let kept = 0;
  for (const target of targets) {
    if (!Number.isInteger(target.dayIndex) || target.dayIndex < 0 || target.dayIndex > 6) continue;
    if (target.weekId === source.week_id && target.dayIndex === source.day_index) continue;

    const { data: existing } = await supabase
      .from("sessions")
      .select("id, session_exercises(id)")
      .eq("week_id", target.weekId)
      .eq("day_index", target.dayIndex)
      .maybeSingle();

    if (existing) {
      const ids = ((existing.session_exercises ?? []) as unknown as { id: string }[]).map((e) => e.id);
      if (ids.length > 0) {
        const { count } = await supabase
          .from("set_logs")
          .select("id", { count: "exact", head: true })
          .in("session_exercise_id", ids);
        if ((count ?? 0) > 0) {
          kept += 1;
          continue;
        }
      }
      await supabase.from("sessions").delete().eq("id", existing.id);
    }

    const { data: created } = await supabase
      .from("sessions")
      .insert({ week_id: target.weekId, day_index: target.dayIndex, name: source.name, notes: source.notes, kind: "training" })
      .select("id")
      .single();
    if (!created) continue;
    if (exercises.length > 0) {
      await supabase
        .from("session_exercises")
        .insert(exercises.map((exercise, position) => ({ ...exercise, position, session_id: created.id })));
    }
    copied += 1;
  }

  revalidatePath(`/programmes/${programmeId}`);
  return { copied, kept };
}
