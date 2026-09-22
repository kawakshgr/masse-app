"use client";

import { useTranslations } from "next-intl";
import type { CheckInRow } from "@/lib/supabase/types";
import { CheckInPhotos, type PhotoView } from "@/components/CheckInPhotos";
import {
  deleteCheckIn,
  markCheckInReviewed,
  saveCheckIn,
} from "@/app/(coach)/clients/actions";

const FEEL = ["Strong", "Steady", "Heavy"] as const;
const PAIN = ["None", "Minor", "Need to talk"] as const;
const ADHERENCE = ["All of it", "Most", "Struggled"] as const;

function mondayOf(date = new Date()): string {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function Radios({
  name,
  values,
  current,
  label,
  translate,
}: {
  name: string;
  values: readonly string[];
  current: string | null;
  label: string;
  translate: (v: string) => string;
}) {
  return (
    <fieldset className="min-w-0 flex-1">
      <legend className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
        {label}
      </legend>
      <div className="mt-1 flex gap-1">
        {values.map((value) => (
          <label
            key={value}
            className="flex h-8 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-r2 border border-[var(--edge)] bg-[var(--glass)] px-1 text-[11px] text-[var(--ink2)] has-checked:border-[var(--accent)] has-checked:text-[var(--accent)]"
          >
            <input
              type="radio"
              name={name}
              value={value}
              defaultChecked={current === value}
              className="sr-only"
            />
            <span className="truncate">{translate(value)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function CheckInPanel({
  clientId,
  checkIns,
  photosByCheckIn,
}: {
  clientId: string;
  checkIns: CheckInRow[];
  photosByCheckIn: Record<string, PhotoView[]>;
}) {
  const t = useTranslations("checkin");
  const tFeel = useTranslations("feel");
  const tPain = useTranslations("pain");
  const tAdh = useTranslations("adherence");
  const tCompare = useTranslations("compare");

  const week = mondayOf();
  const current = checkIns.find((c) => c.week_start_date === week) ?? null;

  return (
    <section className="glass rounded-r3 p-4">
      <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
        {t("title")}
      </h3>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--ink2)]">
        {t("lede")}
      </p>

      <form action={saveCheckIn} className="mt-3 space-y-3">
        <input type="hidden" name="client_id" value={clientId} />

        <label className="block">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
            {t("week")}
          </span>
          <input
            type="date"
            name="week_start_date"
            defaultValue={week}
            className="tnum mt-1 h-8 rounded-r2 border border-[var(--edge)] bg-[var(--glass)] px-2 text-[12px] text-[var(--ink)]"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <Radios name="feel" values={FEEL} current={current?.feel ?? null} label={t("feel")} translate={(v) => tFeel(v)} />
          <Radios name="pain" values={PAIN} current={current?.pain ?? null} label={t("pain")} translate={(v) => tPain(v)} />
          <Radios name="adherence" values={ADHERENCE} current={current?.adherence ?? null} label={t("adherence")} translate={(v) => tAdh(v)} />
        </div>

        <div className="flex gap-3">
          <label className="block w-[140px]">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
              {t("bodyweight")}
            </span>
            <input
              name="bodyweight_kg"
              inputMode="decimal"
              defaultValue={current?.bodyweight_kg ?? ""}
              className="tnum mt-1 h-8 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass)] px-2 text-[12px] text-[var(--ink)]"
            />
          </label>
          <label className="block min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
              {t("note")}
            </span>
            <input
              name="note"
              defaultValue={current?.note ?? ""}
              className="mt-1 h-8 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass)] px-2 text-[12px] text-[var(--ink)]"
            />
          </label>
        </div>

        <button
          type="submit"
          className="h-9 rounded-r2 bg-[var(--accent)] px-4 text-[12px] font-semibold text-[var(--on-accent)]"
        >
          {t("save")}
        </button>
      </form>

      {checkIns.length > 0 && (
        <div className="mt-4 border-t border-[var(--hair)] pt-3">
          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
            {t("history")}
          </h4>
          <ul className="mt-2">
            {checkIns.map((entry, index) => {
              // checkIns arrive newest first, so the next one is the older one.
              const previous = checkIns[index + 1];
              const here = entry.bodyweight_kg == null ? null : Number(entry.bodyweight_kg);
              const before =
                previous?.bodyweight_kg == null ? null : Number(previous.bodyweight_kg);
              const change =
                here != null && before != null
                  ? Math.round((here - before) * 10) / 10
                  : null;

              return (
              <li
                key={entry.id}
                className="border-b border-[var(--hair)] py-2 last:border-0"
              >
                <div className="flex items-center gap-3">
                <span className="tnum shrink-0 text-[11px] text-[var(--ink3)]">
                  {entry.week_start_date}
                </span>

                {here != null && (
                  <span className="tnum shrink-0 text-[11px] font-semibold">
                    {here} kg
                    {change !== null && change !== 0 && (
                      <span
                        className={`ml-1 font-normal ${
                          change > 0 ? "text-[var(--a2)]" : "text-[var(--accent-soft)]"
                        }`}
                        title={tCompare("vsLast")}
                      >
                        {change > 0 ? "+" : ""}
                        {change}
                      </span>
                    )}
                  </span>
                )}

                <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--ink2)]">
                  {[
                    entry.feel && tFeel(entry.feel),
                    entry.pain && tPain(entry.pain),
                    entry.adherence && tAdh(entry.adherence),
                    entry.note,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                {entry.reviewed_at ? (
                  <span className="shrink-0 text-[10px] text-[var(--ink3)]">
                    {t("reviewed")}
                  </span>
                ) : (
                  <form action={markCheckInReviewed} className="shrink-0">
                    <input type="hidden" name="check_in_id" value={entry.id} />
                    <input type="hidden" name="client_id" value={clientId} />
                    <button
                      type="submit"
                      className="rounded-r1 border border-[var(--a3)] px-2 py-0.5 text-[10px] font-semibold text-[var(--a3)]"
                    >
                      {t("markReviewed")}
                    </button>
                  </form>
                )}

                <form action={deleteCheckIn} className="shrink-0">
                  <input type="hidden" name="check_in_id" value={entry.id} />
                  <input type="hidden" name="client_id" value={clientId} />
                  <button
                    type="submit"
                    aria-label="×"
                    className="rounded-r1 px-1 text-[11px] text-[var(--ink3)] hover:text-[var(--a3)]"
                  >
                    ×
                  </button>
                </form>
                </div>

                <CheckInPhotos
                  checkInId={entry.id}
                  clientId={clientId}
                  photos={photosByCheckIn[entry.id] ?? []}
                />
              </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
