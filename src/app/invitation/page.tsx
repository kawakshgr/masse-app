"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  EMPTY,
  EQUIPMENT,
  GOALS,
  save,
  type Answers,
} from "@/lib/onboarding";

const LAST_STEP = 9;

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
        {label}
      </span>
      <input
        {...props}
        className="mt-2 h-11 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-3 text-[14px] text-[var(--ink)] placeholder:text-[var(--ink3)]"
      />
    </label>
  );
}

function Choice({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`h-11 rounded-r2 border px-3 text-[13px] transition-colors ${
        selected
          ? "border-[var(--accent)] bg-[var(--glass2)] text-[var(--accent)]"
          : "border-[var(--edge)] bg-[var(--glass2)] text-[var(--ink2)]"
      }`}
    >
      {children}
    </button>
  );
}

export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const tDays = useTranslations("days");
  const tEquip = useTranslations("equipment");
  const tGoal = useTranslations("goal");

  const [step, setStep] = useState(1);
  const [a, setA] = useState<Answers>(EMPTY);
  const [checking, setChecking] = useState(false);
  const [codeBad, setCodeBad] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const set = (patch: Partial<Answers>) => setA((prev) => ({ ...prev, ...patch }));

  async function checkCode() {
    setChecking(true);
    setCodeBad(false);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("invite_preview", { p_code: a.code });
    setChecking(false);

    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row?.valid) {
      setCodeBad(true);
      return;
    }
    set({ coachName: row.coach_name, askCycle: row.ask_cycle });
    setStep(2);
  }

  async function finish() {
    const next = { ...a };
    save(next);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?suite=${encodeURIComponent("/invitation/finaliser")}`,
      },
    });
    if (!error) setSent(true);
  }

  // Cycle tracking is offered only when the coach asked for it.
  const steps = [1, 2, 3, 4, 5, 6, ...(a.askCycle ? [7] : []), 8, 9];
  const shownIndex = steps.indexOf(step) + 1;

  function go(delta: number) {
    const i = steps.indexOf(step);
    const next = steps[i + delta];
    if (next) setStep(next);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="atmosphere" aria-hidden />
      <div className="glass lift w-full max-w-[520px] rounded-r4 p-8">
        <p className="tnum text-[11px] font-bold text-[var(--accent)]">
          {t("step", { n: shownIndex })}
        </p>

        {step === 1 && (
          <>
            <h1 className="mt-2 font-display text-[26px] font-extrabold tracking-[-.03em]">
              {t("codeTitle")}
            </h1>
            <p className="mt-2 text-[13px] text-[var(--ink2)]">{t("codeLede")}</p>
            <input
              value={a.code}
              onChange={(e) => set({ code: e.target.value.toUpperCase() })}
              placeholder={t("codePlaceholder")}
              aria-label={t("codeTitle")}
              className="tnum mt-5 h-12 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-3 text-center text-[18px] font-bold tracking-widest text-[var(--ink)] placeholder:text-[var(--ink3)]"
            />
            {codeBad && (
              <p role="alert" className="mt-3 text-[12px] text-[var(--a3)]">
                {t("codeBad")}
              </p>
            )}
            <button
              type="button"
              onClick={checkCode}
              disabled={checking || a.code.trim().length < 4}
              className="mt-5 h-11 w-full rounded-rp cta text-[14px] font-bold text-[var(--on-accent)] disabled:opacity-50"
            >
              {t("next")}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="mt-2 font-display text-[26px] font-extrabold tracking-[-.03em]">
              {t("goalTitle")}
            </h1>
            <p className="mt-1 text-[12px] text-[var(--accent)]">
              {t("codeOk", { coach: a.coachName ?? "" })}
            </p>
            <p className="mt-2 text-[13px] text-[var(--ink2)]">{t("goalLede")}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {GOALS.map((goal) => (
                <Choice key={goal} selected={a.goal === goal} onClick={() => set({ goal })}>
                  {tGoal(goal)}
                </Choice>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="mt-2 font-display text-[26px] font-extrabold tracking-[-.03em]">
              {t("bodyTitle")}
            </h1>
            <p className="mt-2 text-[13px] text-[var(--ink2)]">{t("bodyLede")}</p>
            <div className="mt-5 space-y-3">
              <Field label="Nom" value={a.name} onChange={(e) => set({ name: e.target.value })} />
              <div className="grid grid-cols-3 gap-2">
                <Field label={t("height")} inputMode="decimal" value={a.heightCm} onChange={(e) => set({ heightCm: e.target.value })} />
                <Field label={t("weight")} inputMode="decimal" value={a.weightKg} onChange={(e) => set({ weightKg: e.target.value })} />
                <Field label={t("birthYear")} inputMode="numeric" value={a.birthYear} onChange={(e) => set({ birthYear: e.target.value })} />
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="mt-2 font-display text-[26px] font-extrabold tracking-[-.03em]">
              {t("injuriesTitle")}
            </h1>
            <p className="mt-2 text-[13px] text-[var(--ink2)]">{t("injuriesLede")}</p>
            <textarea
              value={a.injuries}
              onChange={(e) => set({ injuries: e.target.value })}
              rows={4}
              aria-label={t("injuriesTitle")}
              className="mt-5 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] p-3 text-[14px] text-[var(--ink)]"
            />
          </>
        )}

        {step === 5 && (
          <>
            <h1 className="mt-2 font-display text-[26px] font-extrabold tracking-[-.03em]">
              {t("equipmentTitle")}
            </h1>
            <p className="mt-2 text-[13px] text-[var(--ink2)]">{t("equipmentLede")}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {EQUIPMENT.map((item) => (
                <Choice
                  key={item}
                  selected={a.equipment.includes(item)}
                  onClick={() =>
                    set({
                      equipment: a.equipment.includes(item)
                        ? a.equipment.filter((e) => e !== item)
                        : [...a.equipment, item],
                    })
                  }
                >
                  {tEquip(item)}
                </Choice>
              ))}
            </div>
          </>
        )}

        {step === 6 && (
          <>
            <h1 className="mt-2 font-display text-[26px] font-extrabold tracking-[-.03em]">
              {t("daysTitle")}
            </h1>
            <p className="mt-2 text-[13px] text-[var(--ink2)]">{t("daysLede")}</p>
            <div className="mt-5 grid grid-cols-4 gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <Choice
                  key={d}
                  selected={a.sessionDays.includes(d)}
                  onClick={() =>
                    set({
                      sessionDays: a.sessionDays.includes(d)
                        ? a.sessionDays.filter((x) => x !== d)
                        : [...a.sessionDays, d].sort((x, y) => x - y),
                    })
                  }
                >
                  {tDays(String(d)).slice(0, 3)}
                </Choice>
              ))}
            </div>
          </>
        )}

        {step === 7 && (
          <>
            <h1 className="mt-2 font-display text-[26px] font-extrabold tracking-[-.03em]">
              {t("cycleTitle")}
            </h1>
            <p className="mt-2 text-[13px] text-[var(--ink2)]">{t("cycleLede")}</p>
            {/* The promise is stated plainly, because the architecture keeps it. */}
            <p className="mt-4 rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] p-3 text-[12px] leading-relaxed text-[var(--ink2)]">
              {t("cyclePromise")}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Choice selected={a.cycleTracking} onClick={() => set({ cycleTracking: true })}>
                {t("cycleOn")}
              </Choice>
              <Choice selected={!a.cycleTracking} onClick={() => set({ cycleTracking: false })}>
                {t("cycleOff")}
              </Choice>
            </div>
          </>
        )}

        {step === 8 && (
          <>
            <h1 className="mt-2 font-display text-[26px] font-extrabold tracking-[-.03em]">
              {t("sleepTitle")}
            </h1>
            <p className="mt-2 text-[13px] text-[var(--ink2)]">{t("sleepLede")}</p>
            <div className="mt-5">
              <Field
                label="h"
                inputMode="decimal"
                value={a.sleepTargetH}
                onChange={(e) => set({ sleepTargetH: e.target.value })}
              />
            </div>
          </>
        )}

        {step === 9 && (
          <>
            <h1 className="mt-2 font-display text-[26px] font-extrabold tracking-[-.03em]">
              {t("summaryTitle")}
            </h1>
            <p className="mt-2 text-[13px] text-[var(--ink2)]">{t("summaryLede")}</p>

            <dl className="mt-5 space-y-1 rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] p-3 text-[12px]">
              {[
                ["Coach", a.coachName],
                [t("goalTitle"), a.goal && tGoal(a.goal)],
                [t("height"), a.heightCm],
                [t("weight"), a.weightKg],
                [t("daysTitle"), a.sessionDays.map((d) => tDays(String(d)).slice(0, 3)).join(", ")],
                [t("cycleTitle"), a.cycleTracking ? t("cycleOn") : t("cycleOff")],
                [t("sleepTitle"), a.sleepTargetH && `${a.sleepTargetH} h`],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between gap-3">
                  <dt className="text-[var(--ink3)]">{label}</dt>
                  <dd className="tnum truncate text-[var(--ink)]">{value || "—"}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4">
              <Field
                label={t("emailLabel")}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={finish}
              disabled={sent || !email || !a.name.trim()}
              className="mt-4 h-11 w-full rounded-rp cta text-[14px] font-bold text-[var(--on-accent)] disabled:opacity-50"
            >
              {t("finish")}
            </button>
            {sent && (
              <p role="status" className="mt-3 text-[13px] text-[var(--accent)]">
                {t("sent")}
              </p>
            )}
          </>
        )}

        {step > 1 && step < LAST_STEP && (
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => go(-1)}
              className="h-11 flex-1 rounded-r2 border border-[var(--edge)] text-[13px] text-[var(--ink2)]"
            >
              {t("back")}
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="h-11 flex-1 rounded-rp cta text-[13px] font-bold text-[var(--on-accent)]"
            >
              {t("next")}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
