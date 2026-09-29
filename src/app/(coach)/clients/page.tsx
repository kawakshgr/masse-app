import { createClient } from "@/lib/supabase/server";
import { loadQueue } from "@/lib/queue";
import { QueuePanel } from "@/components/QueuePanel";

/**
 * Where the coach lands: beside her roster, what needs her today — the
 * "À traiter" list — rather than an empty pane asking her to pick someone.
 */
export default async function ClientsIndexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [items, { data: coach }] = await Promise.all([
    loadQueue(supabase),
    // Her video link goes into the confirmation message of each booked call.
    supabase.from("coaches").select("call_link").eq("id", user?.id ?? "").maybeSingle(),
  ]);
  return <QueuePanel items={items} callLink={coach?.call_link ?? null} />;
}
