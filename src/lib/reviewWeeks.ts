import type { SupabaseClient } from "@supabase/supabase-js";
import type { CheckInRow, Database, PhotoPose } from "@/lib/supabase/types";
import type { ReviewWeek } from "@/components/CheckInReview";
import { isFiled } from "@/lib/checkIns";

/**
 * A client's filed check-ins as the review reads them, oldest first — week 1
 * is the baseline — with each photo behind a signed URL. Shared by the
 * client's Bilans tab and the check-in run (/bilans).
 */
export async function loadReviewWeeks(
  supabase: SupabaseClient<Database>,
  clientId: string,
  rows: CheckInRow[],
): Promise<{ checkIns: CheckInRow[]; weeks: ReviewWeek[] }> {
  const { data: photos } = await supabase
    .from("check_in_photos")
    .select("id, check_in_id, storage_path, pose")
    .eq("client_id", clientId);

  // Rows she opened and left empty are not weeks: they would count as a
  // check-in and push the real baseline aside.
  const photoCount = new Map<string, number>();
  for (const photo of photos ?? []) {
    photoCount.set(photo.check_in_id, (photoCount.get(photo.check_in_id) ?? 0) + 1);
  }
  const checkIns = rows.filter((row) =>
    isFiled(row, photoCount.get(row.id) ?? 0),
  );

  // The bucket is private, so every file is served through a signed URL.
  const paths = (photos ?? []).map((p) => p.storage_path);
  const signed =
    paths.length === 0
      ? []
      : ((
          await supabase.storage
            .from("check-in-photos")
            .createSignedUrls(paths, 3600)
        ).data ?? []);

  const urlByPath = new Map(
    signed.map((entry) => [entry.path ?? "", entry.signedUrl ?? null]),
  );

  const photosByCheckIn = new Map<
    string,
    Partial<Record<PhotoPose, { id: string; url: string | null }>>
  >();

  for (const photo of photos ?? []) {
    const slot = photosByCheckIn.get(photo.check_in_id) ?? {};
    slot[photo.pose] = {
      id: photo.id,
      url: urlByPath.get(photo.storage_path) ?? null,
    };
    photosByCheckIn.set(photo.check_in_id, slot);
  }

  const weeks: ReviewWeek[] = checkIns.map((row, index) => ({
    id: row.id,
    weekStart: row.week_start_date,
    number: index + 1,
    bodyweight: row.bodyweight_kg == null ? null : Number(row.bodyweight_kg),
    feel: row.feel,
    pain: row.pain,
    adherence: row.adherence,
    note: row.note,
    waist: row.waist_cm == null ? null : Number(row.waist_cm),
    chest: row.chest_cm == null ? null : Number(row.chest_cm),
    hips: row.hips_cm == null ? null : Number(row.hips_cm),
    thigh: row.thigh_cm == null ? null : Number(row.thigh_cm),
    photos: photosByCheckIn.get(row.id) ?? {},
    byClient: row.author === "client",
  }));


  return { checkIns, weeks };
}
