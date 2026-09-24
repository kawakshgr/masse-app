"use client";

import { useTranslations } from "next-intl";
import {
  saveCycleAdjustment,
  setCycleMode,
} from "@/app/(coach)/clients/actions";
import type { CycleMode, CyclePhase } from "@/lib/supabase/types";

const PHASES: CyclePhase[] = ["menstrual", "follicular", "ovulatory", "luteal"];

export type PhaseLevers = {
  phase: CyclePhase;
  loadPct: number;
  rpeCap: number | null;
  setsDelta: number;
  kcalDelta: number;
  carbsDelta: number;
  configured: boolean;
};

const field =
  "tnum h-7 w-full rounded-r1 border border-[var(--edge)] bg-[var(--glass2)] px-1.5 text-center text-[12px] text-[var(--ink)]";

function Lever({
  label,
  name,
  value,
  suffix,
}: {
  label: string;
  name: string;
  value: number | string;
  suffix?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="shrink-0 text-[11px] text-[var(--ink3)]">{label}</span>
      {/* The unit always has its slot, so every field lines up whether it
          carries one or not. */}
      <span className="flex w-[96px] shrink-0 items-center gap-1">
        <input name={name} inputMode="numeric" defaultValue={value} className={field} />
        <span className="w-6 shrink-0 text-[11px] text-[var(--ink3)]">{suffix ?? ""}</span>
      </span>
    </label>
  );
}

export function CyclePanel({
  clientId,
  firstName,
  tracking,
  mode,
  currentPhase,
  manualPhase,
  levers,
}: {
  clientId: string;
  firstName: string;
  tracking: boolean;
  mode: CycleMode;
  currentPhase: CyclePhase | null;
  manualPhase: CyclePhase | null;
  levers: Record<CyclePhase, PhaseLevers>;
}) {
  const t = useTranslations("cyc");
  const tPhase = useTranslations("phase");

  if (!tracking) {
    return (
      <section className="glass rounded-r3 p-4">
        <p className="text-[13px] text-[var(--ink2)]">{t("off")}</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="glass rounded-r3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold">{t("on")}</p>
            <p className="mt-1 text-[12px] leading-[1.5] text-[var(--ink2)]">
              {t("lede", { first: firstName })}
            </p>
          </div>

          {/* Follow her log, or name the phase when the log is out of step. */}
          <form action={setCycleMode} className="flex shrink-0 items-center gap-1">
            <input type="hidden" name="client_id" value={clientId} />
            <input type="hidden" name="mode" value={mode === "log" ? "manual" : "log"} />
            {mode === "manual" && (
              <select
                name="phase_manual"
                defaultValue={manualPhase ?? "follicular"}
                className="h-7 rounded-rp border border-[var(--edge)] bg-[var(--glass2)] px-2 text-[12px] text-[var(--ink)]"
              >
                {PHASES.map((p) => (
                  <option key={p} value={p}>
                    {tPhase(p)}
                  </option>
                ))}
              </select>
            )}
            <button
              type="submit"
              className={`h-7 rounded-rp px-2.5 text-[12px] font-semibold ${
                mode === "log"
                  ? "border border-[var(--edge)] bg-[var(--glass2)] text-[var(--ink2)]"
                  : "sel text-[var(--ink)]"
              }`}
            >
              {mode === "log" ? t("setPhase") : t("followLog")}
            </button>
          </form>
        </div>

        {currentPhase == null && (
          <p className="mt-3 text-[12px] text-[var(--ink3)]">{t("noPhase")}</p>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        {PHASES.map((phase) => {
          const lever = levers[phase];
          const isNow = phase === currentPhase;

          return (
            <form
              key={phase}
              action={saveCycleAdjustment}
              className="glass min-w-[190px] flex-1 rounded-r3 p-3"
              // Inline: .glass owns border-color and would beat a utility.
              style={isNow ? { borderColor: "var(--accent)" } : undefined}
            >
              <input type="hidden" name="client_id" value={clientId} />
              <input type="hidden" name="phase" value={phase} />

              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-semibold capitalize">{tPhase(phase)}</span>
                {isNow && (
                  <span className="rounded-rp bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold text-[var(--on-accent)]">
                    {t("now")}
                  </span>
                )}
              </div>

              <div className="mt-2 space-y-1.5">
                <Lever label={t("load")} name="load_pct" value={lever.loadPct} suffix="%" />
                <Lever label={t("rpe")} name="rpe_cap" value={lever.rpeCap ?? ""} />
                <Lever label={t("sets")} name="sets_delta" value={lever.setsDelta} />
                <Lever label={t("kcal")} name="kcal_delta" value={lever.kcalDelta} suffix="kcal" />
                <Lever label={t("carbs")} name="carbs_g_delta" value={lever.carbsDelta} suffix="g" />
              </div>

              {!lever.configured && (
                <p className="mt-2 text-[11px] leading-snug text-[var(--ink3)]">
                  {t("defaultNote")}
                </p>
              )}

              <button
                type="submit"
                className="mt-2 h-8 w-full rounded-r2 cta text-[12px] font-semibold text-[var(--on-accent)]"
              >
                {t("save")}
              </button>
            </form>
          );
        })}
      </div>

      <p className="text-[12px] leading-[1.5] text-[var(--ink2)]">{t("promise")}</p>
    </div>
  );
}
