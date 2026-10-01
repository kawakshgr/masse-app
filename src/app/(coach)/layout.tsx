import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { intl } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";
import { loadRoster } from "@/lib/roster";
import { loadQueue } from "@/lib/queue";
import { TabBar } from "@/components/TabBar";
import { CommandPalette } from "@/components/CommandPalette";

/** "Kevin Cordeiro" → "KC"; one name gives its first two letters. */
function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? "").slice(0, 2);
  return letters.toUpperCase();
}

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: coach } = await supabase
    .from("coaches")
    .select("name, first_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!coach) {
    // A client who lands here — the installed app opens at "/" — belongs on
    // her own screens, not on a page telling her she cannot be a coach.
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    redirect(client ? "/aujourdhui" : "/bienvenue");
  }

  const t = await getTranslations("shell");
  const roster = await loadRoster(supabase);
  const { entries, checkinsToReview } = roster;
  // Counted from the same list as À traiter, so the line under her name
  // never says nobody needs her beside a pane that says otherwise.
  const queue = await loadQueue(supabase, roster, intl(await getLocale()));
  const clientsNeedingYou = new Set(queue.map((item) => item.clientId)).size;

  return (
    // On a phone the installed app draws under the status bar: the top inset
    // is kept clear, and the tab bar moves to the bottom, under the thumb.
    // There the frame is pinned to the top of the screen and sized by the
    // screen itself (--app-h, set in the root layout: iOS 26 measures an
    // installed app short), so the tab bar sits on the bottom edge and the
    // document has nothing to scroll — only the pane does.
    <div className="desk flex h-dvh flex-col max-md:fixed max-md:inset-x-0 max-md:top-0 max-md:h-[var(--app-h,100dvh)] print:static max-md:pt-[env(safe-area-inset-top)]">
      <div className="no-print contents">
        <TabBar
          name={coach.first_name ?? coach.name}
          initials={initialsOf(coach.name)}
          subtitle={t("subtitle", {
            clients: clientsNeedingYou,
            checkins: checkinsToReview,
          })}
        />
      </div>

      <CommandPalette clients={entries.map((e) => ({ id: e.id, name: e.name }))} />

      {/* Every page scrolls in here, never the document: a page taller than
          the screen would otherwise carry the tab bar off with it. */}
      <div className="flex min-h-0 flex-1 overflow-y-auto overscroll-contain print:block print:overflow-visible">{children}</div>
    </div>
  );
}
