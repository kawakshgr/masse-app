import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { loadRoster } from "@/lib/roster";
import { TabBar } from "@/components/TabBar";
import { CommandPalette } from "@/components/CommandPalette";
import { ThemeToggle } from "@/components/ThemeToggle";

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
      <header className="topbar flex h-14 shrink-0 items-center gap-3 px-4">
        <div className="min-w-0">
          <h1 className="truncate font-display text-[15px] font-extrabold tracking-[-.02em]">
            Masse — {coach.first_name ?? coach.name}
          </h1>
          {/* Derived from rows, with correct singular and plural. */}
          <p className="tnum truncate text-[12px] text-[var(--ink2)]">
            {t("subtitle", {
              clients: clientsNeedingYou,
              checkins: checkinsToReview,
            })}
          </p>
        </div>

        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      <div className="no-print contents">
        <TabBar />
      </div>

      <CommandPalette clients={entries.map((e) => ({ id: e.id, name: e.name }))} />

      <div className="flex min-h-0 flex-1">{children}</div>
    </div>
  );
}
