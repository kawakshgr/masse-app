"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  addExercise,
  addSession,
  deleteExercise,
  deleteSession,
  moveExercise,
  pushWeek,
  renameSession,
  updateExercise,
} from "@/app/(coach)/programmes/actions";

export type EditorExercise = {
  id: string;
  position: number;
  name: string;
  scheme: string | null;
  cue: string | null;
};

export type EditorSession = {
  id: string;
  day_index: number;
  name: string | null;
  exercises: EditorExercise[];
};

export function WeekEditor({
  programmeId,
  weekId,
  sessions,
  clients,
  assignedClientIds,
}: {
  programmeId: string;
  weekId: string;
  sessions: EditorSession[];
  clients: { id: string; name: string }[];
  assignedClientIds: string[];
}) {
  const t = useTranslations("editor");
  const tDays = useTranslations("days");
  const [pending, startTransition] = useTransition();
  const [dragging, setDragging] = useState<string | null>(null);
  const [overSession, setOverSession] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>(assignedClientIds);
  const [startDate, setStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  const byDay = (day: number) => sessions.find((s) => s.day_index === day);

  function drop(sessionId: string, position: number) {
    if (!dragging) return;
    const id = dragging;
    setDragging(null);
    setOverSession(null);
    startTransition(() => {
      void moveExercise(id, sessionId, position, programmeId);
    });
  }

  return (
    <div className={pending ? "opacity-70 transition-opacity" : ""}>
      {/* Seven day columns. Empty days are visibly empty and clickable. */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[0, 1, 2, 3, 4, 5, 6].map((day) => {
          const session = byDay(day);

          return (
            <div key={day} className="flex w-[190px] shrink-0 flex-col">
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
                {tDays(String(day))}
              </p>

              {!session ? (
                <button
                  type="button"
                  onClick={() =>
                    startTransition(() => {
                      void addSession(weekId, day, programmeId);
                    })
                  }
                  className="flex h-24 flex-col items-center justify-center rounded-r3 border border-dashed border-[var(--edge)] text-[11px] text-[var(--ink3)] hover:text-[var(--a1)]"
                >
                  <span>{t("emptyDay")}</span>
                  <span className="mt-1 text-[var(--a1)]">{t("addSession")}</span>
                </button>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOverSession(session.id);
                  }}
                  onDragLeave={() => setOverSession(null)}
                  onDrop={() => drop(session.id, session.exercises.length)}
                  className={`glass flex-1 rounded-r3 p-2 ${
                    overSession === session.id ? "border-[var(--a1)]" : ""
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <input
                      defaultValue={session.name ?? ""}
                      placeholder={t("sessionName")}
                      onBlur={(e) =>
                        startTransition(() => {
                          void renameSession(session.id, e.target.value, programmeId);
                        })
                      }
                      className="min-w-0 flex-1 rounded-r1 bg-transparent px-1 py-1 text-[12px] font-bold text-[var(--ink)] placeholder:text-[var(--ink3)]"
                    />
                    <button
                      type="button"
                      aria-label={t("remove")}
                      onClick={() =>
                        startTransition(() => {
                          void deleteSession(session.id, programmeId);
                        })
                      }
                      className="shrink-0 px-1 text-[12px] text-[var(--ink3)] hover:text-[var(--a3)]"
                    >
                      ×
                    </button>
                  </div>

                  <ul className="mt-1 space-y-1">
                    {session.exercises.map((exercise, index) => (
                      <li
                        key={exercise.id}
                        draggable
                        onDragStart={() => setDragging(exercise.id)}
                        onDragEnd={() => setDragging(null)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.stopPropagation();
                          drop(session.id, index);
                        }}
                        className={`rounded-r2 border border-[var(--hair)] bg-[var(--glass)] p-2 ${
                          dragging === exercise.id ? "opacity-40" : ""
                        }`}
                      >
                        <div className="flex items-start gap-1">
                          <span
                            aria-hidden
                            className="cursor-grab pt-1 text-[10px] text-[var(--ink3)]"
                          >
                            ⠿
                          </span>
                          <div className="min-w-0 flex-1">
                            <input
                              defaultValue={exercise.name}
                              aria-label={t("exName")}
                              onBlur={(e) =>
                                startTransition(() => {
                                  void updateExercise(
                                    exercise.id,
                                    { name: e.target.value },
                                    programmeId,
                                  );
                                })
                              }
                              className="w-full rounded-r1 bg-transparent text-[12px] font-semibold text-[var(--ink)]"
                            />
                            <input
                              defaultValue={exercise.scheme ?? ""}
                              placeholder={t("scheme")}
                              aria-label={t("scheme")}
                              onBlur={(e) =>
                                startTransition(() => {
                                  void updateExercise(
                                    exercise.id,
                                    { scheme: e.target.value || null },
                                    programmeId,
                                  );
                                })
                              }
                              className="tnum w-full rounded-r1 bg-transparent text-[11px] text-[var(--ink2)] placeholder:text-[var(--ink3)]"
                            />
                            <input
                              defaultValue={exercise.cue ?? ""}
                              placeholder={t("cue")}
                              aria-label={t("cue")}
                              onBlur={(e) =>
                                startTransition(() => {
                                  void updateExercise(
                                    exercise.id,
                                    { cue: e.target.value || null },
                                    programmeId,
                                  );
                                })
                              }
                              className="w-full rounded-r1 bg-transparent text-[11px] text-[var(--ink3)] placeholder:text-[var(--ink3)]"
                            />
                          </div>
                          <button
                            type="button"
                            aria-label={t("remove")}
                            onClick={() =>
                              startTransition(() => {
                                void deleteExercise(exercise.id, programmeId);
                              })
                            }
                            className="shrink-0 text-[11px] text-[var(--ink3)] hover:text-[var(--a3)]"
                          >
                            ×
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() =>
                      startTransition(() => {
                        void addExercise(session.id, programmeId);
                      })
                    }
                    className="mt-2 w-full rounded-r1 py-1 text-[11px] text-[var(--a1)]"
                  >
                    {t("addExercise")}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* The delivery boundary, made an explicit act. */}
      <section className="glass mt-4 rounded-r3 p-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
          {t("assign")}
        </h3>
        <p className="mt-1 text-[11px] text-[var(--ink2)]">{t("assignLede")}</p>

        {clients.length === 0 ? (
          <p className="mt-3 text-[12px] text-[var(--ink3)]">{t("noClients")}</p>
        ) : (
          <>
            <ul className="mt-3 flex flex-wrap gap-2">
              {clients.map((client) => {
                const on = selected.includes(client.id);
                return (
                  <li key={client.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setSelected((prev) =>
                          on ? prev.filter((id) => id !== client.id) : [...prev, client.id],
                        )
                      }
                      className={`h-8 rounded-r2 border px-3 text-[12px] ${
                        on
                          ? "border-[var(--a1)] bg-[var(--glass2)] text-[var(--a1)]"
                          : "border-[var(--edge)] text-[var(--ink2)]"
                      }`}
                    >
                      {client.name}
                      {assignedClientIds.includes(client.id) && (
                        <span className="ml-2 text-[10px] text-[var(--ink3)]">
                          {t("pushed")}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-3 flex items-end gap-2">
              <label className="block">
                <span className="block text-[10px] uppercase tracking-wide text-[var(--ink3)]">
                  {t("startDate")}
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="tnum mt-1 h-9 rounded-r2 border border-[var(--edge)] bg-[var(--glass)] px-2 text-[12px] text-[var(--ink)]"
                />
              </label>
              <button
                type="button"
                disabled={selected.length === 0}
                onClick={() =>
                  startTransition(() => {
                    void pushWeek(weekId, selected, startDate, programmeId);
                  })
                }
                className="h-9 rounded-r2 bg-[var(--a1)] px-4 text-[12px] font-semibold text-[var(--onA)] disabled:opacity-40"
              >
                {t("push")}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
