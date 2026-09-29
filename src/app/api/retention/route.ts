import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { removeCheckInPhotos } from "@/lib/erase";
import type { Database } from "@/lib/supabase/types";

/**
 * The retention job (GDPR Art. 5(1)(e)), run daily by Vercel Cron: archived
 * clients lose their check-in photos after 3 months and are erased after 12.
 * It needs the service role — no signed-in user can read other people's
 * rows — so it runs only with Vercel's CRON_SECRET, and does nothing without
 * SUPABASE_SERVICE_ROLE_KEY.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorised", { status: 401 });
  }

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) {
    return Response.json({ ok: false, reason: "SUPABASE_SERVICE_ROLE_KEY is not set" }, { status: 500 });
  }

  const admin = createClient<Database>(url, key, { auth: { persistSession: false } });
  const { data: due, error } = await admin.rpc("retention_due");
  if (error) return Response.json({ ok: false, reason: error.message }, { status: 500 });

  let photos = 0;
  let erased = 0;
  for (const row of due ?? []) {
    await removeCheckInPhotos(admin, row.client_id);
    photos += 1;
    if (row.erase) {
      await admin.rpc("retention_erase", { p_client: row.client_id });
      erased += 1;
    }
  }

  return Response.json({ ok: true, photosCleared: photos, clientsErased: erased });
}
