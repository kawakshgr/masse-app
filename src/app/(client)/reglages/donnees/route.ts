import { clientSession } from "@/lib/clientData";

/**
 * GDPR Art. 15 and 20: everything Masse keeps about the client, in one JSON
 * file they can read or take elsewhere. Read with their own session, so RLS
 * decides what is theirs. Photos are listed with links valid seven days —
 * the files themselves stay private.
 */
export async function GET() {
  const { supabase, client, today } = await clientSession();
  const id = client.id;

  const [profile, metrics, sets, checkIns, photos, cycle, meals, invoices, supplements] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle(),
    supabase.from("daily_metrics").select("day, sleep_h, sleep_quality, steps").eq("client_id", id).order("day"),
    supabase.from("set_logs").select("session_exercise_id, set_index, reps, weight_kg, rpe, logged_at").eq("client_id", id).order("logged_at"),
    supabase.from("check_ins").select("*").eq("client_id", id).order("week_start_date"),
    supabase.from("check_in_photos").select("check_in_id, pose, storage_path, uploaded_at").eq("client_id", id),
    supabase.from("cycle_logs").select("*").eq("client_id", id),
    supabase.from("meals").select("day, name, quantity_g, kcal, protein_g, carbs_g, fat_g, logged_at").eq("client_id", id).order("day"),
    supabase.from("invoices").select("invoice_number, period_start, amount_cents, currency, status, issued_at, paid_at").eq("client_id", id),
    supabase.from("client_supplements").select("name, dose, unit, timing").eq("client_id", id),
  ]);

  const paths = (photos.data ?? []).map((p) => p.storage_path);
  const { data: signed } = paths.length
    ? await supabase.storage.from("check-in-photos").createSignedUrls(paths, 7 * 24 * 3600)
    : { data: [] as { path: string | null; signedUrl: string }[] };
  const links = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  const body = {
    exported_at: new Date().toISOString(),
    about: "Masse — export of your personal data (GDPR Art. 15 and 20).",
    profile: profile.data,
    daily_metrics: metrics.data ?? [],
    set_logs: sets.data ?? [],
    check_ins: checkIns.data ?? [],
    check_in_photos: (photos.data ?? []).map((p) => ({ ...p, link_valid_7_days: links.get(p.storage_path) ?? null })),
    cycle_logs: cycle.data ?? [],
    meals: meals.data ?? [],
    supplements: supplements.data ?? [],
    invoices: invoices.data ?? [],
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="masse-mes-donnees-${today}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
