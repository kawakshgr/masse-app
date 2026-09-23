"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  addExerciseToDay,
  removeFromLibrary,
} from "@/app/(coach)/programmes/actions";

export type CatalogueEntry = {
  id: string;
  name: string;
  muscleGroup: string | null;
  equipment: string | null;
  mine: boolean;
};

const DRAG_TYPE = "application/x-masse-exercise";

/**
 * The library, as a pane beside the week rather than a card above it. It was
 * pushing the seven day columns down the screen, which is exactly where you do
 * not want them while dragging into one.
 *
 * Grouped by muscle, because that is how a session gets written: you go looking
 * for a hinge, not for the letter R.
 */
export function ExerciseLibrary({
  catalogue,
  weekId,
  programmeId,
  days,
}: {
  catalogue: CatalogueEntry[];
  weekId: string;
  programmeId: string;
  /** Days that can take an exercise — rest days are not among them. */
  days: { index: number; label: string }[];
}) {
  const t = useTranslations("library");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const groups = useMemo(
    () =>
      [...new Set(catalogue.map((e) => e.muscleGroup).filter(Boolean))].sort() as string[],
    [catalogue],
  );

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return catalogue.filter(
      (entry) =>
        (group === null || entry.muscleGroup === group) &&
        (!needle ||
          entry.name.toLowerCase().includes(needle) ||
          (entry.equipment ?? "").toLowerCase().includes(needle)),
    );
  }, [catalogue, query, group]);

  /** Grouped when nothing is filtering, flat when something is. */
  const sections = useMemo(() => {
    if (group !== null || query.trim()) return [{ title: null, rows: shown }];
    const byGroup = new Map<string, CatalogueEntry[]>();
    for (const entry of shown) {
      const key = entry.muscleGroup ?? "—";
      byGroup.set(key, [...(byGroup.get(key) ?? []), entry]);
    }
    return [...byGroup.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, rows]) => ({ title, rows }));
  }, [shown, group, query]);

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex flex-col gap-2.5 border-b border-[var(--hair)] p-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
            {t("title")}
          </span>
          <div className="flex-1" />
          <span className="tnum text-[12px] text-[var(--ink3)]">
            {t("count", { count: shown.length })}
          </span>
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search")}
          aria-label={t("search")}
          className="h-9 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-3 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink3)]"
        />

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            aria-pressed={group === null}
            onClick={() => setGroup(null)}
            className={`rounded-rp border border-[var(--edge)] px-2.5 py-1 text-[11.5px] font-semibold ${
              group === null ? "sel text-[var(--ink)]" : "bg-[var(--glass2)] text-[var(--ink2)]"
            }`}
          >
            {t("allGroups")}
          </button>
          {groups.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={group === value}
              onClick={() => setGroup(group === value ? null : value)}
              className={`rounded-rp border border-[var(--edge)] px-2.5 py-1 text-[11.5px] font-semibold ${
                group === value ? "sel text-[var(--ink)]" : "bg-[var(--glass2)] text-[var(--ink2)]"
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        <p className="text-[12px] leading-[1.45] text-[var(--ink3)]">{t("lede")}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {shown.length === 0 ? (
          <p className="p-5 text-center text-[12.5px] leading-[1.5] text-[var(--ink3)]">
            {t("noMatch", { query })}
          </p>
        ) : (
          sections.map((section) => (
            <div key={section.title ?? "flat"} className="mb-2">
              {section.title && (
                <p className="px-2 pt-2 pb-1 text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
                  {section.title}
                </p>
              )}
              <ul className="flex flex-col gap-1">
                {section.rows.map((entry) => (
                  <li key={entry.id}>
                    <div
                      draggable
                      onDragStart={(event) => {
                        // Without setData the drag never starts in any browser.
                        event.dataTransfer.setData(DRAG_TYPE, entry.name);
                        event.dataTransfer.setData("text/plain", entry.name);
                        event.dataTransfer.effectAllowed = "copy";
                      }}
                      className="glass2 flex cursor-grab items-center gap-2 rounded-r2 px-2.5 py-2 active:cursor-grabbing"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold">
                          {entry.name}
                        </span>
                        {entry.equipment && (
                          <span className="block truncate text-[11.5px] text-[var(--ink3)]">
                            {entry.equipment}
                          </span>
                        )}
                      </span>

                      {/* Drag is a convenience; this always works. */}
                      <select
                        defaultValue=""
                        aria-label={t("addTo", { name: entry.name })}
                        onChange={(event) => {
                          const day = Number(event.target.value);
                          event.currentTarget.value = "";
                          if (!Number.isFinite(day)) return;
                          startTransition(() => {
                            void addExerciseToDay(weekId, day, entry.name, programmeId);
                          });
                        }}
                        className="glass h-7 shrink-0 rounded-r2 border border-[var(--edge)] px-1 text-[11.5px] text-[var(--ink2)]"
                      >
                        <option value="">＋</option>
                        {days.map((day) => (
                          <option key={day.index} value={day.index}>
                            {day.label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => setConfirming(entry.id)}
                        aria-label={t(entry.mine ? "delete" : "hide")}
                        title={t(entry.mine ? "delete" : "hide")}
                        className="shrink-0 rounded-r1 px-1.5 text-[12px] text-[var(--ink3)] hover:text-[var(--a3)]"
                      >
                        ✕
                      </button>
                    </div>

                    {confirming === entry.id && (
                      <div className="mt-1 rounded-r2 border border-[var(--a3)] p-2.5">
                        <p className="text-[12px] leading-[1.45] text-[var(--ink2)]">
                          {t(entry.mine ? "deleteBody" : "hideBody", { name: entry.name })}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <form action={removeFromLibrary} onSubmit={() => setConfirming(null)}>
                            <input type="hidden" name="exercise_id" value={entry.id} />
                            <input type="hidden" name="mine" value={entry.mine ? "1" : "0"} />
                            <button
                              type="submit"
                              className="h-8 rounded-r2 border border-[var(--a3)] px-2.5 text-[12px] font-semibold text-[var(--a3)]"
                            >
                              {t(entry.mine ? "delete" : "hide")}
                            </button>
                          </form>
                          <button
                            type="button"
                            onClick={() => setConfirming(null)}
                            className="h-8 rounded-r2 px-2.5 text-[12px] text-[var(--ink3)]"
                          >
                            {t("cancel")}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
