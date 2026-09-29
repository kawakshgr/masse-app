import type { ClientGoal } from "@/lib/supabase/types";

export const STORAGE_KEY = "masse:onboarding";

/** The coach's own intake form's goals (29 Sep 2026); "Other" asks for words. */
export const GOALS: ClientGoal[] = ["Build muscle", "Lose fat", "Recomposition", "Other"];

export const TRAINING_AGES = ["lt6m", "6to12m", "1to3y", "gt3y"] as const;
export const SESSIONS_PER_WEEK = ["1-2", "3-4", "5+", "irregular"] as const;

export const EQUIPMENT = ["gym", "rack", "bands", "bodyweight"] as const;

/** A slot for the first call: "2026-10-01" and "18:30", both in her time. */
export type CallSlot = { date: string; time: string };

/** Slots a client may propose, and how many the form asks for. */
export const CALL_SLOTS_MAX = 3;
export const CALL_SLOTS_MIN = 2;

/** The next seven days after today, as "YYYY-MM-DD" in her own time zone. */
export function callDays(today = new Date()): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
}

/** Every half hour from 07:00 to 21:30. */
export const CALL_TIMES = Array.from({ length: 30 }, (_, i) => {
  const minutes = 7 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

const slotComplete = (slot: CallSlot) => slot.date !== "" && slot.time !== "";

export type Answers = {
  code: string;
  coachName: string | null;
  askCycle: boolean;
  /** The video call the coach offered, in minutes; null when none. */
  callMinutes: number | null;
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
  /** Up to three slots for the call, as picked: a day and a time. */
  callSlots: CallSlot[];
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
  callMinutes: null,
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
  callSlots: [],
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
    if (!raw) return null;
    const answers = { ...EMPTY, ...JSON.parse(raw) } as Answers;
    // Answers saved before 29 Sep 2026 held the slots as free text.
    if (!Array.isArray(answers.callSlots)) answers.callSlots = [];
    return answers;
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

/** "aucune", "Aucun.", "rien", "none", "-": the answer for no injury at all. */
const NO_INJURY = /^(aucune?|rien|non|none|no|néant|-+)\.?$/i;

/** Shapes the answers into the arguments claim_invite expects. Runs in her
 *  browser, so a slot's day and time are read in her own time zone. */
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
      // The form asks for "aucune" when there is nothing: that is not an injury.
      .filter((s) => s && !NO_INJURY.test(s)),
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
    p_call_slots: null,
    p_call_slots_at: a.callMinutes
      ? a.callSlots.filter(slotComplete).map((slot) => new Date(`${slot.date}T${slot.time}`).toISOString())
      : null,
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
      return (
        a.weeklyTime.trim() !== "" &&
        (a.callMinutes === null || a.callSlots.filter(slotComplete).length >= CALL_SLOTS_MIN)
      );
    case 8:
      return a.healthConsent;
    default:
      return true;
  }
}
