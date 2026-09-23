"use client";

import { useState, useTransition } from "react";
import {
  ExerciseLibrary,
  type CatalogueEntry,
} from "@/components/ExerciseLibrary";
import { useTranslations } from "next-intl";
import {
  addExercise,
  addExerciseToDay,
  addSession,
  deleteExercise,
  deleteSession,
  moveExercise,
  pushWeek,
  renameSession,
  retractWeek,
  setRestDay,
  setTrainingDay,
  updateExercise,
} from "@/app/(coach)/programmes/actions";

/** What a drag is carrying: an existing row, or a catalogue name. */
type DragPayload =
  { kind: "move"; exerciseId: string } | { kind: "new"; name: string };

const DRAG_TYPE = "application/x-masse-exercise";

function writeDrag(event: React.DragEvent, payload: DragPayload) {
  // Without setData the browser cancels the drag outright — always on Firefox,
  // intermittently elsewhere. This was why nothing could be dragged at all.
  event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(payload));
  event.dataTransfer.setData(
    "text/plain",
    payload.kind === "new" ? payload.name : payload.exerciseId,
  );
  event.dataTransfer.effectAllowed = "copyMove";
}

function readDrag(event: React.DragEvent): DragPayload | null {
  const raw = event.dataTransfer.getData(DRAG_TYPE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DragPayload;
  } catch {
    return null;
  }
}

export type EditorExercise = {
  id: string;
  position: number;
  name: string;
  scheme: string | null;
  cue: string | null;
};

