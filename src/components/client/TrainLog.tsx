"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  enqueue,
  flush,
  getServerSnapshot,
  getSnapshot,
  remove,
  subscribe,
  type QueuedSet,
} from "@/lib/setQueue";
import type { WeekExercise } from "@/lib/clientData";
import { Card, Choice, Cta, RoundButton, clean } from "./ui";
import { RestBar, newRest } from "./RestBar";

type LoggedSet = Pick<
  QueuedSet,
  "id" | "session_exercise_id" | "set_index" | "reps" | "weight_kg" | "rpe" | "synced_at"
>;

/**
 * The session, being done — TrainView.swift. Every control a thumb's width,
 * the numbers carried over from the last set so a working set costs one tap,
 * and nothing waits on the network.
 */
export function TrainLog({
  clientId,
  exercises,
  onServer,
}: {
  clientId: string;
  exercises: WeekExercise[];
  /** What the server already holds for today: both halves are shown. */
  onServer: LoggedSet[];
}) {
  const t = useTranslations("log");
  const held = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [server, setServer] = useState<LoggedSet[]>(onServer);
  const [rest, setRest] = useState<{ startedAt: number; endsAt: number } | null>(null);
  const online = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("online", onChange);
      window.addEventListener("offline", onChange);
      return () => {
        window.removeEventListener("online", onChange);
        window.removeEventListener("offline", onChange);
      };
    },
    () => navigator.onLine,
    () => true,
  );

  const all = useMemo(() => {
    const seen = new Set(server.map((row) => row.id));
    return [...server, ...held.filter((row) => !seen.has(row.id))];
  }, [server, held]);

  const setsFor = (exerciseId: string) =>
    all
      .filter((row) => row.session_exercise_id === exerciseId)
      .sort((a, b) => a.set_index - b.set_index);

  // Open the first exercise with nothing logged: where she is.
  const [open, setOpen] = useState<string | null>(
    () =>
      exercises.find((e) => !onServer.some((s) => s.session_exercise_id === e.id))?.id ??
      exercises[0]?.id ??
      null,
  );

  /** Rows the server took move from the outbox to what the server holds. */
  const settle = (sent: QueuedSet[]) => {
    if (sent.length) setServer((rows) => [...rows, ...sent]);
  };

  async function send() {
    settle(await flush());
  }

  // Whenever the connection is up — on arrival, and on every reconnect.
  useEffect(() => {
    if (online) void flush().then(settle);
  }, [online]);

  async function log(exercise: WeekExercise, reps: number | null, weight: number | null, rpe: number | null) {
    const last = setsFor(exercise.id).at(-1);
    enqueue({
      client_id: clientId,
      session_exercise_id: exercise.id,
      set_index: (last?.set_index ?? -1) + 1,
      reps,
      weight_kg: weight,
      rpe,
    });
    // The set is in; the rest starts on its own.
    setRest(newRest());
    await send();
  }

  /** A set that already reached the server is withdrawn from it too. */
  async function undo(exerciseId: string) {
    const last = setsFor(exerciseId).at(-1);
    if (!last) return;
    if (held.some((row) => row.id === last.id)) {
      remove(last.id);
      return;
    }
    await createClient().from("set_logs").delete().eq("id", last.id);
    setServer((rows) => rows.filter((row) => row.id !== last.id));
  }

  const waiting = held.filter((row) =>
    exercises.some((exercise) => exercise.id === row.session_exercise_id),
  ).length;

  return (
    <>
      {/* Offline is a state, not an error: reported, never as a failure. */}
      {(waiting > 0 || !online) && (
        <p className="tnum -mt-2 text-[13px] text-[var(--a3)]">
          {waiting > 0 ? t("heldCount", { count: waiting }) : t("offline")}
        </p>
      )}

      {rest && <RestBar rest={rest} onChange={setRest} />}

      <div className={`space-y-3.5 ${rest ? "pb-24" : ""}`}>
        {exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            logged={setsFor(exercise.id)}
            expanded={open === exercise.id}
            onToggle={() => setOpen(open === exercise.id ? null : exercise.id)}
            onLog={(reps, weight, rpe) => log(exercise, reps, weight, rpe)}
            onUndo={() => undo(exercise.id)}
          />
        ))}
      </div>
    </>
  );
}

