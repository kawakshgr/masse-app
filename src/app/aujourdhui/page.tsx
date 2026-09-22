import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { SessionLogger, type LoggerExercise } from "@/components/SessionLogger";
import { EntryPanel } from "@/components/EntryPanel";
import { MealsPanel } from "@/components/MealsPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { deleteCycleLog, deleteSetLog } from "./actions";
import type { FoodRow, MealRow } from "@/lib/supabase/types";

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
  const tEntry = await getTranslations("entry");

  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);

  const todayIso = today.toISOString().slice(0, 10);

  const [assignmentsRes, cycleRes, foodsRes, mealsRes, setsRes, cycleLogsRes] =
    await Promise.all([
    supabase
      .from("assignments")
      .select(
        "start_date, programme_weeks(week_number, programmes(name), sessions(day_index, name, session_exercises(id, position, name, scheme, cue, target_sets, target_reps, target_weight_kg)))",
      )
      .gte("start_date", weekAgo.toISOString().slice(0, 10))
      .order("start_date", { ascending: false })
      .limit(1),
    supabase.rpc("client_cycle_state", { p_client: user.id }),
    // Her coach's library, readable to her so she can log against it.
    supabase.from("foods").select("id, name, brand").order("name"),
    supabase.from("meals").select("*").eq("day", todayIso).order("logged_at"),
    supabase
      .from("set_logs")
      .select("id, set_index, reps, weight_kg, rpe, session_exercise_id, logged_at")
      .gte("logged_at", `${todayIso}T00:00:00Z`)
      .order("logged_at"),
    supabase
      .from("cycle_logs")
      .select("id, period_start_date, cycle_length_days")
      .order("period_start_date", { ascending: false })
      .limit(6),
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

      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
        <h1 className="font-display text-[26px] font-extrabold tracking-[-.04em]">
          {t("title")}
        </h1>
        <p className="text-[12px] text-[var(--ink3)]">
          {client.first_name ?? client.name}
          {week?.programmes?.name ? ` · ${week.programmes.name}` : ""}
        </p>
        </div>
        <ThemeToggle />
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

      {/* Sets that reached the server today, each removable. */}
      {(setsRes.data ?? []).length > 0 && (
        <section className="glass rounded-r3 p-4">
          <h2 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
            {tLog("done")}
          </h2>
          <ul className="mt-2">
            {(setsRes.data ?? []).map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-3 border-b border-[var(--hair)] py-2 last:border-0"
              >
                <span className="tnum min-w-0 flex-1 truncate text-[12px]">
                  {[
                    row.reps ? `${row.reps} ${tLog("reps")}` : null,
                    row.weight_kg ? `${row.weight_kg} ${tLog("weight")}` : null,
                    row.rpe ? `${tLog("rpe")} ${row.rpe}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </span>
                <form action={deleteSetLog} className="shrink-0">
                  <input type="hidden" name="set_log_id" value={row.id} />
                  <button
                    type="submit"
                    className="rounded-r1 px-2 py-0.5 text-[10px] text-[var(--ink3)] hover:text-[var(--a3)]"
                  >
                    ×
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <MealsPanel
        day={todayIso}
        foods={(foodsRes.data ?? []) as Pick<FoodRow, "id" | "name" | "brand">[]}
        meals={(mealsRes.data ?? []) as MealRow[]}
      />

      <EntryPanel
        cycleTracking={client.cycle_tracking}
        phaseLabel={phase ? tPhase(phase) : null}
      />

      {/* Her cycle entries, each removable: the erasure right on her own rows. */}
      {client.cycle_tracking && (cycleLogsRes.data ?? []).length > 0 && (
        <section className="glass rounded-r3 p-4">
          <h2 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
            {tEntry("cycleTitle")}
          </h2>
          <ul className="mt-2">
            {(cycleLogsRes.data ?? []).map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-3 border-b border-[var(--hair)] py-2 last:border-0"
              >
                <span className="tnum min-w-0 flex-1 truncate text-[12px]">
                  {row.period_start_date} · {row.cycle_length_days} j
                </span>
                <form action={deleteCycleLog} className="shrink-0">
                  <input type="hidden" name="cycle_log_id" value={row.id} />
                  <button
                    type="submit"
                    className="rounded-r1 px-2 py-0.5 text-[10px] text-[var(--ink3)] hover:text-[var(--a3)]"
                  >
                    ×
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

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