export type EditorSession = {
  kind: "training" | "rest";
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
  catalogue,
}: {
  programmeId: string;
  weekId: string;
  sessions: EditorSession[];
  clients: { id: string; name: string }[];
  assignedClientIds: string[];
  catalogue: CatalogueEntry[];
}) {
  const t = useTranslations("editor");
  const tProgramme = useTranslations("programme");
  const tEditor2 = useTranslations("editor2");
  const tDays = useTranslations("days");
  const [pending, startTransition] = useTransition();
  const [dragging, setDragging] = useState<string | null>(null);
  const [overDay, setOverDay] = useState<number | null>(null);
  const [selected, setSelected] = useState<string[]>(assignedClientIds);
  const [startDate, setStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  const byDay = (day: number) => sessions.find((s) => s.day_index === day);

  function onDrop(
    event: React.DragEvent,
    day: number,
    sessionId: string | null,
    position: number,
  ) {
    event.preventDefault();
    event.stopPropagation();
    const payload = readDrag(event);
    setDragging(null);
    setOverDay(null);
    if (!payload) return;

    startTransition(() => {
      if (payload.kind === "new") {
        void addExerciseToDay(weekId, day, payload.name, programmeId);
      } else if (sessionId) {
        void moveExercise(payload.exerciseId, sessionId, position, programmeId);
      }
    });
  }

  function allowDrop(event: React.DragEvent, day: number) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setOverDay(day);
  }

  /** Days that can take an exercise. A rest day is not one of them. */
  const trainingDays = sessions
    .filter((session) => session.kind !== "rest")
    .map((session) => ({
      index: session.day_index,
      label: tDays(String(session.day_index)),
    }));

  /** The reliable path: drag is a convenience, this always works. */
  function moveToDay(exerciseId: string, day: number) {
    const target = byDay(day);
    startTransition(() => {
      if (target) {
        void moveExercise(
          exerciseId,
          target.id,
          target.exercises.length,
          programmeId,
        );
      }
    });
  }

  return (
    <div className={pending ? "opacity-70 transition-opacity" : ""}>
      <div className="flex min-h-0 gap-3">
        <aside className="glass hidden w-[268px] shrink-0 overflow-hidden rounded-r3 lg:block">
          <ExerciseLibrary
            catalogue={catalogue}
            weekId={weekId}
            programmeId={programmeId}
            days={trainingDays}
          />
        </aside>

        <div className="min-w-0 flex-1">
          {/* Suggestions, never a restriction: any name she types is accepted, and
          a new one joins her library on save. */}
          <datalist id="masse-exercise-catalogue">
            {catalogue.map((entry) => (
              <option key={entry.id} value={entry.name} />
            ))}
          </datalist>

          {/* Seven day columns. Empty days are visibly empty and clickable. */}
          <div className="grid grid-cols-[repeat(7,minmax(172px,1fr))] gap-2 overflow-x-auto pb-2">
            {[0, 1, 2, 3, 4, 5, 6].map((day) => {
              const session = byDay(day);

              return (
                <div key={day} className="flex min-w-0 flex-col">
                  <p className="mb-2 px-1 text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
                    {tDays(String(day))}
                  </p>

                  {!session ? (
                    <div
                      onDragOver={(event) => allowDrop(event, day)}
                      onDragLeave={() => setOverDay(null)}
                      onDrop={(event) => onDrop(event, day, null, 0)}
                      className={`flex h-28 flex-col items-center justify-center rounded-r3 border border-dashed text-[12px] text-[var(--ink3)] ${
                        overDay === day
                          ? "border-[var(--accent)] text-[var(--accent)]"
                          : "border-[var(--edge)]"
                      }`}
                    >
                      <span>{t("emptyDay")}</span>
                      <button
                        type="button"
                        onClick={() =>
                          startTransition(() => {
                            void addSession(weekId, day, programmeId);
                          })
                        }
                        className="mt-1 rounded-r1 px-2 py-0.5 text-[12px] text-[var(--accent)]"
                      >
                        {t("addSession")}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          startTransition(() => {
                            void setRestDay(weekId, day, programmeId);
                          })
                        }
                        className="mt-1.5 rounded-r1 px-2 py-0.5 text-[11.5px] text-[var(--ink3)] hover:text-[var(--ink)]"
                      >
                        {t("markRest")}
                      </button>
                    </div>
                  ) : session.kind === "rest" ? (
                    /* A decision, not an absence — and it says which one it is. */
                    <div className="glass flex flex-1 flex-col items-center justify-center gap-2 rounded-r3 p-2 text-center">
                      <span className="text-[13px] font-semibold">
                        {t("restDay")}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          startTransition(() => {
                            void setTrainingDay(session.id, programmeId);
                          })
                        }
                        className="rounded-r1 px-2 py-0.5 text-[11.5px] text-[var(--ink3)] hover:text-[var(--accent)]"
                      >
                        {t("makeTraining")}
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(event) => allowDrop(event, day)}
                      onDragLeave={() => setOverDay(null)}
                      onDrop={(event) =>
                        onDrop(event, day, session.id, session.exercises.length)
                      }
                      className={`glass flex-1 rounded-r3 p-2 ${
                        overDay === day ? "border-[var(--accent)]" : ""
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <input
                          defaultValue={session.name ?? ""}
                          placeholder={t("sessionName")}
                          onBlur={(e) =>
                            startTransition(() => {
                              void renameSession(
                                session.id,
                                e.target.value,
                                programmeId,
                              );
                            })
                          }
                          className="min-w-0 flex-1 rounded-r1 bg-transparent px-1 py-1 text-[13px] font-semibold text-[var(--ink)] placeholder:text-[var(--ink3)]"
                        />
                        <button
                          type="button"
                          aria-label={t("remove")}
                          onClick={() =>
                            startTransition(() => {
                              void deleteSession(session.id, programmeId);
                            })
                          }
                          className="shrink-0 px-1 text-[13px] text-[var(--ink3)] hover:text-[var(--a3)]"
                        >
                          ×
                        </button>
                      </div>

                      <ul className="mt-1 space-y-1">
                        {session.exercises.map((exercise, index) => (
                          <li
                            key={exercise.id}
                            onDragOver={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                            }}
                            onDrop={(event) =>
                              onDrop(event, day, session.id, index)
                            }
                            className={`rounded-r2 border border-[var(--hair)] bg-[var(--glass2)] p-2 ${
                              dragging === exercise.id ? "opacity-40" : ""
                            }`}
                          >
                            <div className="flex items-start gap-1">
                              {/* The handle carries the drag, not the row: the row
                              is nearly all inputs, which swallow a grab. */}
                              <span
                                draggable
                                role="button"
                                tabIndex={0}
                                aria-label={tEditor2("drag")}
                                title={tEditor2("drag")}
                                onDragStart={(event) => {
                                  writeDrag(event, {
                                    kind: "move",
                                    exerciseId: exercise.id,
                                  });
                                  setDragging(exercise.id);
                                }}
                                onDragEnd={() => {
                                  setDragging(null);
                                  setOverDay(null);
                                }}
                                className="-m-1 cursor-grab select-none p-1 text-[13px] leading-none text-[var(--ink3)] active:cursor-grabbing"
                              >
                                ⠿
                              </span>
                              <div className="min-w-0 flex-1">
                                <input
                                  defaultValue={exercise.name}
                                  list="masse-exercise-catalogue"
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
                                  className="w-full rounded-r1 bg-transparent text-[13px] font-semibold text-[var(--ink)]"
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
                                  className="tnum w-full rounded-r1 bg-transparent text-[12px] text-[var(--ink2)] placeholder:text-[var(--ink3)]"
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
                                  className="w-full rounded-r1 bg-transparent text-[12px] text-[var(--ink3)] placeholder:text-[var(--ink3)]"
                                />
                              </div>
                              <button
                                type="button"
                                aria-label={t("remove")}
                                onClick={() =>
                                  startTransition(() => {
                                    void deleteExercise(
                                      exercise.id,
                                      programmeId,
                                    );
                                  })
                                }
                                className="shrink-0 text-[12px] text-[var(--ink3)] hover:text-[var(--a3)]"
                              >
                                ×
                              </button>
                            </div>

                            <select
                              aria-label={tEditor2("moveTo")}
                              value=""
                              onChange={(event) => {
                                const target = Number(event.target.value);
                                if (Number.isInteger(target)) {
                                  moveToDay(exercise.id, target);
                                }
                              }}
                              className="mt-1 h-6 w-full rounded-r1 bg-transparent text-[11px] text-[var(--ink3)]"
                            >
                              <option value="">{tEditor2("moveTo")}…</option>
                              {[0, 1, 2, 3, 4, 5, 6]
                                .filter((d) => d !== day && byDay(d))
                                .map((d) => (
                                  <option key={d} value={d}>
                                    {tDays(String(d))}
                                  </option>
                                ))}
                            </select>
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
                        className="mt-2 w-full rounded-r1 py-1 text-[12px] text-[var(--accent)]"
                      >
                        {t("addExercise")}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* The delivery boundary, made an explicit act. */}
      <section className="glass mt-4 rounded-r3 p-4">
        <h3 className="text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
          {t("assign")}
        </h3>
        <p className="mt-1 text-[12px] text-[var(--ink2)]">{t("assignLede")}</p>

        {clients.length === 0 ? (
          <p className="mt-3 text-[13px] text-[var(--ink3)]">
            {t("noClients")}
          </p>
        ) : (
          <>
            <ul className="mt-3 flex flex-wrap gap-2">
              {clients.map((client) => {
                const on = selected.includes(client.id);
                return (
                  <li key={client.id}>
                    <span className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          setSelected((prev) =>
                            on
                              ? prev.filter((id) => id !== client.id)
                              : [...prev, client.id],
                          )
                        }
                        className={`h-8 rounded-r2 border px-3 text-[13px] ${
                          on
                            ? "border-[var(--accent)] bg-[var(--glass2)] text-[var(--accent)]"
                            : "border-[var(--edge)] text-[var(--ink2)]"
                        }`}
                      >
                        {client.name}
                        {assignedClientIds.includes(client.id) && (
                          <span className="ml-2 text-[11px] text-[var(--ink3)]">
                            {t("pushed")}
                          </span>
                        )}
                      </button>

                      {assignedClientIds.includes(client.id) && (
                        <button
                          type="button"
                          title={tProgramme("retractHint")}
                          onClick={() =>
                            startTransition(() => {
                              void retractWeek(weekId, client.id, programmeId);
                            })
                          }
                          className="h-8 shrink-0 rounded-r2 border border-[var(--edge)] px-2 text-[11px] text-[var(--ink3)] hover:border-[var(--a3)] hover:text-[var(--a3)]"
                        >
                          {tProgramme("retract")}
                        </button>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-3 flex items-end gap-2">
              <label className="block">
                <span className="block text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
                  {t("startDate")}
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="tnum mt-1 h-9 rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2 text-[13px] text-[var(--ink)]"
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
                className="h-9 rounded-r2 cta px-4 text-[13px] font-semibold text-[var(--on-accent)] disabled:opacity-40"
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
