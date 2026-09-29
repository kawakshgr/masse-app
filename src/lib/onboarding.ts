import type { ClientGoal } from "@/lib/supabase/types";

export const STORAGE_KEY = "masse:onboarding";

/** The coach's own intake form's goals (29 Sep 2026); "Other" asks for words. */
export const GOALS: ClientGoal[] = ["Build muscle", "Lose fat", "Recomposition", "Other"];

export const TRAINING_AGES = ["lt6m", "6to12m", "1to3y", "gt3y"] as const;
export const SESSIONS_PER_WEEK = ["1-2", "3-4", "5+", "irregular"] as const;

export const EQUIPMENT = ["gym", "rack", "bands", "bodyweight"] as const;

export type Answers = {
  code: string;
  coachName: string | null;
  askCycle: boolean;
  // On fait connaissance
  firstName: string;
  lastName: string;
  birthDate: string;
  whatsapp: string;
  instagram: string;
  // Où en es-tu
  trainingAge: string;
  sessionsPerWeek: string;
  currentProgramme: string;
  injuries: string;
  // Ton objectif
  goal: ClientGoal | null;
  goalOther: string;
  obstacles: string;
  readiness: number | null;
  // Ton cadre
  weeklyTime: string;
  sessionDays: number[];
  equipment: string[];
  callSlots: string;
  // Ton corps
  heightCm: string;
  weightKg: string;
  sleepTargetH: string;
  cycleTracking: boolean;
  healthConsent: boolean;
};

export const EMPTY: Answers = {
  code: "",
  coachName: null,
  askCycle: false,
  firstName: "",
  lastName: "",
  birthDate: "",
  whatsapp: "",
  instagram: "",
  trainingAge: "",
  sessionsPerWeek: "",
  currentProgramme: "",
  injuries: "",
  goal: null,
  goalOther: "",
  obstacles: "",
  readiness: null,
  weeklyTime: "",
  sessionDays: [],
  equipment: [],
  callSlots: "",
  heightCm: "",
  weightKg: "",
  sleepTargetH: "",
  cycleTracking: false,
  healthConsent: false,
};

/** "Prénom Nom", the way the coach's roster names her. */
export function fullName(a: Answers) {
  return [a.firstName.trim(), a.lastName.trim()].filter(Boolean).join(" ");
}

export function load(): Answers | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? ({ ...EMPTY, ...JSON.parse(raw) } as Answers) : null;
  } catch {
    return null;
  }
}

export function save(answers: Answers) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  } catch {
    // Onboarding still completes in this tab; only resuming later is lost.
  }
}

export function clear() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}

/** Shapes the answers into the arguments claim_invite expects. */
export function toClaimArgs(a: Answers) {
  const num = (v: string) => {
    const n = Number(v.replace(",", "."));
    return v.trim() === "" || Number.isNaN(n) ? null : n;
  };

  const text = (v: string) => (v.trim() === "" ? null : v.trim());

  return {
    p_code: a.code,
    p_name: fullName(a),
    p_first_name: text(a.firstName),
    p_goal: a.goal,
    p_height_cm: num(a.heightCm),
    p_weight_kg: num(a.weightKg),
    p_injuries: a.injuries
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    p_equipment: a.equipment,
    p_session_days: a.sessionDays,
    p_sleep_target: num(a.sleepTargetH),
    p_cycle_tracking: a.cycleTracking,
    p_health_consent: a.healthConsent,
    p_birth_date: text(a.birthDate),
    p_whatsapp: text(a.whatsapp),
    p_instagram: text(a.instagram),
    p_training_age: text(a.trainingAge),
    p_sessions_per_week: text(a.sessionsPerWeek),
    p_current_programme: text(a.currentProgramme),
    p_goal_other: a.goal === "Other" ? text(a.goalOther) : null,
    p_obstacles: text(a.obstacles),
    p_readiness: a.readiness,
    p_weekly_time: text(a.weeklyTime),
    p_call_slots: text(a.callSlots),
  };
}

/** 18 or over on the given birth date (decided 29 Sep 2026: adults only —
 *  a minor's health data would need a parent's consent). */
export function isAdult(birthDate: string, today = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return false;
  const [y, m, d] = birthDate.split("-").map(Number);
  const limit = new Date(Date.UTC(today.getUTCFullYear() - 18, today.getUTCMonth(), today.getUTCDate()));
  return Date.UTC(y, m - 1, d) <= limit.getTime();
}

/** Whether a step's required answers are in — the same rule on both clients. */
export function stepComplete(step: number, a: Answers): boolean {
  switch (step) {
    case 1:
      return a.code.trim() !== "";
    case 2:
      return [a.firstName, a.lastName, a.birthDate, a.whatsapp].every((v) => v.trim() !== "") && isAdult(a.birthDate);
    case 3:
      return a.trainingAge !== "" && a.sessionsPerWeek !== "" && a.injuries.trim() !== "";
    case 4:
      return (
        a.goal !== null &&
        (a.goal !== "Other" || a.goalOther.trim() !== "") &&
        a.obstacles.trim() !== "" &&
        a.readiness !== null
      );
    case 5:
      return a.weeklyTime.trim() !== "" && a.callSlots.trim() !== "";
    case 8:
      return a.healthConsent;
    default:
      return true;
  }
}
