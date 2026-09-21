import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loadRoster } from "@/lib/roster";
import { SplitPane } from "@/components/SplitPane";
import { RosterList } from "@/components/RosterList";

/** 'MERLET-4K2P' — readable aloud over WhatsApp, which is how it travels. */
function generateCode(coachName: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
  const stem =
    (coachName.split(/\s+/).pop() ?? "MASSE")
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 8) || "MASSE";
  let tail = "";
  for (let i = 0; i < 4; i += 1) {
    tail += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${stem}-${tail}`;
}

export default async function ClientsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { entries } = await loadRoster(supabase);

  const { count: pendingInvites } = await supabase
    .from("invite_codes")
    .select("id", { count: "exact", head: true })
    .in("state", ["sent", "opened"])
    .gt("expires_at", new Date().toISOString());

  async function createInvite() {
    "use server";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: coach } = await supabase
      .from("coaches")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();

    await supabase.from("invite_codes").insert({
      coach_id: user.id,
      code: generateCode(coach?.name ?? "Masse"),
    });

    revalidatePath("/clients");
  }

  return (
    <SplitPane
      storageKey="masse:pane:clients"
      list={
        <RosterList
          entries={entries}
          pendingInvites={pendingInvites ?? 0}
          createInvite={createInvite}
        />
      }
      detail={children}
    />
  );
}
