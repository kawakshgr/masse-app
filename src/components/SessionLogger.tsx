"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import {
  enqueue,
  flush,
  getServerSnapshot,
  getSnapshot,
  subscribe,
} from "@/lib/setQueue";

export type LoggerExercise = {
  id: string;
  name: string;
  scheme: string | null;
  cue: string | null;
  target_sets: number | null;
  target_reps: number | null;
  target_weight_kg: number | null;
};

const REST_SECONDS = 120;

export function SessionLogger({
  clientId,
  sessionName,
  exercises,
}: {
  clientId: string;
  sessionName: string | null;
  exercises: LoggerExercise[];
}) {
  const t = useTranslations("log");
  // The queue and the connection are both external state: read them through a
  // store rather than copying them into state inside an effect.
  const rows = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
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

  const [rest, setRest] = useState<number | null>(null);

  const held = useMemo(
    () => rows.filter((row) => row.synced_at === null).length,
    [rows],
  );

  const doneByExercise = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.session_exercise_id] = (counts[row.session_exercise_id] ?? 0) + 1;
    }
    return counts;
  }, [rows]);

  // Flush whenever the connection is up — on mount, and on every reconnect.
  useEffect(() => {
    if (!online) return;
    void flush();
  }, [online]);

  // Rest countdown.
  useEffect(() => {
    if (rest === null) return;
    const id = window.setTimeout(
      () => setRest((r) => (r === null || r <= 1 ? null : r - 1)),
      1000,
    );
    return () => window.clearTimeout(id);
  }, [rest]);

  async function logSet(exercise: LoggerExercise, form: HTMLFormElement) {
    const data = new FormData(form);
    const num = (key: string) => {
      const raw = String(data.get(key) ?? "").replace(",", ".").trim();
      if (raw === "") return null;
      const n = Number(raw);
      return Number.isNaN(n) ? null : n;
    };

    enqueue({
      client_id: clientId,
      session_exercise_id: exercise.id,
      set_index: (doneByExercise[exercise.id] ?? 0) + 1,
      reps: num("reps"),
      weight_kg: num("weight_kg"),
      rpe: num("rpe"),
    });

    setRest(REST_SECONDS);
    form.reset();

    if (navigator.onLine) await flush();
  }

  return (
    <section className="glass rounded-r3 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-[18px] font-extrabold tracking-[-.03em]">
          {sessionName ?? t("title")}
        </h2>
        {held > 0 && (
          <span className="tnum rounded-r1 border border-[var(--a2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--a2)]">
            {t("heldCount", { count: held })}
          </span>
        )}
      </div>

      {!online && (
        <p className="mt-2 rounded-r2 border border-[var(--edge)] bg-[var(--glass)] px-3 py-2 text-[11px] text-[var(--ink2)]">
          {t("offline")}
        </p>
      )}

      {rest !== null && (
        <p className="tnum mt-2 text-[12px] font-semibold text-[var(--accent-soft)]">
          {t("rest")} · {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}
        </p>
      )}

      <ul className="mt-3 space-y-3">
        {exercises.map((exercise) => {
          const done = doneByExercise[exercise.id] ?? 0;
          return (
            <li key={exercise.id} className="rounded-r2 border border-[var(--hair)] p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-bold">
                    {exercise.name}
                  </span>
                  {exercise.cue && (
                    <span className="block truncate text-[11px] text-[var(--ink3)]">
                      {exercise.cue}
                    </span>
                  )}
                </span>
                <span className="tnum shrink-0 text-[11px] text-[var(--ink2)]">
                  {exercise.scheme ?? "—"}
                </span>
              </div>

              <p className="tnum mt-1 text-[11px] text-[var(--ink3)]">
                {t("done")} {done}
                {exercise.target_sets ? ` / ${exercise.target_sets}` : ""}
              </p>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void logSet(exercise, event.currentTarget);
                }}
                className="mt-2 flex flex-wrap items-end gap-2"
              >
                <label className="block w-[72px]">
                  <span className="block text-[10px] text-[var(--ink3)]">{t("reps")}</span>
                  <input
                    name="reps"
                    inputMode="numeric"
                    defaultValue={exercise.target_reps ?? ""}
                    className="tnum mt-1 h-9 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass)] px-2 text-[13px] text-[var(--ink)]"
                  />
                </label>
                <label className="block w-[86px]">
                  <span className="block text-[10px] text-[var(--ink3)]">{t("weight")}</span>
                  <input
                    name="weight_kg"
                    inputMode="decimal"
                    defaultValue={exercise.target_weight_kg ?? ""}
                    className="tnum mt-1 h-9 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass)] px-2 text-[13px] text-[var(--ink)]"
                  />
                </label>
                <label className="block w-[68px]">
                  <span className="block text-[10px] text-[var(--ink3)]">{t("rpe")}</span>
                  <input
                    name="rpe"
                    inputMode="numeric"
                    className="tnum mt-1 h-9 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass)] px-2 text-[13px] text-[var(--ink)]"
                  />
                </label>
                <button
                  type="submit"
                  className="h-9 shrink-0 rounded-r2 bg-[var(--accent)] px-4 text-[12px] font-semibold text-[var(--on-accent)]"
                >
                  {t("addSet")}
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
