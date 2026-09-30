"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { OtpCodeEntry } from "@/components/OtpCodeEntry";
import { Icon } from "@/components/Icon";
import { Cta, Secondary, fieldClass } from "@/components/client/ui";
import {
  EMPTY,
  EQUIPMENT,
  GOALS,
  SESSIONS_PER_WEEK,
  TRAINING_AGES,
  fullName,
  isAdult,
  save,
  stepComplete,
  type Answers,
} from "@/lib/onboarding";

const LAST_STEP = 9;

/** What each step is about, as the icon at its head. */
const STEP_ICON: Record<number, string> = {
  1: "privacy",
  2: "account",
  3: "chart",
  4: "trophy",
  5: "checkIns",
  6: "scale",
  7: "cycle",
  8: "privacy",
  9: "note",
};

const micro = "text-[11px] font-bold uppercase tracking-[.12em] text-[var(--ink2)]";

/** A labelled answer. `required` puts a dot after the label, never a colour. */
function Question({
  label,
  hint,
  required = false,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  optional?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-[14px] font-semibold leading-[1.35]">
        {label}
        {required && <span className="text-[var(--accent)]"> •</span>}
        {optional && <span className="font-normal text-[var(--ink3)]"> · {optional}</span>}
      </span>
      {children}
      {hint && <span className="block text-[12px] leading-[1.45] text-[var(--ink3)]">{hint}</span>}
    </label>
  );
}

const area = `${fieldClass} h-auto min-h-[96px] py-3 leading-[1.45]`;

/** On/off choice among a few, as a glass pill; the selection is the tint. */
function Pill({
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
      aria-pressed={selected}
      onClick={onClick}
      className={`h-11 rounded-rp border px-4 text-[12px] font-bold uppercase tracking-[.08em] ${
        selected ? "sel text-[var(--ink)]" : "border-[var(--edge)] bg-[var(--glass2)] text-[var(--ink2)]"
      }`}
    >
      {children}
    </button>
  );
}

