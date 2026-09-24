import type { CheckInRow } from "@/lib/supabase/types";

type Content = Pick<
  CheckInRow,
  "feel" | "pain" | "adherence" | "bodyweight_kg" | "note" | "waist_cm" | "chest_cm" | "hips_cm" | "thigh_cm"
>;

/**
 * Whether a check-in row holds anything yet.
 *
 * Opening the form in the client app makes an empty row — a photo has to hang
 * off one before a single question is answered. Until she has written or
 * photographed something, that row is not a check-in, and must not be counted
 * as one for the coach to review.
 */
export function isFiled(row: Content, photoCount: number): boolean {
  return (
    photoCount > 0 ||
    row.feel !== null ||
    row.pain !== null ||
    row.adherence !== null ||
    row.bodyweight_kg !== null ||
    row.note !== null ||
    row.waist_cm !== null ||
    row.chest_cm !== null ||
    row.hips_cm !== null ||
    row.thigh_cm !== null
  );
}
