import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { loadRoster } from "@/lib/roster";
import { loadQueue } from "@/lib/queue";

/**
 * The roster and À traiter, read once per request. The coach's layout (her
 * top bar's count), the roster pane and À traiter itself all need them on
 * the same render; read three and two times over, /clients took up to 2 s.
 */
export const rosterNow = cache(async () => loadRoster(await createClient()));

export const queueNow = cache(async (locale: string) =>
  loadQueue(await createClient(), await rosterNow(), locale),
);
