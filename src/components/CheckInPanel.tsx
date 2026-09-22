"use client";

import { useTranslations } from "next-intl";
import type { CheckInRow } from "@/lib/supabase/types";
import { saveCheckIn } from "@/app/(coach)/clients/actions";

const FEEL = ["Strong", "Steady", "Heavy"] as const;
const PAIN = ["None", "Minor", "Need to talk"] as const;
const ADHERENCE = ["All of it", "Most", "Struggled"] as const;

const cell =
  "mt-1 h-8 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2 text-[12px] text-[var(--ink)]";

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
    <fieldset className="min-w-[180px] flex-1">
      <legend className="text-[10px] uppercase tracking-[.14em] text-[var(--ink2)]">
        {label}
      </legend>
      <div className="mt-1 flex gap-1">
        {values.map((value) => (
          <label
            key={value}
            className="flex h-8 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-rp border border-[var(--edge)] bg-[var(--glass2)] px-1 text-[11px] text-[var(--ink2)] has-checked:border-[var(--accent)] has-checked:text-[var(--accent)]"
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

/** v1: the coach types the check-in. Only `author` changes when that flips. */
export function CheckInPanel({
  clientId,
  current,
}: {
  clientId: string;
  current: CheckInRow | null;
}) {
  const t = useTranslations("checkin");
  const tReview = useTranslations("review");
  const tFeel = useTranslations("feel");
  const tPain = useTranslations("pain");
  const tAdh = useTranslations("adherence");

  return (
    <section className="glass rounded-r3 p-4">
      <h3 className="text-[10px] uppercase tracking-[.14em] text-[var(--ink2)]">
        {t("title")}
      </h3>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--ink2)]">
        {t("lede")}
      </p>

      <form action={saveCheckIn} className="mt-3 space-y-3">
        <input type="hidden" name="client_id" value={clientId} />

        <div className="flex flex-wrap gap-3">
          <label className="block w-[150px]">
            <span className="block text-[10px] uppercase tracking-[.14em] text-[var(--ink2)]">
              {t("week")}
            </span>
            <input
              type="date"
              name="week_start_date"
              defaultValue={current?.week_start_date ?? mondayOf()}
              className={`tnum ${cell}`}
            />
          </label>
          <label className="block w-[120px]">
            <span className="block text-[10px] uppercase tracking-[.14em] text-[var(--ink2)]">
              {t("bodyweight")}
            </span>
            <input
              name="bodyweight_kg"
              inputMode="decimal"
              defaultValue={current?.bodyweight_kg ?? ""}
              className={`tnum ${cell}`}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <Radios name="feel" values={FEEL} current={current?.feel ?? null} label={t("feel")} translate={(v) => tFeel(v)} />
          <Radios name="pain" values={PAIN} current={current?.pain ?? null} label={t("pain")} translate={(v) => tPain(v)} />
          <Radios name="adherence" values={ADHERENCE} current={current?.adherence ?? null} label={t("adherence")} translate={(v) => tAdh(v)} />
        </div>

        {/* Measurements ride on the week, so a delta is one row apart. */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["waist_cm", tReview("waist"), current?.waist_cm],
              ["chest_cm", tReview("chest"), current?.chest_cm],
              ["hips_cm", tReview("hips"), current?.hips_cm],
              ["thigh_cm", tReview("thigh"), current?.thigh_cm],
            ] as const
          ).map(([name, label, value]) => (
            <label key={name} className="block w-[104px]">
              <span className="block text-[10px] uppercase tracking-[.14em] text-[var(--ink2)]">
                {label}
              </span>
              <input
                name={name}
                inputMode="decimal"
                defaultValue={value ?? ""}
                className={`tnum ${cell}`}
              />
            </label>
          ))}
        </div>

        <label className="block">
          <span className="block text-[10px] uppercase tracking-[.14em] text-[var(--ink2)]">
            {t("note")}
          </span>
          <input name="note" defaultValue={current?.note ?? ""} className={cell} />
        </label>

        <button
          type="submit"
          className="h-9 rounded-r2 cta px-4 text-[12px] font-bold text-[var(--on-accent)]"
        >
          {t("save")}
        </button>
      </form>
    </section>
  );
}
