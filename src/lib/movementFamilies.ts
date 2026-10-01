/**
 * The library sorted for a thumb: eight families and four kinds of kit,
 * folded from the dozens of muscle groups and equipment names Hevy and the
 * built-in catalogue write. Plain module, shared by any picker.
 */
export const FAMILIES = [
  { key: "chest", groups: ["Chest"] },
  { key: "back", groups: ["Lats", "Upper Back", "Back", "Lower Back", "Traps"] },
  { key: "shoulders", groups: ["Shoulders", "Rear Delts", "Neck"] },
  { key: "arms", groups: ["Biceps", "Triceps", "Forearms"] },
  { key: "legs", groups: ["Quadriceps", "Quads", "Hamstrings", "Calves", "Adductors", "Abductors"] },
  { key: "glutes", groups: ["Glutes", "Posterior Chain"] },
  { key: "abs", groups: ["Abdominals", "Core"] },
  // Cardio, conditioning, full body and whatever names no muscle.
  { key: "cardio", groups: [] },
] as const;

export type FamilyKey = (typeof FAMILIES)[number]["key"];

export function familyOf(muscleGroup: string | null): FamilyKey {
  const hit = FAMILIES.find((family) =>
    (family.groups as readonly string[]).includes(muscleGroup ?? ""),
  );
  return hit?.key ?? "cardio";
}

export const KITS = ["barbell", "dumbbell", "machine", "other"] as const;
export type KitKey = (typeof KITS)[number];

export function kitOf(equipment: string | null): KitKey {
  if (equipment === "Barbell" || equipment === "Trap Bar" || equipment === "Plate") return "barbell";
  if (equipment === "Dumbbell" || equipment === "Kettlebell") return "dumbbell";
  if (equipment === "Machine" || equipment === "Cable" || equipment === "Sled") return "machine";
  return "other";
}

/** "Développé" finds "developpe": accents and case never stop a search. */
export function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}
