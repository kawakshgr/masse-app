"use client";

import { ChoiceTiles } from "@/components/ChoiceTiles";
import { restLabel } from "@/lib/rest";
import { Fragment, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useTranslations, useLocale } from "next-intl";
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
import { Card, Choice, Cta, RoundButton, Secondary, shown } from "./ui";
import { Icon } from "@/components/Icon";
import { reportPain } from "@/app/(client)/actions";
import type { PainLevel } from "@/lib/supabase/types";

type LoggedSet = Pick<
  QueuedSet,
  "id" | "session_exercise_id" | "set_index" | "reps" | "weight_kg" | "rpe" | "synced_at" | "done_as"
>;

type Last = Record<string, { line: string; weightKg: number | null }>;

/**
 * The session, being done — TrainView.swift. Every control a thumb's width,
 * the numbers carried over from the last set so a working set costs one tap,
 * and nothing waits on the network.
 */
export function TrainLog({
  clientId,
  exercises,
  onServer,
  canReportPain,
  last,
}: {
  clientId: string;
  exercises: WeekExercise[];
  /** Per movement name, stand-ins included: "La dernière fois (23 sept.) · 3 × 8 · 60 kg", when it was done before. */
  last: Last;
  /** Pain is health data: offered only while consent to it stands. */
  canReportPain: boolean;
  /** What the server already holds for today: both halves are shown. */
  onServer: LoggedSet[];
}) {
  const t = useTranslations("log");
  const held = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [server, setServer] = useState<LoggedSet[]>(onServer);
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

  async function log(
    exercise: WeekExercise,
    reps: number | null,
    weight: number | null,
    rpe: number | null,
    doneAs: string | null,
  ) {
    const last = setsFor(exercise.id).at(-1);
    enqueue({
      client_id: clientId,
      session_exercise_id: exercise.id,
      set_index: (last?.set_index ?? -1) + 1,
      reps,
      weight_kg: weight,
      rpe,
      done_as: doneAs,
    });
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

      {/* Rest time is written on each exercise; there is no timer here
          (29 Sep 2026): clients run their own, in Hevy or on their phone. */}
      <div className="space-y-3.5">
        {exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            logged={setsFor(exercise.id)}
            expanded={open === exercise.id}
            onToggle={() => setOpen(open === exercise.id ? null : exercise.id)}
            onLog={(reps, weight, rpe, doneAs) => log(exercise, reps, weight, rpe, doneAs)}
            onUndo={() => undo(exercise.id)}
            canReportPain={canReportPain}
            last={last}
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
  canReportPain,
  last: lastByName,
}: {
  exercise: WeekExercise;
  last: Last;
  logged: LoggedSet[];
  expanded: boolean;
  onToggle: () => void;
  onLog: (reps: number | null, weight: number | null, rpe: number | null, doneAs: string | null) => Promise<void>;
  onUndo: () => Promise<void>;
  canReportPain: boolean;
}) {
  const t = useTranslations("log");
  const tToday = useTranslations("today");
  const locale = useLocale();
  // Sets planned by the coach, and how many she logged past them.
  const planned = exercise.target_sets ?? 0;
  const extra = planned > 0 ? Math.max(0, logged.length - planned) : 0;

  // The next set starts where the last one ended; the first, at what the
  // coach asked for. Typing a number should be the exception.
  const last = logged.at(-1);
  const [reps, setReps] = useState(last?.reps ?? exercise.target_reps ?? 0);
  const [weight, setWeight] = useState(Number(last?.weight_kg ?? exercise.target_weight_kg ?? 0));
  const [rpe, setRpe] = useState<number | null>(last?.rpe ?? null);

  // The stand-in she is doing instead, when the machine was taken: kept on
  // the device for this week's exercise, and on every set logged with it.
  const alternatives = exercise.alternatives ?? [];
  const standInKey = `masse:standin:${exercise.id}`;
  const kept = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return window.localStorage.getItem(standInKey);
      } catch {
        // Storage blocked: the choice lasts as long as the page.
        return null;
      }
    },
    () => null,
  );
  // Undefined until she picks on this page: then the sets, then the device.
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  const doneAs =
    picked !== undefined
      ? picked
      : last
        ? (last.done_as ?? null)
        : kept && alternatives.includes(kept)
          ? kept
          : null;
  const [choosing, setChoosing] = useState(false);
  function choose(name: string | null) {
    setPicked(name);
    setChoosing(false);
    try {
      if (name) window.localStorage.setItem(standInKey, name);
      else window.localStorage.removeItem(standInKey);
    } catch {}
    // A different movement starts from its own last load, not this one's.
    const from = name ? lastByName[name]?.weightKg : exercise.target_weight_kg;
    setWeight(Number(from ?? 0));
  }
  const shownName = doneAs ?? exercise.name;
  const lastTime = lastByName[shownName]?.line ?? null;

  const target = (() => {
    const parts: string[] = [];
    if (exercise.target_sets && exercise.target_reps) {
      parts.push(`${exercise.target_sets} × ${exercise.target_reps}`);
    } else if (exercise.scheme) parts.push(exercise.scheme);
    // The coach's load is for her movement, not for the stand-in.
    if (exercise.target_weight_kg && !doneAs) parts.push(`${shown(Number(exercise.target_weight_kg), locale)} kg`);
    const rest = restLabel(exercise.rest_min_s, exercise.rest_max_s);
    if (rest) parts.push(t("restTime", { time: rest }));
    return parts.length ? `${t("target")} · ${parts.join(" · ")}` : null;
  })();

  return (
    <Card className={expanded ? "space-y-4" : "space-y-2"}>
      <button type="button" onClick={onToggle} className="block w-full space-y-1 text-left">
        <span className="flex items-baseline justify-between gap-2.5">
          <span className="min-w-0">
            <span className="block font-display text-[19px] font-extrabold leading-tight tracking-[-.03em]">
              {shownName}
            </span>
            {doneAs && (
              <span className="block text-[12.5px] font-semibold text-[var(--accent)]">
                {t("insteadOf", { name: exercise.name })}
              </span>
            )}
          </span>
          <span
            className={`tnum shrink-0 text-[13px] font-bold ${
              logged.length ? "text-[var(--a1)]" : "text-[var(--ink3)]"
            }`}
          >
            {tToday("sets", { count: logged.length })}
            {/* What was planned, beside what is done — stated, never judged:
                going past the plan is the client's call. */}
            {exercise.target_sets != null && extra === 0 && (
              <span className="font-normal text-[var(--ink3)]">
                {" · "}
                {tToday("setsPlanned", { count: exercise.target_sets })}
              </span>
            )}
            {/* Past the plan: said with a count, in the accent, not in red. */}
            {extra > 0 && (
              <span className="ml-1.5 rounded-rp border border-[var(--accent)] px-1.5 py-px text-[11.5px] text-[var(--accent)]">
                {tToday("extraCount", { count: extra })}
              </span>
            )}
          </span>
        </span>
        {target && <span className="tnum block text-[13px] text-[var(--ink2)]">{target}</span>}
        {/* The figure to beat, from her own last sets on this movement. */}
        {lastTime && <span className="tnum block text-[13px] text-[var(--ink3)]">{lastTime}</span>}
      </button>

      {logged.length > 0 && (
        <ul className="space-y-1.5">
          {logged.map((set, index) => (
            <Fragment key={set.id}>
            {/* Where the plan ends, when she went past it. */}
            {extra > 0 && index === planned && (
              <li className="flex items-center gap-2 pt-1 text-[11px] font-bold uppercase tracking-[.12em] text-[var(--accent)]">
                <span className="h-px flex-1 bg-[var(--accent)] opacity-40" />
                {tToday("beyondPlan", { count: planned })}
                <span className="h-px flex-1 bg-[var(--accent)] opacity-40" />
              </li>
            )}
            <li
              className={`flex items-center gap-2.5 rounded-r1 px-3 py-[9px] ${
                extra > 0 && index >= planned
                  ? "border border-dashed border-[var(--accent)] bg-transparent"
                  : "bg-[var(--glass2)]"
              }`}
            >
              <span className="tnum w-[18px] text-[13px] font-bold text-[var(--ink3)]">
                {set.set_index + 1}
              </span>
              <span className="tnum flex-1 text-[15px] font-semibold">
                {[
                  set.reps != null ? String(set.reps) : null,
                  set.weight_kg != null ? `${shown(Number(set.weight_kg), locale)} kg` : null,
                  set.rpe != null ? `RPE ${set.rpe}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </span>
              {/* A set done as another movement than the one now shown. */}
              {(set.done_as ?? null) !== doneAs && (
                <span className="max-w-[40%] shrink truncate text-[11.5px] text-[var(--ink3)]">
                  {set.done_as ?? exercise.name}
                </span>
              )}
              {extra > 0 && index >= planned && (
                <span className="shrink-0 text-[11px] font-bold uppercase tracking-[.1em] text-[var(--accent)]">
                  {tToday("extraSet")}
                </span>
              )}
              {/* Held, not failed. The dot is the whole message. */}
              {set.synced_at === null && (
                <span
                  role="img"
                  aria-label={t("held")}
                  className="size-1.5 rounded-full bg-[var(--a3)]"
                />
              )}
            </li>
            </Fragment>
          ))}
        </ul>
      )}

      {expanded && (
        <div className="space-y-3.5">
          {exercise.cue && (
            <p className="text-[13px] leading-[1.45] text-[var(--ink3)]">{exercise.cue}</p>
          )}

          {/* Machine taken: one of the stand-ins the coach accepted. */}
          {alternatives.length > 0 &&
            (choosing ? (
              <div className="space-y-2.5">
                <p className="text-[13px] font-semibold">{t("swapQuestion")}</p>
                <ChoiceTiles
                  label={t("swapQuestion")}
                  value={doneAs ?? exercise.name}
                  onChange={(name) => choose(name === exercise.name ? null : name)}
                  options={[exercise.name, ...alternatives].map((name) => ({
                    value: name,
                    label: name,
                    icon: name === exercise.name ? "programmes" : "swap",
                  }))}
                />
                <Secondary onClick={() => setChoosing(false)}>{t("swapCancel")}</Secondary>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setChoosing(true)}
                className="glass2 flex h-12 w-full items-center justify-center gap-2 rounded-rp border border-[var(--edge)] text-[14px] font-semibold"
              >
                <Icon name="swap" size={20} />
                {doneAs ? t("swapBack") : t("swap")}
              </button>
            ))}

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
            format={(n) => shown(n, locale)}
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
            <Cta onClick={() => void onLog(reps > 0 ? reps : null, weight > 0 ? weight : null, rpe, doneAs)}>
              {t("addSet")}
            </Cta>
            {logged.length > 0 && (
              <RoundButton label={t("undo")} onClick={() => void onUndo()} size={52}>
                ↶
              </RoundButton>
            )}
          </div>

          {canReportPain && <PainReport exercise={exercise} name={shownName} />}
        </div>
      )}
    </Card>
  );
}

const PAIN_LEVELS: PainLevel[] = ["mild", "sharp", "stopped"];
const PAIN_ICONS: Record<PainLevel, string> = { mild: "pain", sharp: "bolt", stopped: "cancel" };

/** "It hurts": the coach hears it at once, on the exercise it happened on. */
function PainReport({ exercise, name }: { exercise: WeekExercise; name: string }) {
  const t = useTranslations("pain");
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<PainLevel | null>(null);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  if (state === "sent") {
    return <p className="text-[13px] leading-[1.45] text-[var(--a1)]">{t("sent")}</p>;
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[13px] font-semibold text-[var(--a3)] underline-offset-4 hover:underline"
      >
        {t("report")}
      </button>
    );
  }
  return (
    <div className="space-y-2.5 rounded-r2 border border-[var(--a3)] p-3">
      <p className="text-[13px] font-semibold">{t("question")}</p>
      <ChoiceTiles
        label={t("question")}
        columns={3}
        value={level}
        onChange={setLevel}
        options={PAIN_LEVELS.map((value) => ({ value, label: t(`level.${value}`), icon: PAIN_ICONS[value] }))}
      />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        placeholder={t("notePlaceholder")}
        aria-label={t("notePlaceholder")}
        className="min-h-[64px] w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--ink3)]"
      />
      <div className="flex gap-2">
        <Cta
          disabled={!level || state === "sending"}
          onClick={async () => {
            if (!level) return;
            setState("sending");
            const { ok } = await reportPain({
              sessionExerciseId: exercise.id,
              exerciseName: name,
              level,
              note,
            });
            setState(ok ? "sent" : "failed");
          }}
        >
          {t("send")}
        </Cta>
        <Secondary onClick={() => setOpen(false)}>{t("cancel")}</Secondary>
      </div>
      {state === "failed" && <p className="text-[12.5px] text-[var(--a3)]">{t("failed")}</p>}
    </div>
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
