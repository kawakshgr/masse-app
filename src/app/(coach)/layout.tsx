import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { intl } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";
import { queueNow, rosterNow } from "@/lib/coachData";
import { TabBar } from "@/components/TabBar";
import { CommandPalette } from "@/components/CommandPalette";
import { PullToRefresh } from "@/components/PullToRefresh";
import { authUser } from "@/lib/supabase/auth";

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
  const user = await authUser();
  if (!user) redirect("/connexion");

  // The roster and À traiter start with the coach's row, not after it
  // (1 Oct 2026); for a client sent away below they are simply not used.
  const locale = intl(await getLocale());
  const rosterRead = rosterNow();
  const queueRead = queueNow(locale);
  void rosterRead.catch(() => {});
  void queueRead.catch(() => {});

  const { data: coach } = await supabase.from("coaches").select("name, first_name").eq("id", user.id).maybeSingle();
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

  // The line under her name and the palette's names arrive when ready
  // (2 Oct 2026): the page beside them no longer waits for the roster and
  // À traiter to be counted before it shows.

  return (
    // On a phone the installed app draws under the status bar: the top inset
    // is kept clear, and the tab bar moves to the bottom, under the thumb.
    // There the frame is pinned to the top of the screen and ends where iOS
    // still paints (--app-h less --app-gap, set in the root layout: iOS 26
    // draws nothing in the bottom band of an installed app), so the tab bar
    // is whole and the document has nothing to scroll — only the pane does.
    <>
    {/* The client app's light behind the glass, on every screen (1 Oct 2026). */}
    <div className="atmosphere print:hidden" aria-hidden />
    <div className="desk flex h-dvh flex-col max-md:fixed max-md:inset-x-0 max-md:top-0 max-md:h-[calc(var(--app-h,100dvh)-var(--app-gap,0px))] print:static max-md:pt-[env(safe-area-inset-top)]">
      <div className="no-print contents">
        <TabBar
          name={coach.first_name ?? coach.name}
          initials={initialsOf(coach.name)}
          subtitle={
            <Suspense fallback={<span className="opacity-0">·</span>}>
              <NeedsLine locale={locale} />
            </Suspense>
          }
        />
      </div>

      <Suspense fallback={null}>
        <Palette />
      </Suspense>

      {/* Every page scrolls in here, never the document: a page taller than
          the screen would otherwise carry the tab bar off with it. */}
      <div className="pane-frame flex min-h-0 flex-1 overflow-y-auto overscroll-contain print:block print:overflow-visible">{children}</div>
    </div>
    <PullToRefresh />
    </>
  );
}

/** Counted from the same list as À traiter, so the line under her name
 *  never says nobody needs her beside a pane that says otherwise. */
async function NeedsLine({ locale }: { locale: string }) {
  const [{ checkinsToReview }, queue, t] = await Promise.all([rosterNow(), queueNow(locale), getTranslations("shell")]);
  return <>{t("subtitle", { clients: new Set(queue.map((item) => item.clientId)).size, checkins: checkinsToReview })}</>;
}

async function Palette() {
  const { entries } = await rosterNow();
  return <CommandPalette clients={entries.map((e) => ({ id: e.id, name: e.name }))} />;
}
