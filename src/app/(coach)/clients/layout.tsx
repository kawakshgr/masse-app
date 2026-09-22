import { createClient } from "@/lib/supabase/server";
import { loadRoster } from "@/lib/roster";
import { SplitPane } from "@/components/SplitPane";
import { RosterList } from "@/components/RosterList";

export default async function ClientsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { entries } = await loadRoster(supabase);

  // The coach needs the codes themselves, not a count she cannot send.
  const { data: pendingInvites } = await supabase
    .from("invite_codes")
    .select("id, code, state, expires_at")
    .in("state", ["sent", "opened"])
    .gt("expires_at", new Date().toISOString())
    .order("issued_at", { ascending: false });

  return (
    <SplitPane
      storageKey="masse:pane:clients"
      list={
        <RosterList entries={entries} pendingInvites={pendingInvites ?? []} />
      }
      detail={children}
    />
  );
}
