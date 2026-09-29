import { createClient } from "@/lib/supabase/server";
import { loadQueue } from "@/lib/queue";
import { QueuePanel } from "@/components/QueuePanel";

/**
 * Where the coach lands: beside her roster, what needs her today — the
 * "À traiter" list — rather than an empty pane asking her to pick someone.
 */
export default async function ClientsIndexPage() {
  const supabase = await createClient();
  const items = await loadQueue(supabase);
  return <QueuePanel items={items} />;
}
