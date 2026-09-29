/**
 * The scheme the coach types — "4×8", "4 x 8 @ 60 kg", "3×10 62,5kg" — read
 * into the numbers the rest of the app works from: the client's pre-filled
 * sets, the cycle levers, and next week's progression. Anything else (a rep
 * range, "AMRAP", "3×8-10") stays text only and has no target: nothing is
 * guessed.
 */
export type SchemeTargets = { sets: number; reps: number; weight: number | null };

const SCHEME = /^\s*(\d{1,2})\s*[x×X*]\s*(\d{1,3})\s*(?:(?:@|à)?\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*kg|@\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:kg)?)?\s*$/;

export function parseScheme(text: string | null | undefined): SchemeTargets | null {
  const match = SCHEME.exec(text ?? "");
  if (!match) return null;
  const sets = Number(match[1]);
  const reps = Number(match[2]);
  if (sets < 1 || reps < 1) return null;
  const load = match[3] ?? match[4];
  return { sets, reps, weight: load == null ? null : Number(load.replace(",", ".")) };
}

/** Back to text after a progression: "4×8 @ 62,5 kg". */
export function formatScheme({ sets, reps, weight }: SchemeTargets): string {
  const load = weight == null ? "" : ` @ ${String(weight).replace(".", ",")} kg`;
  return `${sets}×${reps}${load}`;
}

/** The columns a scheme sets — all null when it is not one we can read. */
export function schemeColumns(text: string | null | undefined) {
  const parsed = parseScheme(text);
  return {
    target_sets: parsed?.sets ?? null,
    target_reps: parsed?.reps ?? null,
    target_weight_kg: parsed?.weight ?? null,
  };
}