export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const tDays = useTranslations("days");
  const tAuth = useTranslations("auth");
  const locale = useLocale();
  const tEquip = useTranslations("equipment");
  const tGoal = useTranslations("goal");

  const [step, setStep] = useState(1);
  const [a, setA] = useState<Answers>(EMPTY);
  const [checking, setChecking] = useState(false);
  const [codeBad, setCodeBad] = useState(false);
  const [missing, setMissing] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  // Why the email did not leave, said on screen: asked too soon, or a failure.
  const [sendError, setSendError] = useState<"wait" | "failed" | null>(null);
  // The coach's free call slots, read again each time step 5 opens: a slot
  // taken by someone else meanwhile must not be offered.
  const [freeSlots, setFreeSlots] = useState<string[] | null>(null);
  const [callDay, setCallDay] = useState("");
  // Eighteen years back from today, read once.
  const [latestBirth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear() - 18}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const set = (patch: Partial<Answers>) => {
    setMissing(false);
    setA((prev) => ({ ...prev, ...patch }));
  };

  useEffect(() => {
    if (step !== 5 || a.callMinutes === null) return;
    let live = true;
    createClient()
      .rpc("invite_free_slots", { p_code: a.code })
      .then(({ data }) => {
        if (!live) return;
        const slots = ((data ?? []) as string[]).map((at) => new Date(at).toISOString());
        setFreeSlots(slots);
        // A slot picked earlier and since taken is dropped, not kept silently.
        setA((prev) => (prev.callAt && !slots.includes(prev.callAt) ? { ...prev, callAt: null } : prev));
      });
    return () => {
      live = false;
    };
  }, [step, a.callMinutes, a.code]);

  // "2026-10-01" in her own time zone, for grouping slots by day.
  const dayOf = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const slotDays = [...new Set((freeSlots ?? []).map(dayOf))];
  const shownDay = callDay || (a.callAt ? dayOf(a.callAt) : "");
  const callLabel = (iso: string) =>
    new Date(iso).toLocaleString(locale, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

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
    set({ coachName: row.coach_name, askCycle: row.ask_cycle, callMinutes: row.call_minutes ?? null });
    setStep(2);
  }

  async function finish() {
    // One request per tap: a second one in the same second fails at Supabase.
    if (sending || sent) return;
    setSending(true);
    save(a);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?suite=${encodeURIComponent("/invitation/finaliser")}`,
      },
    });
    setSending(false);
    if (!error) {
      setSendError(null);
      setSent(true);
      return;
    }
    setSendError(error.status === 429 || /rate limit|security purposes/i.test(error.message ?? "") ? "wait" : "failed");
  }

  // Cycle tracking is offered only when the coach asked for it.
  const steps = [1, 2, 3, 4, 5, 6, ...(a.askCycle ? [7] : []), 8, 9];
  const shownIndex = steps.indexOf(step) + 1;

  function go(delta: number) {
    if (delta > 0 && !stepComplete(step, a)) {
      setMissing(true);
      return;
    }
    setMissing(false);
    save(a);
    const next = steps[steps.indexOf(step) + delta];
    if (next) setStep(next);
  }

  const titles: Record<number, [string, string]> = {
    1: [t("codeTitle"), t("codeIntro")],
    2: [t("meTitle"), t("meLede")],
    3: [t("whereTitle"), t("whereLede")],
    4: [t("objectiveTitle"), t("objectiveLede")],
    5: [t("frameTitle"), t("frameLede")],
    6: [t("bodyTitle"), t("bodyLede")],
    7: [t("cycleTitle"), t("cycleLede")],
    8: [t("consentTitle"), t("consentLede")],
    9: [t("summaryTitle"), t("summaryLede")],
  };
  const [title, lede] = titles[step];

  return (
    <main className="flex min-h-dvh items-start justify-center px-4 py-8 sm:items-center">
      <div className="atmosphere" aria-hidden />
      <div className="glass lift w-full max-w-[560px] rounded-r4 p-6 sm:p-8">
        {/* Where she is: a thin bar that fills, and the step in words. */}
        <div className="h-1.5 overflow-hidden rounded-rp bg-[var(--hair)]">
          <div
            className="cta h-full rounded-rp transition-[width] duration-500"
            style={{ width: `${(shownIndex / steps.length) * 100}%` }}
          />
        </div>

        <header className="mt-5 flex items-start gap-4">
          <span className="glass2 flex size-14 shrink-0 items-center justify-center rounded-r3 text-[var(--accent)]">
            <Icon name={STEP_ICON[step]} size={28} />
          </span>
          <div className="min-w-0">
            <p className="tnum text-[11px] font-bold uppercase tracking-[.14em] text-[var(--accent)]">
              {t("stepOf", { n: shownIndex, total: steps.length })}
            </p>
            <h1 className="mt-1.5 font-display text-[26px] font-extrabold uppercase leading-none tracking-[-.01em]">
              {title}
            </h1>
          </div>
        </header>
        <p className="mt-3 text-[14px] leading-[1.5] text-[var(--ink2)]">{lede}</p>
        {step === 2 && a.coachName && (
          <p className="mt-1 text-[13px] text-[var(--a1)]">{t("codeOk", { coach: a.coachName })}</p>
        )}

        <div className="mt-6 space-y-5">
          {step === 1 && (
            <>
              <Question label={t("codeTitle")} required>
                <input
                  value={a.code}
                  onChange={(e) => set({ code: e.target.value.toUpperCase() })}
                  placeholder={t("codePlaceholder")}
                  autoCapitalize="characters"
                  className={`${fieldClass} tnum text-center text-[20px] font-bold tracking-[.2em]`}
                />
              </Question>
              {codeBad && <p className="text-[13px] text-[var(--a3)]">{t("codeBad")}</p>}
              <Cta onClick={checkCode} disabled={checking || !a.code.trim()}>
                {t("next")}
              </Cta>
            </>
          )}

          {step === 2 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Question label={t("firstName")} required>
                <input autoComplete="given-name" value={a.firstName} onChange={(e) => set({ firstName: e.target.value })} className={fieldClass} />
              </Question>
              <Question label={t("lastName")} required>
                <input autoComplete="family-name" value={a.lastName} onChange={(e) => set({ lastName: e.target.value })} className={fieldClass} />
              </Question>
              <div>
                <Question label={t("birthDate")} required>
                  <input
                    type="date"
                    autoComplete="bday"
                    // The picker opens on the latest date an adult can have been born.
                    max={latestBirth}
                    value={a.birthDate}
                    onChange={(e) => set({ birthDate: e.target.value })}
                    className={fieldClass}
                  />
                </Question>
                {a.birthDate !== "" && !isAdult(a.birthDate) && (
                  <p className="mt-2 text-[12.5px] leading-[1.45] text-[var(--a3)]">{t("adultsOnly")}</p>
                )}
              </div>
              <Question label={t("whatsapp")} required>
                <input type="tel" autoComplete="tel" value={a.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} className={fieldClass} />
              </Question>
              <div className="sm:col-span-2">
                <Question label={t("instagram")} optional={t("optional")}>
                  <input value={a.instagram} onChange={(e) => set({ instagram: e.target.value })} placeholder="@" className={fieldClass} />
                </Question>
              </div>
            </div>
          )}

          {step === 3 && (
            <>
              <Question label={t("trainingAge")} required>
                <select value={a.trainingAge} onChange={(e) => set({ trainingAge: e.target.value })} className={fieldClass}>
                  <option value="">{t("pick")}</option>
                  {TRAINING_AGES.map((v) => (
                    <option key={v} value={v}>{t(`trainingAgeOpt.${v}`)}</option>
                  ))}
                </select>
              </Question>
              <Question label={t("perWeek")} required>
                <select value={a.sessionsPerWeek} onChange={(e) => set({ sessionsPerWeek: e.target.value })} className={fieldClass}>
                  <option value="">{t("pick")}</option>
                  {SESSIONS_PER_WEEK.map((v) => (
                    <option key={v} value={v}>{t(`perWeekOpt.${v}`)}</option>
                  ))}
                </select>
              </Question>
              <Question label={t("currentProgramme")} optional={t("optional")}>
                <input value={a.currentProgramme} onChange={(e) => set({ currentProgramme: e.target.value })} className={fieldClass} />
              </Question>
              <Question label={t("injuriesLabel")} hint={t("injuriesHint")} required>
                <textarea value={a.injuries} onChange={(e) => set({ injuries: e.target.value })} className={area} />
              </Question>
            </>
          )}

          {step === 4 && (
            <>
              <Question label={t("goalMain")} required>
                <select
                  value={a.goal ?? ""}
                  onChange={(e) => set({ goal: (e.target.value || null) as Answers["goal"] })}
                  className={fieldClass}
                >
                  <option value="">{t("pick")}</option>
                  {GOALS.map((g) => (
                    <option key={g} value={g}>{tGoal(g)}</option>
                  ))}
                </select>
              </Question>
              {a.goal === "Other" && (
                <Question label={t("goalOther")} required>
                  <input value={a.goalOther} onChange={(e) => set({ goalOther: e.target.value })} className={fieldClass} />
                </Question>
              )}
              <Question label={t("obstacles")} required>
                <textarea value={a.obstacles} onChange={(e) => set({ obstacles: e.target.value })} className={area} />
              </Question>
              <div className="space-y-2">
                <p className="text-[14px] font-semibold leading-[1.35]">
                  {t("readiness")}
                  <span className="text-[var(--accent)]"> •</span>
                </p>
                <div role="radiogroup" aria-label={t("readiness")} className="grid grid-cols-10 gap-1">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={a.readiness === n}
                      onClick={() => set({ readiness: n })}
                      className={`tnum h-11 rounded-r2 border text-[14px] font-bold ${
                        a.readiness === n
                          ? "cta border-transparent text-[var(--onA)]"
                          : "border-[var(--edge)] bg-[var(--glass2)] text-[var(--ink2)]"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between gap-4 text-[11.5px] text-[var(--ink3)]">
                  <span>{t("readinessLow")}</span>
                  <span className="text-right">{t("readinessHigh")}</span>
                </div>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <Question label={t("weeklyTime")} required>
                <input value={a.weeklyTime} onChange={(e) => set({ weeklyTime: e.target.value })} className={fieldClass} />
              </Question>
              <div className="space-y-2">
                <p className={micro}>{t("daysTitle")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                    <Pill
                      key={d}
                      selected={a.sessionDays.includes(d)}
                      onClick={() =>
                        set({
                          sessionDays: a.sessionDays.includes(d)
                            ? a.sessionDays.filter((x) => x !== d)
                            : [...a.sessionDays, d],
                        })
                      }
                    >
                      {tDays(String(d)).slice(0, 3)}
                    </Pill>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className={micro}>{t("equipmentTitle")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {EQUIPMENT.map((item) => (
                    <Pill
                      key={item}
                      selected={a.equipment.includes(item)}
                      onClick={() =>
                        set({
                          equipment: a.equipment.includes(item)
                            ? a.equipment.filter((x) => x !== item)
                            : [...a.equipment, item],
                        })
                      }
                    >
                      {tEquip(item)}
                    </Pill>
                  ))}
                </div>
              </div>
              {/* Asked only when the coach offered a call: one of her real
                  free slots, booked with the sign-up. None may suit. */}
              {a.callMinutes !== null && (
                <div className="space-y-2">
                  <p className="text-[14px] font-semibold leading-[1.35]">
                    {t("callSlots", { minutes: a.callMinutes })}
                  </p>
                  {freeSlots === null ? (
                    <p className="text-[13px] text-[var(--ink3)]">{t("callLoading")}</p>
                  ) : freeSlots.length === 0 ? (
                    <p className="text-[13px] leading-[1.45] text-[var(--ink2)]">{t("callNone")}</p>
                  ) : (
                    <div className="grid grid-cols-[1fr_7.5rem] gap-2">
                      <select
                        aria-label={t("callDay")}
                        value={shownDay}
                        onChange={(e) => {
                          setCallDay(e.target.value);
                          set({ callAt: null });
                        }}
                        className={fieldClass}
                      >
                        <option value="">{t("callDay")}</option>
                        {slotDays.map((day) => (
                          <option key={day} value={day}>
                            {new Date(`${day}T12:00`).toLocaleDateString(locale, {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            })}
                          </option>
                        ))}
                      </select>
                      <select
                        aria-label={t("callTime")}
                        value={a.callAt ?? ""}
                        disabled={!shownDay}
                        onChange={(e) => set({ callAt: e.target.value || null })}
                        className={`${fieldClass} tnum disabled:opacity-50`}
                      >
                        <option value="">{t("callTimePlaceholder")}</option>
                        {(freeSlots ?? [])
                          .filter((at) => dayOf(at) === shownDay)
                          .map((at) => (
                            <option key={at} value={at}>
                              {new Date(at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                  <span className="block text-[12px] leading-[1.45] text-[var(--ink3)]">{t("callSlotsHint")}</span>
                </div>
              )}
            </>
          )}

          {step === 6 && (
            <div className="grid gap-5 sm:grid-cols-3">
              <Question label={t("height")} optional={t("optional")}>
                <input inputMode="decimal" value={a.heightCm} onChange={(e) => set({ heightCm: e.target.value })} className={`${fieldClass} tnum`} />
              </Question>
              <Question label={t("weight")} optional={t("optional")}>
                <input inputMode="decimal" value={a.weightKg} onChange={(e) => set({ weightKg: e.target.value })} className={`${fieldClass} tnum`} />
              </Question>
              <Question label={t("sleepTitle")} optional={t("optional")}>
                <input inputMode="decimal" value={a.sleepTargetH} onChange={(e) => set({ sleepTargetH: e.target.value })} placeholder="8" className={`${fieldClass} tnum`} />
              </Question>
            </div>
          )}

          {step === 7 && (
            <>
              <p className="glass2 rounded-r3 p-4 text-[13px] leading-[1.5] text-[var(--ink2)]">
                {t("cyclePromise")}
              </p>
              <div className="flex flex-wrap gap-2">
                <Pill selected={a.cycleTracking} onClick={() => set({ cycleTracking: true })}>
                  {t("cycleOn")}
                </Pill>
                <Pill selected={!a.cycleTracking} onClick={() => set({ cycleTracking: false })}>
                  {t("cycleOff")}
                </Pill>
              </div>
            </>
          )}

          {step === 8 && (
            <>
            <p className="text-[13px] leading-[1.5] text-[var(--ink2)]">
              {t("consentMore")}{" "}
              <a href="/confidentialite" target="_blank" className="text-[var(--accent)] underline">
                {t("privacyLink")}
              </a>
            </p>
            <label className="glass2 flex cursor-pointer items-start gap-3 rounded-r3 p-4">
              <input
                type="checkbox"
                checked={a.healthConsent}
                onChange={(e) => set({ healthConsent: e.target.checked })}
                className="mt-0.5 size-5 shrink-0 accent-[var(--a2)]"
              />
              <span className="text-[14px] font-semibold leading-[1.45]">
                {t("consentBox")}
                <span className="text-[var(--accent)]"> •</span>
              </span>
            </label>
            </>
          )}

          {step === 9 && (
            <>
              <dl className="glass2 divide-y divide-[var(--hair)] rounded-r3 px-4 text-[13px]">
                {[
                  ["Coach", a.coachName],
                  [t("meTitle"), fullName(a)],
                  [t("birthDate"), a.birthDate && new Date(`${a.birthDate}T12:00:00`).toLocaleDateString("fr-FR")],
                  [t("trainingAge"), a.trainingAge && t(`trainingAgeOpt.${a.trainingAge}`)],
                  [t("goalMain"), a.goal && (a.goal === "Other" ? a.goalOther : tGoal(a.goal))],
                  [t("readiness"), a.readiness && `${a.readiness} / 10`],
                  [t("daysTitle"), a.sessionDays.slice().sort().map((d) => tDays(String(d)).slice(0, 3)).join(", ")],
                  ...(a.callMinutes !== null ? [[t("callSummary"), a.callAt ? callLabel(a.callAt) : t("callNotChosen")]] : []),
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex min-h-11 items-center justify-between gap-4 py-2">
                    <dt className="min-w-0 text-[var(--ink2)]">{label}</dt>
                    <dd className="tnum shrink-0 text-right font-semibold text-[var(--ink)]">{value || "—"}</dd>
                  </div>
                ))}
              </dl>

              <Question label={t("emailLabel")} required>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldClass}
                />
              </Question>

              <Cta onClick={finish} disabled={sending || sent || !email.trim() || !a.healthConsent}>
                {t("finish")}
              </Cta>
              {sendError && (
                <p role="alert" className="text-[14px] leading-[1.45] text-[var(--a3)]">
                  {sendError === "wait" ? tAuth("rateLimited") : tAuth("error")}
                </p>
              )}
              {sent && (
                <>
                  <p role="status" className="text-[14px] text-[var(--a1)]">
                    {t("sent")}
                  </p>
                  {/* The answers wait in this browser, so finishing here with the
                      code works even when the email was opened on another device. */}
                  <OtpCodeEntry
                    email={email}
                    onVerified={() => {
                      // A full load on purpose: the server must render with the
                      // session the code just wrote.
                      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                      window.location.href = "/invitation/finaliser";
                    }}
                  />
                </>
              )}
            </>
          )}
        </div>

        {missing && <p className="mt-4 text-[13px] text-[var(--a3)]">{t("required")}</p>}

        {step > 1 && (
          <div className="mt-6 flex gap-2">
            <Secondary onClick={() => go(-1)} className="flex-1">
              {t("back")}
            </Secondary>
            {step < LAST_STEP && (
              <div className="flex-[2]">
                <Cta onClick={() => go(1)}>{t("next")}</Cta>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
