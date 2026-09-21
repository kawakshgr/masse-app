import type { ClientGoal } from "@/lib/supabase/types";

export const STORAGE_KEY = "masse:onboarding";

export const GOALS: ClientGoal[] = [
  "Get stronger",
  "Build muscle",
  "Lean out",
  "Move better",
];

export const EQUIPMENT = ["gym", "rack", "bands", "bodyweight"] as const;

export type Answers = {
  code: string;
  coachName: string | null;
  askCycle: boolean;
  name: string;
  firstName: string;
  goal: ClientGoal | null;
  heightCm: string;
  weightKg: string;
  birthYear: string;
  injuries: string;
  equipment: string[];
  sessionDays: number[];
  cycleTracking: boolean;
  sleepTargetH: string;
};

export const EMPTY: Answers = {
  code: "",
  coachName: null,
  askCycle: false,
  name: "",
  firstName: "",
  goal: null,
  heightCm: "",
  weightKg: "",
  birthYear: "",
  injuries: "",
  equipment: [],
  sessionDays: [],
  cycleTracking: false,
  sleepTargetH: "",
};

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

  return {
    p_code: a.code,
    p_name: a.name.trim(),
    p_first_name: a.firstName.trim() || null,
    p_goal: a.goal,
    p_height_cm: num(a.heightCm),
    p_weight_kg: num(a.weightKg),
    p_birth_year: a.birthYear.trim() === "" ? null : Number(a.birthYear),
    p_injuries: a.injuries
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    p_equipment: a.equipment,
    p_session_days: a.sessionDays,
    p_sleep_target: num(a.sleepTargetH),
    p_cycle_tracking: a.cycleTracking,
  };
}
