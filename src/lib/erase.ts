import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * A client's check-in photos, removed from storage. The storage schema
 * refuses deletes from SQL, so every erasure — asked by the client, done by
 * the coach, or run by the retention job — calls this before the database
 * function that drops the rows. RLS decides whether the caller may.
 */
export async function removeCheckInPhotos(
  supabase: SupabaseClient<Database>,
  clientId: string,
): Promise<void> {
  const { data } = await supabase.from("check_in_photos").select("storage_path").eq("client_id", clientId);
  const paths = (data ?? []).map((row) => row.storage_path).filter(Boolean);
  // The API takes a list; keep each call small.
  for (let i = 0; i < paths.length; i += 100) {
    await supabase.storage.from("check-in-photos").remove(paths.slice(i, i + 100));
  }
  if (paths.length > 0) {
    await supabase.from("check_in_photos").delete().eq("client_id", clientId);
  }
}
