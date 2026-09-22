import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { loadRoster } from "@/lib/roster";
import { TabBar } from "@/components/TabBar";

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
  if (!coach) redirect("/bienvenue");

  const t = await getTranslations("shell");
  const { clientsNeedingYou, checkinsToReview } = await loadRoster(supabase);

  // The Admin tab is only rendered for someone who can actually use it.
  const { data: admin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <>
      <div className="atmosphere" aria-hidden />
      <div className="flex h-dvh flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 px-4">
          <div className="min-w-0">
            <h1 className="truncate font-display text-[14px] font-extrabold tracking-[-.03em]">
              Masse — {coach.first_name ?? coach.name}
            </h1>
            {/* Derived from rows, with correct singular and plural. */}
            <p className="tnum truncate text-[11px] text-[var(--ink3)]">
              {t("subtitle", {
                clients: clientsNeedingYou,
                checkins: checkinsToReview,
              })}
            </p>
          </div>
        </header>

        <TabBar isPlatformAdmin={admin != null} />

        <div className="flex min-h-0 flex-1">{children}</div>
      </div>
    </>
  );
}
