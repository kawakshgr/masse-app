import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { loadRoster } from "@/lib/roster";
import { TabBar } from "@/components/TabBar";
import { CommandPalette } from "@/components/CommandPalette";
import { ThemeToggle } from "@/components/ThemeToggle";

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
  const { entries, clientsNeedingYou, checkinsToReview } =
    await loadRoster(supabase);


  return (
    <div className="desk flex h-dvh flex-col">
      <div className="no-print contents">
        <TabBar
          name={coach.first_name ?? coach.name}
          initials={initialsOf(coach.first_name ?? coach.name)}
          subtitle={t("subtitle", {
            clients: clientsNeedingYou,
            checkins: checkinsToReview,
          })}
        >
          <ThemeToggle />
        </TabBar>
      </div>

      <CommandPalette clients={entries.map((e) => ({ id: e.id, name: e.name }))} />

      <div className="flex min-h-0 flex-1">{children}</div>
    </div>
  );
}
