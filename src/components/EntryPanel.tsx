"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { saveCycleLog, saveDailyMetrics } from "@/app/aujourdhui/actions";

const SYMPTOM_KEY = "masse:symptoms";

/**
 * The symptom note lives in this device's storage and nowhere else. Reading it
 * through a store keeps it out of React state that an effect would have to
 * seed — and keeps it out of every form on the page.
 */
const symptomListeners = new Set<() => void>();
let symptomCache: string | null = null;

function subscribeSymptoms(onChange: () => void) {
  symptomListeners.add(onChange);
  return () => symptomListeners.delete(onChange);
}

function readSymptoms(): string {
  if (symptomCache !== null) return symptomCache;
  try {
    symptomCache = window.localStorage.getItem(SYMPTOM_KEY) ?? "";
  } catch {
    // Blocked storage: the note is not remembered. Still never sent.
    symptomCache = "";
  }
  return symptomCache;
}

function writeSymptoms(value: string) {
  symptomCache = value;
  symptomListeners.forEach((listener) => listener());
  try {
    window.localStorage.setItem(SYMPTOM_KEY, value);
  } catch {
    // Same: nothing to recover, nothing to send.
  }
}

export function EntryPanel({
  cycleTracking,
  phaseLabel,
}: {
  cycleTracking: boolean;
  phaseLabel: string | null;
}) {
  const t = useTranslations("entry");
  const today = new Date().toISOString().slice(0, 10);

  const symptoms = useSyncExternalStore(
    subscribeSymptoms,
    readSymptoms,
    () => "",
  );

  const rememberSymptoms = useCallback((value: string) => {
    writeSymptoms(value);
  }, []);

  return (
    <section className="glass rounded-r3 p-4">
      <h2 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
        {t("title")}
      </h2>

      <form action={saveDailyMetrics} className="mt-3 flex flex-wrap items-end gap-2">
        <input type="hidden" name="day" value={today} />
        <label className="block w-[92px]">
          <span className="block text-[10px] text-[var(--ink3)]">{t("sleep")}</span>
          <input
            name="sleep_h"
            inputMode="decimal"
            className="tnum mt-1 h-9 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass)] px-2 text-[13px] text-[var(--ink)]"
          />
        </label>
        <label className="block w-[110px]">
          <span className="block text-[10px] text-[var(--ink3)]">{t("quality")}</span>
          <select
            name="sleep_quality"
            defaultValue=""
            className="mt-1 h-9 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass)] px-2 text-[13px] text-[var(--ink)]"
          >
            <option value="">—</option>
            <option value="1">{t("q1")}</option>
            <option value="2">{t("q2")}</option>
            <option value="3">{t("q3")}</option>
          </select>
        </label>
        <label className="block w-[110px]">
          <span className="block text-[10px] text-[var(--ink3)]">{t("steps")}</span>
          <input
            name="steps"
            inputMode="numeric"
            className="tnum mt-1 h-9 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass)] px-2 text-[13px] text-[var(--ink)]"
          />
        </label>
        <button
          type="submit"
          className="h-9 rounded-r2 bg-[var(--a1)] px-4 text-[12px] font-semibold text-[var(--onA)]"
        >
          {t("save")}
        </button>
      </form>

      {/* Absent, not disabled, when tracking is off. */}
      {cycleTracking && (
        <div className="mt-5 border-t border-[var(--hair)] pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
              {t("cycleTitle")}
            </h3>
            {phaseLabel && (
              <span className="text-[11px] text-[var(--a1)]">
                {t("phaseNow")} · {phaseLabel}
              </span>
            )}
          </div>

          <p className="mt-2 text-[11px] leading-relaxed text-[var(--ink2)]">
            {t("cyclePromise")}
          </p>

          <form action={saveCycleLog} className="mt-3 flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="block text-[10px] text-[var(--ink3)]">
                {t("periodStart")}
              </span>
              <input
                type="date"
                name="period_start_date"
                required
                defaultValue={today}
                className="tnum mt-1 h-9 rounded-r2 border border-[var(--edge)] bg-[var(--glass)] px-2 text-[13px] text-[var(--ink)]"
              />
            </label>
            <label className="block w-[120px]">
              <span className="block text-[10px] text-[var(--ink3)]">
                {t("cycleLength")}
              </span>
              <input
                name="cycle_length_days"
                inputMode="numeric"
                defaultValue="28"
                className="tnum mt-1 h-9 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass)] px-2 text-[13px] text-[var(--ink)]"
              />
            </label>
            <button
              type="submit"
              className="h-9 rounded-r2 bg-[var(--a1)] px-4 text-[12px] font-semibold text-[var(--onA)]"
            >
              {t("save")}
            </button>
          </form>

          {/* Deliberately outside every form on this page. */}
          <label className="mt-4 block">
            <span className="block text-[10px] text-[var(--ink3)]">
              {t("symptomNote")}
            </span>
            <textarea
              rows={3}
              value={symptoms}
              onChange={(event) => rememberSymptoms(event.target.value)}
              className="mt-1 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass)] p-2 text-[13px] text-[var(--ink)]"
            />
            <span className="mt-1 block text-[10px] text-[var(--ink3)]">
              {t("symptomHint")}
            </span>
          </label>
        </div>
      )}
    </section>
  );
}
