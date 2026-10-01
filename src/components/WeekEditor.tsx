"use client";

import { restLabel } from "@/lib/rest";
import { SectionTitle } from "@/components/Pane";
import { useState, useSyncExternalStore, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { DaySelect } from "@/components/DaySelect";
import { MovementPicker } from "@/components/MovementPicker";
import { ExerciseSheet } from "@/components/ExerciseSheet";
import {
  ExerciseLibrary,
  type CatalogueEntry,
} from "@/components/ExerciseLibrary";
import { dragEffect, readDrag, writeDrag } from "@/lib/exerciseDrag";
import { useLocale, useTranslations } from "next-intl";
import { intl } from "@/lib/locale";
import {
  addExercise,
  addExerciseToDay,
  addSession,
  deleteExercise,
  deleteSession,
  moveExercise,
  pushProgramme,
  pushWeek,
  renameSession,
  retractWeek,
  setRestDay,
  setTrainingDay,
  updateExercise,
} from "@/app/(coach)/programmes/actions";

export type EditorExercise = {
  id: string;
  position: number;
  name: string;
  scheme: string | null;
  cue: string | null;
  rest_min_s: number | null;
  rest_max_s: number | null;
};

const LIBRARY_KEY = "masse:library";
const libraryListeners = new Set<() => void>();

function subscribeLibrary(onChange: () => void) {
  libraryListeners.add(onChange);
  return () => libraryListeners.delete(onChange);
}

function readLibrary(): boolean {
  try {
    return window.localStorage.getItem(LIBRARY_KEY) !== "closed";
  } catch {
    // Storage blocked: the library simply stays open.
    return true;
  }
}

function toggleLibrary(open: boolean) {
  try {
    window.localStorage.setItem(LIBRARY_KEY, open ? "open" : "closed");
  } catch {
    // Not remembered; nothing to redraw from either.
  }
  libraryListeners.forEach((listener) => listener());
}

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
  hevyConfigured,
  weekCount,
}: {
  programmeId: string;
  weekId: string;
  /** Weeks in the programme: more than one makes "the whole programme" an option. */
  weekCount: number;
  sessions: EditorSession[];
  clients: { id: string; name: string }[];
  assignedClientIds: string[];
  catalogue: CatalogueEntry[];
  hevyConfigured: boolean;
}) {
  const t = useTranslations("editor");
  const tProgramme = useTranslations("programme");
  const tEditor2 = useTranslations("editor2");
  const tDays = useTranslations("days");
  const [pending, startTransition] = useTransition();
  const [dragging, setDragging] = useState<string | null>(null);
  // The library folds to a rail to give the week the room; remembered.
  const libraryOpen = useSyncExternalStore(subscribeLibrary, readLibrary, () => true);
  const tLibrary = useTranslations("library");
  const locale = intl(useLocale());
  const [overDay, setOverDay] = useState<number | null>(null);
  const [selected, setSelected] = useState<string[]>(assignedClientIds);
  // Today in the coach's own day (not UTC's), read once.
  const [today] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [startDate, setStartDate] = useState(today);
  // This week only, or every week of the programme, a week apart.
  const [scope, setScope] = useState<"week" | "programme">("week");
  // Weeks a client has already begun are never re-dated by a push.
  const [kept, setKept] = useState(0);
  // The movement open in the phone's edit sheet.
  const [editing, setEditing] = useState<{ exercise: EditorExercise; day: number } | null>(null);
  // The day the phone's movement picker adds to; null when it is shut.
  const [picking, setPicking] = useState<number | null>(null);
  const tPicker = useTranslations("picker");

  const byDay = (day: number) => sessions.find((s) => s.day_index === day);

  function onDrop(
    event: React.DragEvent,
    day: number,
    sessionId: string | null,
    position: number,
  ) {
    event.preventDefault();
    event.stopPropagation();
    const payload = readDrag(event.dataTransfer);
    setDragging(null);
    setOverDay(null);
    if (!payload) return;

    startTransition(() => {
      if (payload.kind === "new") {
        void addExerciseToDay(weekId, day, payload.name, programmeId, position);
      } else if (sessionId) {
        void moveExercise(payload.exerciseId, sessionId, position, programmeId);
      }
    });
  }

  /**
   * Only claim the drags we understand, and claim them with the effect the
   * dragstart allowed: "move" over a library row's "copy" reads as forbidden
   * and the drop event never fires.
   */
  function allowDrop(event: React.DragEvent, day: number) {
    const effect = dragEffect(event.dataTransfer);
    if (!effect) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = effect;
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
        {/* As tall as the screen and scrolled inside, so a long library
            never stretches the page; folds to a rail on a click. */}
        {libraryOpen ? (
          <aside className="glass sticky top-0 hidden h-[calc(100dvh-7.5rem)] w-[268px] shrink-0 self-start overflow-hidden rounded-r3 lg:block">
            <ExerciseLibrary
              catalogue={catalogue}
              weekId={weekId}
              programmeId={programmeId}
              days={trainingDays}
              hevyConfigured={hevyConfigured}
              onFold={() => toggleLibrary(false)}
            />
          </aside>
        ) : (
          <button
            type="button"
            onClick={() => toggleLibrary(true)}
            aria-label={tLibrary("show")}
            title={tLibrary("show")}
            className="glass sticky top-0 hidden h-[calc(100dvh-7.5rem)] w-11 shrink-0 self-start flex-col items-center gap-3 rounded-r3 py-4 text-[var(--ink2)] hover:text-[var(--ink)] lg:flex"
          >
            <Icon name="programmes" size={22} />
            <span className="text-[11px] font-bold uppercase tracking-[.14em] [writing-mode:vertical-rl]">
              {tLibrary("show")}
            </span>
          </button>
        )}

        <div className="min-w-0 flex-1">
          {/* Suggestions, never a restriction: any name she types is accepted, and
          a new one joins her library on save. */}
          <datalist id="masse-exercise-catalogue">
            {catalogue.map((entry) => (
              <option key={entry.id} value={entry.name} />
            ))}
          </datalist>

          {/* Seven day columns. Empty days are visibly empty and clickable.
              On a phone each day takes most of the width, the next one
              peeking, and a swipe lands on a day rather than between two. */}
          <div className="grid grid-cols-[repeat(7,minmax(172px,1fr))] gap-2 overflow-x-auto pb-2 max-md:snap-x max-md:snap-mandatory max-md:grid-cols-[repeat(7,84%)] max-md:overscroll-x-contain">
            {[0, 1, 2, 3, 4, 5, 6].map((day) => {
              const session = byDay(day);

              return (
                <div key={day} className="flex min-w-0 snap-start flex-col">
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
                      <PickButton label={tPicker("open")} onClick={() => setPicking(day)} className="mt-2 w-auto px-4" />
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
                    <div
                      onDragOver={(event) => {
                        if (!dragEffect(event.dataTransfer)) return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "none";
                      }}
                      className="glass flex flex-1 flex-col items-center justify-center gap-2 rounded-r3 p-2 text-center"
                    >
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
                            onDragOver={(event) => allowDrop(event, day)}
                            onDrop={(event) =>
                              onDrop(event, day, session.id, index)
                            }
                            className={`rounded-r2 border border-[var(--hair)] bg-[var(--glass2)] p-2 ${
                              dragging === exercise.id ? "opacity-40" : ""
                            }`}
                          >
                            {/* The card reads the movement; a click (a tap on a
                                phone) opens it in ExerciseSheet — a panel on the
                                right on a computer, the whole screen on a phone.
                                The handle carries the drag between days. */}
                            <div className="flex items-start gap-1.5">
                              <span
                                draggable
                                role="button"
                                tabIndex={0}
                                aria-label={tEditor2("drag")}
                                title={tEditor2("drag")}
                                onDragStart={(event) => {
                                  writeDrag(event.dataTransfer, {
                                    kind: "move",
                                    exerciseId: exercise.id,
                                  });
                                  setDragging(exercise.id);
                                }}
                                onDragEnd={() => {
                                  setDragging(null);
                                  setOverDay(null);
                                }}
                                className="-ml-0.5 cursor-grab select-none py-0.5 text-[13px] leading-none text-[var(--ink3)] active:cursor-grabbing max-lg:hidden"
                              >
                                ⠿
                              </span>
                              <button
                                type="button"
                                onClick={() => setEditing({ exercise, day })}
                                className={`min-w-0 flex-1 rounded-r1 text-left ${
                                  editing?.exercise.id === exercise.id ? "text-[var(--accent)]" : ""
                                }`}
                              >
                                <span className="block truncate text-[13.5px] font-semibold max-lg:text-[14px]">{exercise.name}</span>
                                <span className="tnum block truncate text-[12px] text-[var(--ink2)] max-lg:text-[12.5px]">
                                  {[exercise.scheme, restLabel(exercise.rest_min_s, exercise.rest_max_s)]
                                    .filter(Boolean)
                                    .join(" · ") || t("schemeHint")}
                                </span>
                                {exercise.cue && (
                                  <span className="block truncate text-[11.5px] text-[var(--ink3)] max-lg:text-[12px]">{exercise.cue}</span>
                                )}
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
                        className="mt-2 w-full rounded-r1 py-1 text-[12px] text-[var(--accent)] max-lg:hidden"
                      >
                        {t("addExercise")}
                      </button>
                      {/* No library pane under lg, and nothing to drag with:
                          the picker is how a movement gets in there. */}
                      <PickButton label={tPicker("open")} onClick={() => setPicking(day)} className="mt-2 w-full" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {editing && (
        <ExerciseSheet
          key={editing.exercise.id}
          exercise={editing.exercise}
          dayLabel={tDays(String(editing.day))}
          moveTargets={[0, 1, 2, 3, 4, 5, 6]
            .filter((d) => d !== editing.day && byDay(d)?.kind === "training")
            .map((d) => ({ day: d, label: tDays(String(d)).slice(0, 3) }))}
          onSave={(patch) =>
            startTransition(() => {
              void updateExercise(editing.exercise.id, patch, programmeId);
            })
          }
          onMove={(d) => moveToDay(editing.exercise.id, d)}
          onDelete={() =>
            startTransition(() => {
              void deleteExercise(editing.exercise.id, programmeId);
            })
          }
          onClose={() => setEditing(null)}
        />
      )}

      {picking !== null && (
        <MovementPicker
          dayLabel={tDays(String(picking))}
          catalogue={catalogue}
          onAdd={(name) =>
            startTransition(async () => {
              await addExerciseToDay(weekId, picking, name, programmeId);
            })
          }
          onClose={() => setPicking(null)}
        />
      )}

      {/* The delivery boundary, made an explicit act. */}
      <section className="glass mt-4 rounded-r3 p-4">
        <SectionTitle icon="clients">{t("assign")}</SectionTitle>
        <p className="mt-1 text-[12px] text-[var(--ink2)]">{t("assignLede")}</p>

        {clients.length === 0 ? (
          <p className="mt-3 text-[13px] text-[var(--ink3)]">
            {t("noClients")}
          </p>
        ) : (
          <>
            {clients.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setSelected(selected.length === clients.length ? [] : clients.map((c) => c.id))
                }
                className="mt-3 text-[12px] font-semibold text-[var(--accent)]"
              >
                {selected.length === clients.length ? t("selectNone") : t("selectAll", { count: clients.length })}
              </button>
            )}
            <ul className="mt-2 flex flex-wrap gap-2">
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

            <div className="mt-3 flex flex-wrap items-end gap-2">
              {weekCount > 1 && (
                <label className="block">
                  <span className="block text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
                    {t("scope")}
                  </span>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as "week" | "programme")}
                    className="mt-1 h-9 rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2 text-[13px] text-[var(--ink)]"
                  >
                    <option value="week">{t("scopeWeek")}</option>
                    <option value="programme">{t("scopeProgramme", { count: weekCount })}</option>
                  </select>
                </label>
              )}
              <label className="block">
                <span className="block text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
                  {t("startDate")}
                </span>
                {/* A dropdown, not the browser's date field: its calendar
                    opened under the field and out of the window. From this
                    week's Monday, so a week already begun can be pushed. */}
                <DaySelect
                  today={today}
                  weeks={9}
                  fromMonday
                  value={startDate}
                  onChange={setStartDate}
                  label={t("weekOf")}
                  todayLabel={t("today")}
                  locale={locale}
                  className="mt-1 block h-9 rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2 text-[13px] text-[var(--ink)]"
                />
              </label>
              <button
                type="button"
                disabled={selected.length === 0}
                onClick={() =>
                  startTransition(async () => {
                    const result = await (scope === "programme"
                      ? pushProgramme(programmeId, selected, startDate)
                      : pushWeek(weekId, selected, startDate, programmeId));
                    setKept(result.kept);
                  })
                }
                className="h-9 rounded-r2 cta px-4 text-[13px] font-semibold text-[var(--on-accent)] disabled:opacity-40"
              >
                {scope === "programme" ? t("pushProgramme", { count: selected.length }) : t("push")}
              </button>
            </div>
            {scope === "programme" && (
              <p className="mt-2 text-[12px] leading-[1.45] text-[var(--ink3)]">{t("scopeProgrammeHint")}</p>
            )}
            {kept > 0 && (
              <p role="status" className="mt-2 text-[12px] leading-[1.45] text-[var(--a2)]">
                {t("pushKept", { count: kept })}
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

/** The big "+ Mouvement" of a day, on screens without the library pane. */
function PickButton({
  label,
  onClick,
  className = "",
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`glass2 flex h-12 items-center justify-center gap-2 rounded-r2 border border-[var(--edge)] text-[14px] font-semibold text-[var(--accent)] lg:hidden ${className}`}
    >
      <span aria-hidden className="text-[20px] leading-none">+</span>
      {label}
    </button>
  );
}
