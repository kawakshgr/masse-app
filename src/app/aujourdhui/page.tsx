import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { SessionLogger, type LoggerExercise } from "@/components/SessionLogger";
import { EntryPanel } from "@/components/EntryPanel";

type WeekShape = {
  week_number: number;
  programmes: { name: string } | null;
  sessions: {
    day_index: number;
    name: string | null;
    session_exercises: (LoggerExercise & { position: number })[];
  }[];
};

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
    .select("id, name, first_name, cycle_tracking")
    .eq("id", user.id)
    .maybeSingle();

  // A coach who lands here belongs on the roster instead.
  if (!client) redirect("/clients");

  const t = await getTranslations("today");
  const tLog = await getTranslations("log");
  const tDays = await getTranslations("days");
  const tPhase = await getTranslations("phase");

  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);

  const [assignmentsRes, cycleRes] = await Promise.all([
    supabase
      .from("assignments")
      .select(
        "start_date, programme_weeks(week_number, programmes(name), sessions(day_index, name, session_exercises(id, position, name, scheme, cue, target_sets, target_reps, target_weight_kg)))",
      )
      .gte("start_date", weekAgo.toISOString().slice(0, 10))
      .order("start_date", { ascending: false })
      .limit(1),
    supabase.rpc("client_cycle_state", { p_client: user.id }),
  ]);

  const assignment = (assignmentsRes.data ?? [])[0];
  const week = assignment?.programme_weeks as unknown as WeekShape | undefined;

  const phase = (cycleRes.data ?? [])[0]?.phase ?? null;

  // Which day of the pushed week is today?
  let todayIndex: number | null = null;
  if (assignment) {
    const start = new Date(`${assignment.start_date}T00:00:00Z`);
    const elapsed = Math.floor(
      (Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) -
        start.getTime()) /
        86_400_000,
    );
    if (elapsed >= 0 && elapsed < 7) todayIndex = elapsed;
  }

  const todaySession =
    todayIndex === null
      ? undefined
      : week?.sessions?.find((s) => s.day_index === todayIndex);

  return (
    <main className="mx-auto min-h-dvh max-w-[720px] space-y-4 p-5">
      <div className="atmosphere" aria-hidden />

      <header>
        <h1 className="font-display text-[26px] font-extrabold tracking-[-.04em]">
          {t("title")}
        </h1>
        <p className="text-[12px] text-[var(--ink3)]">
          {client.first_name ?? client.name}
          {week?.programmes?.name ? ` · ${week.programmes.name}` : ""}
        </p>
      </header>

      {todaySession && todaySession.session_exercises.length > 0 ? (
        <SessionLogger
          clientId={client.id}
          sessionName={todaySession.name}
          exercises={[...todaySession.session_exercises].sort(
            (a, b) => a.position - b.position,
          )}
        />
      ) : (
        <section className="glass rounded-r3 p-4">
          <p className="text-[13px] font-semibold">
            {week ? tLog("noSession") : t("none")}
          </p>
          {!week && (
            <p className="mt-1 text-[12px] text-[var(--ink2)]">{t("noneHint")}</p>
          )}
        </section>
      )}

      <EntryPanel
        cycleTracking={client.cycle_tracking}
        phaseLabel={phase ? tPhase(phase) : null}
      />

      {week && (
        <section className="glass rounded-r3 p-4">
          <h2 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
            {t("week")}
          </h2>
          <ul className="mt-2">
            {Array.from({ length: 7 }, (_, dayIndex) => {
              const session = week.sessions?.find((s) => s.day_index === dayIndex);
              const isToday = dayIndex === todayIndex;
              return (
                <li
                  key={dayIndex}
                  className="flex items-center gap-3 border-b border-[var(--hair)] py-2 last:border-0"
                >
                  <span
                    className={`w-12 shrink-0 text-[11px] ${
                      isToday ? "font-bold text-[var(--ink)]" : "text-[var(--ink3)]"
                    }`}
                  >
                    {tDays(String(dayIndex)).slice(0, 3)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px]">
                    {session?.name ?? t("rest")}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
