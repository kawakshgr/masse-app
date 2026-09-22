"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { addExerciseToDay } from "@/app/(coach)/programmes/actions";

export type CatalogueEntry = {
  id: string;
  name: string;
  muscleGroup: string | null;
  mine: boolean;
};

const DRAG_TYPE = "application/x-masse-exercise";

/**
 * The panel that was missing: the catalogue, visible, with something to grab.
 * Autocompleting a text field only helps someone who already knows the name.
 */
export function ExerciseLibrary({
  catalogue,
  weekId,
  programmeId,
  daysWithSessions,
}: {
  catalogue: CatalogueEntry[];
  weekId: string;
  programmeId: string;
  daysWithSessions: number[];
}) {
  const t = useTranslations("library");
  const tDays = useTranslations("days");
  const [query, setQuery] = useState("");
  const [day, setDay] = useState<number>(daysWithSessions[0] ?? 0);
  const [open, setOpen] = useState(true);
  const [, startTransition] = useTransition();

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return catalogue;
    return catalogue.filter(
      (entry) =>
        entry.name.toLowerCase().includes(needle) ||
        (entry.muscleGroup ?? "").toLowerCase().includes(needle),
    );
  }, [catalogue, query]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-8 rounded-rp border border-[var(--edge)] bg-[var(--glass2)] px-3 text-[12px] text-[var(--ink2)]"
      >
        {t("show")}
      </button>
    );
  }

  return (
    <section className="glass rounded-r3 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
          {t("title")}
        </h3>
        <span className="tnum text-[11px] text-[var(--ink3)]">
          {t("count", { count: catalogue.length })}
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-r1 px-2 py-0.5 text-[11px] text-[var(--ink3)]"
        >
          {t("hide")}
        </button>
      </div>

      <p className="mt-1 text-[12px] text-[var(--ink2)]">{t("lede")}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("search")}
          aria-label={t("search")}
          className="h-8 min-w-[160px] flex-1 rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink3)]"
        />
        <label className="flex items-center gap-1">
          <span className="text-[11px] text-[var(--ink3)]">{t("target")}</span>
          <select
            value={day}
            onChange={(event) => setDay(Number(event.target.value))}
            className="h-8 rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2 text-[13px] text-[var(--ink)]"
          >
            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
              <option key={d} value={d}>
                {tDays(String(d))}
              </option>
            ))}
          </select>
        </label>
      </div>

      {shown.length === 0 ? (
        <p className="mt-3 text-[12px] text-[var(--ink2)]">{t("none")}</p>
      ) : (
        <ul className="mt-3 flex max-h-[220px] flex-wrap content-start gap-1.5 overflow-y-auto">
          {shown.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData(
                    DRAG_TYPE,
                    JSON.stringify({ kind: "new", name: entry.name }),
                  );
                  event.dataTransfer.setData("text/plain", entry.name);
                  event.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() =>
                  startTransition(() => {
                    void addExerciseToDay(weekId, day, entry.name, programmeId);
                  })
                }
                title={entry.muscleGroup ?? undefined}
                className="flex cursor-grab items-center gap-1.5 rounded-rp border border-[var(--edge)] bg-[var(--glass2)] px-2.5 py-1 text-[12px] text-[var(--ink2)] hover:border-[var(--accent)] hover:text-[var(--ink)] active:cursor-grabbing"
              >
                <span aria-hidden className="text-[10px] text-[var(--ink3)]">⠿</span>
                {entry.name}
                {entry.mine && (
                  <span className="text-[10px] text-[var(--accent)]">
                    {t("mine")}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
