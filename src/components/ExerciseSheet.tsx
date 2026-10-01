"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { REST_PRESETS, restKey, restLabel, parseRestKey } from "@/lib/rest";
import { formatScheme, parseScheme } from "@/lib/scheme";
import type { EditorExercise } from "@/components/WeekEditor";

type Patch = {
  name?: string;
  scheme?: string | null;
  cue?: string | null;
  rest_min_s?: number | null;
  rest_max_s?: number | null;
  alternatives?: string[];
};

/**
 * One movement, edited on a phone (1 Oct 2026): the day column has no room
 * for four small fields, so a tap opens this sheet — sets, reps and load on
 * big steppers, rest as tiles, the cue, and where to move it. The scheme
 * stays free text underneath: "3×8–10" is hers to type, the steppers only
 * write what they can read.
 */
export function ExerciseSheet({
  exercise,
  dayLabel,
  moveTargets,
  onSave,
  onMove,
  onDelete,
  onClose,
}: {
  exercise: EditorExercise;
  dayLabel: string;
  moveTargets: { day: number; label: string }[];
  onSave: (patch: Patch) => void;
  onMove: (day: number) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("editor");
  const tSheet = useTranslations("exerciseSheet");
  const parsed = parseScheme(exercise.scheme);
  const [name, setName] = useState(exercise.name);
  const [scheme, setScheme] = useState(exercise.scheme ?? "");
  const [rest, setRest] = useState(restKey(exercise.rest_min_s, exercise.rest_max_s));
  const [cue, setCue] = useState(exercise.cue ?? "");
  const [alternatives, setAlternatives] = useState<string[]>(exercise.alternatives ?? []);
  // The ones written, and one empty field while there is room for a third.
  const altFields =
    alternatives.length < 3 && alternatives.at(-1) !== "" ? [...alternatives, ""] : alternatives;
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onClose]);

  // The steppers read the scheme as typed; with nothing readable they start
  // from 3×10 without load.
  const current = parseScheme(scheme) ?? parsed ?? { sets: 3, reps: 10, weight: null };
  const step = (next: Partial<typeof current>) => setScheme(formatScheme({ ...current, ...next }));

  function save() {
    onSave({
      name: name.trim() || exercise.name,
      scheme: scheme.trim() || null,
      cue: cue.trim() || null,
      alternatives: alternatives.map((a) => a.trim()).filter(Boolean),
      ...parseRestKey(rest),
    });
    onClose();
  }

  return (
    <>
      {/* On a computer the week stays in sight on the left; a click beside
          the panel closes it, as Escape does. */}
      <div aria-hidden onClick={onClose} className="fixed inset-0 z-[59] bg-black/30 max-lg:hidden" />
    <div
      role="dialog"
      aria-modal="true"
      aria-label={exercise.name}
      className="fixed inset-x-0 top-0 z-[60] flex h-[calc(var(--app-h,100dvh)-var(--app-gap,0px))] flex-col bg-[var(--deep)] pt-[env(safe-area-inset-top)] lg:left-auto lg:w-[440px] lg:border-l lg:border-[var(--edge)] lg:shadow-[-24px_0_60px_rgba(0,0,0,.35)]"
    >
      <header className="flex items-center gap-3 px-4 pb-3 pt-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[var(--accent)]">{dayLabel}</p>
          <h2 className="truncate font-display text-[24px] font-extrabold uppercase leading-none tracking-[-.01em]">
            {tSheet("title")}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={tSheet("close")}
          className="glass2 flex size-11 shrink-0 items-center justify-center rounded-full text-[24px] leading-none text-[var(--ink2)]"
        >
          ×
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 pb-4">
        <label className="block space-y-1.5">
          <span className={micro}>{t("exName")}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            list="masse-exercise-catalogue"
            className="h-12 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-3.5 text-[16px] font-semibold text-[var(--ink)]"
          />
        </label>

        <div className="glass space-y-3 rounded-r3 p-3.5">
          <Stepper label={tSheet("sets")} value={String(current.sets)} onMinus={() => step({ sets: Math.max(1, current.sets - 1) })} onPlus={() => step({ sets: Math.min(20, current.sets + 1) })} />
          <Stepper label={tSheet("reps")} value={String(current.reps)} onMinus={() => step({ reps: Math.max(1, current.reps - 1) })} onPlus={() => step({ reps: Math.min(100, current.reps + 1) })} />
          <Stepper
            label={tSheet("load")}
            value={current.weight == null ? "—" : `${String(current.weight).replace(".", ",")} kg`}
            onMinus={() => step({ weight: current.weight == null || current.weight <= 2.5 ? null : current.weight - 2.5 })}
            onPlus={() => step({ weight: (current.weight ?? 0) + 2.5 })}
          />
          <label className="block space-y-1.5 border-t border-[var(--hair)] pt-3">
            <span className={micro}>{t("scheme")}</span>
            <input
              value={scheme}
              onChange={(e) => setScheme(e.target.value)}
              placeholder={t("schemeHint")}
              className="tnum h-11 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-3 text-[16px] text-[var(--ink)] placeholder:text-[var(--ink3)]"
            />
          </label>
        </div>

        <div className="space-y-2">
          <p className={micro}>{t("restTime")}</p>
          <div className="grid grid-cols-4 gap-2">
            {[["", tSheet("restNone")] as const, ...REST_PRESETS.map(([min, max]) => [`${min}-${max}`, restLabel(min, max) ?? ""] as const)].map(
              ([key, label]) => (
                <button
                  key={key || "none"}
                  type="button"
                  aria-pressed={rest === key}
                  onClick={() => setRest(key)}
                  className={`tnum h-12 rounded-r2 border text-[13px] font-semibold ${
                    rest === key
                      ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_18%,var(--deep))] text-[var(--ink)]"
                      : "border-[var(--edge)] bg-[var(--glass2)] text-[var(--ink2)]"
                  }`}
                >
                  {label}
                </button>
              ),
            )}
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className={micro}>{t("cue")}</span>
          <textarea
            value={cue}
            onChange={(e) => setCue(e.target.value)}
            className="min-h-[84px] w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-3.5 py-2.5 text-[16px] leading-[1.4] text-[var(--ink)]"
          />
        </label>

        {/* Stand-ins (1 Oct 2026): when the machine is taken, the client
            does one of these instead, with a tap, and the coach sees which. */}
        <div className="space-y-2">
          <p className={micro}>{tSheet("alternatives")}</p>
          <p className="text-[12.5px] leading-[1.45] text-[var(--ink3)]">{tSheet("alternativesHint")}</p>
          {altFields.map((value, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                value={value}
                onChange={(e) => {
                  const next = [...altFields];
                  next[index] = e.target.value;
                  setAlternatives(next.slice(0, 3));
                }}
                list="masse-exercise-catalogue"
                placeholder={tSheet("alternativePlaceholder")}
                aria-label={`${tSheet("alternatives")} ${index + 1}`}
                className="h-12 min-w-0 flex-1 rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-3.5 text-[16px] font-semibold text-[var(--ink)] placeholder:font-normal placeholder:text-[var(--ink3)]"
              />
              {value !== "" && (
                <button
                  type="button"
                  aria-label={tSheet("alternativeRemove")}
                  onClick={() => setAlternatives(alternatives.filter((_, i) => i !== index))}
                  className="glass2 flex size-12 shrink-0 items-center justify-center rounded-full text-[22px] leading-none text-[var(--ink2)]"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        {moveTargets.length > 0 && (
          <div className="space-y-2">
            <p className={micro}>{tSheet("moveTo")}</p>
            <div className="grid grid-cols-4 gap-2">
              {moveTargets.map((target) => (
                <button
                  key={target.day}
                  type="button"
                  onClick={() => {
                    onMove(target.day);
                    onClose();
                  }}
                  className="h-12 rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] text-[13px] font-semibold text-[var(--ink2)]"
                >
                  {target.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {confirming ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="h-12 flex-1 rounded-r2 border border-[var(--a3)] text-[14px] font-semibold text-[var(--a3)]"
            >
              {tSheet("deleteConfirm")}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="h-12 flex-1 rounded-r2 border border-[var(--edge)] text-[14px] text-[var(--ink2)]"
            >
              {tSheet("keep")}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="h-12 w-full rounded-r2 border border-[var(--edge)] text-[14px] font-semibold text-[var(--a3)]"
          >
            {tSheet("delete")}
          </button>
        )}
      </div>

      <div className="px-4 pb-[max(12px,calc(env(safe-area-inset-bottom)+8px-var(--app-gap,0px)))] pt-2">
        <button
          type="button"
          onClick={save}
          className="cta h-12 w-full rounded-r2 text-[15px] font-semibold text-[var(--on-accent)]"
        >
          {tSheet("save")}
        </button>
      </div>
    </div>
    </>
  );
}

const micro = "block text-[11px] font-bold uppercase tracking-[.14em] text-[var(--ink2)]";

function Stepper({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  const round =
    "glass2 flex size-12 shrink-0 items-center justify-center rounded-full text-[22px] leading-none text-[var(--ink)] active:scale-95";
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-[13px] font-semibold text-[var(--ink2)]">{label}</span>
      <button type="button" aria-label={`${label} −`} onClick={onMinus} className={round}>
        −
      </button>
      <span className="tnum flex-1 text-center font-display text-[26px] font-extrabold tracking-[-.03em]">{value}</span>
      <button type="button" aria-label={`${label} +`} onClick={onPlus} className={round}>
        +
      </button>
    </div>
  );
}