function ExerciseCard({
  exercise,
  logged,
  expanded,
  onToggle,
  onLog,
  onUndo,
}: {
  exercise: WeekExercise;
  logged: LoggedSet[];
  expanded: boolean;
  onToggle: () => void;
  onLog: (reps: number | null, weight: number | null, rpe: number | null) => Promise<void>;
  onUndo: () => Promise<void>;
}) {
  const t = useTranslations("log");
  const tToday = useTranslations("today");

  // The next set starts where the last one ended; the first, at what the
  // coach asked for. Typing a number should be the exception.
  const last = logged.at(-1);
  const [reps, setReps] = useState(last?.reps ?? exercise.target_reps ?? 0);
  const [weight, setWeight] = useState(Number(last?.weight_kg ?? exercise.target_weight_kg ?? 0));
  const [rpe, setRpe] = useState<number | null>(last?.rpe ?? null);

  const target = (() => {
    const parts: string[] = [];
    if (exercise.target_sets && exercise.target_reps) {
      parts.push(`${exercise.target_sets} × ${exercise.target_reps}`);
    } else if (exercise.scheme) parts.push(exercise.scheme);
    if (exercise.target_weight_kg) parts.push(`${clean(Number(exercise.target_weight_kg))} kg`);
    return parts.length ? `${t("target")} · ${parts.join(" · ")}` : null;
  })();

  return (
    <Card className={expanded ? "space-y-4" : "space-y-2"}>
      <button type="button" onClick={onToggle} className="block w-full space-y-1 text-left">
        <span className="flex items-baseline justify-between gap-2.5">
          <span className="font-display text-[19px] font-extrabold leading-tight tracking-[-.03em]">
            {exercise.name}
          </span>
          <span
            className={`tnum shrink-0 text-[13px] font-bold ${
              logged.length ? "text-[var(--a1)]" : "text-[var(--ink3)]"
            }`}
          >
            {tToday("sets", { count: logged.length })}
          </span>
        </span>
        {target && <span className="tnum block text-[13px] text-[var(--ink2)]">{target}</span>}
      </button>

      {logged.length > 0 && (
        <ul className="space-y-1.5">
          {logged.map((set) => (
            <li
              key={set.id}
              className="flex items-center gap-2.5 rounded-r1 bg-[var(--glass2)] px-3 py-[9px]"
            >
              <span className="tnum w-[18px] text-[13px] font-bold text-[var(--ink3)]">
                {set.set_index + 1}
              </span>
              <span className="tnum flex-1 text-[15px] font-semibold">
                {[
                  set.reps != null ? String(set.reps) : null,
                  set.weight_kg != null ? `${clean(Number(set.weight_kg))} kg` : null,
                  set.rpe != null ? `RPE ${set.rpe}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </span>
              {/* Held, not failed. The dot is the whole message. */}
              {set.synced_at === null && (
                <span
                  role="img"
                  aria-label={t("held")}
                  className="size-1.5 rounded-full bg-[var(--a3)]"
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {expanded && (
        <div className="space-y-3.5">
          {exercise.cue && (
            <p className="text-[13px] leading-[1.45] text-[var(--ink3)]">{exercise.cue}</p>
          )}

          <Stepper
            label={t("reps")}
            value={reps}
            format={String}
            onChange={(n) => setReps(Math.max(0, Math.round(n)))}
            step={1}
          />
          <Stepper
            label={t("weight")}
            value={weight}
            format={clean}
            onChange={(n) => setWeight(Math.max(0, n))}
            step={2.5}
          />

          <div className="space-y-2">
            <p className="text-[13px] text-[var(--ink2)]">{t("rpe")}</p>
            <div className="flex gap-1.5">
              {[6, 7, 8, 9, 10].map((n) => (
                <Choice key={n} selected={rpe === n} onClick={() => setRpe(rpe === n ? null : n)}>
                  <span className="tnum">{n}</span>
                </Choice>
              ))}
            </div>
          </div>

          <div className="flex gap-2.5">
            <Cta onClick={() => void onLog(reps > 0 ? reps : null, weight > 0 ? weight : null, rpe)}>
              {t("addSet")}
            </Cta>
            {logged.length > 0 && (
              <RoundButton label={t("undo")} onClick={() => void onUndo()} size={52}>
                ↶
              </RoundButton>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

/** A number with a thumb on each side, read at arm's length mid-set. */
function Stepper({
  label,
  value,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  format: (n: number) => string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-11 text-[13px] text-[var(--ink2)]">{label}</span>
      <RoundButton label={`${label} −`} onClick={() => onChange(value - step)} size={52}>
        −
      </RoundButton>
      <span className="tnum flex-1 text-center font-display text-[26px] font-extrabold tracking-[-.03em]">
        {format(value)}
      </span>
      <RoundButton label={`${label} +`} onClick={() => onChange(value + step)} size={52}>
        +
      </RoundButton>
    </div>
  );
}
