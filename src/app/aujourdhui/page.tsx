import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

/**
 * The client's own screen. She sees only weeks whose assignment carries a
 * pushed_at — the database enforces that, not this component.
 */
export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: client } = await supabase
    .from("clients")
    .select("name, first_name")
    .eq("id", user.id)
    .maybeSingle();

  // A coach who lands here belongs on the roster instead.
  if (!client) redirect("/clients");

  const t = await getTranslations("today");
  const tDays = await getTranslations("days");

  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);

  const { data: assignments } = await supabase
    .from("assignments")
    .select(
      "start_date, programme_weeks(week_number, programmes(name), sessions(day_index, name, session_exercises(id, position, name, scheme, cue)))",
    )
    .gte("start_date", weekAgo.toISOString().slice(0, 10))
    .order("start_date", { ascending: false })
    .limit(1);

  const week = (assignments ?? [])[0]?.programme_weeks as unknown as
    | {
        week_number: number;
        programmes: { name: string } | null;
        sessions: {
          day_index: number;
          name: string | null;
          session_exercises: {
            id: string;
            position: number;
            name: string;
            scheme: string | null;
            cue: string | null;
          }[];
        }[];
      }
    | undefined;

  return (
    <main className="min-h-dvh p-5">
      <div className="atmosphere" aria-hidden />
      <header className="mb-5">
        <h1 className="font-display text-[26px] font-extrabold tracking-[-.04em]">
          {t("title")}
        </h1>
        <p className="text-[12px] text-[var(--ink3)]">
          {client.first_name ?? client.name}
          {week?.programmes?.name ? ` · ${week.programmes.name}` : ""}
        </p>
      </header>

      {!week ? (
        <div className="glass rounded-r3 p-5">
          <p className="text-[13px] font-semibold">{t("none")}</p>
          <p className="mt-1 text-[12px] text-[var(--ink2)]">{t("noneHint")}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {Array.from({ length: 7 }, (_, dayIndex) => {
            const session = week.sessions?.find((s) => s.day_index === dayIndex);
            return (
              <li key={dayIndex} className="glass rounded-r3 p-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-[13px] font-bold">
                    {tDays(String(dayIndex))}
                  </h2>
                  <span className="text-[11px] text-[var(--ink3)]">
                    {session?.name ?? t("rest")}
                  </span>
                </div>
                {session && session.session_exercises.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {[...session.session_exercises]
                      .sort((a, b) => a.position - b.position)
                      .map((exercise) => (
                        <li
                          key={exercise.id}
                          className="flex items-center justify-between gap-3 border-b border-[var(--hair)] py-2 last:border-0"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[12px] font-semibold">
                              {exercise.name}
                            </span>
                            {exercise.cue && (
                              <span className="block truncate text-[11px] text-[var(--ink3)]">
                                {exercise.cue}
                              </span>
                            )}
                          </span>
                          <span className="tnum shrink-0 text-[12px] text-[var(--ink2)]">
                            {exercise.scheme ?? "—"}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
