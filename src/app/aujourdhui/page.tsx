import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { SessionLogger, type LoggerExercise } from "@/components/SessionLogger";
import { EntryPanel } from "@/components/EntryPanel";
import { MealsPanel } from "@/components/MealsPanel";
import { MyWeek } from "@/components/MyWeek";
import { ThemeToggle } from "@/components/ThemeToggle";
import { deleteCycleLog, deleteSetLog } from "./actions";
import { SUPPLEMENT_TIMINGS, type FoodRow, type MealRow } from "@/lib/supabase/types";

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
  const tProto = await getTranslations("proto");
  const tSupp = await getTranslations("supp");

  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);

  const todayIso = today.toISOString().slice(0, 10);
  // Monday is 0, as the database counts — and as the programme editor labels
  // its seven columns. Both sessions.day_index and client_week_days.day_index
  // mean this same thing.
  const todayWeekday = (today.getUTCDay() + 6) % 7;

  const [
    assignmentsRes,
    cycleRes,
    foodsRes,
    mealsRes,
    setsRes,
    cycleLogsRes,
    typesRes,
    weekRes,
    targetsRes,
    protocolRes,
  ] = await Promise.all([
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
    supabase
      .from("day_types")
      .select("id, name, is_rest, position")
      .eq("client_id", user.id)
      .order("position"),
    supabase
      .from("client_week_days")
      .select("day_index, day_type_id")
      .eq("client_id", user.id),
    supabase.from("nutrition_targets").select("*").eq("client_id", user.id),
    supabase
      .from("client_supplements")
      .select("id, name, dose, unit, timing, day_type_id, position")
      .eq("client_id", user.id)
      .order("position"),
  ]);

  const assignment = (assignmentsRes.data ?? [])[0];
  const week = assignment?.programme_weeks as unknown as WeekShape | undefined;

  const phase = (cycleRes.data ?? [])[0]?.phase ?? null;

  // Which session is today's. day_index is a weekday — the editor labels those
  // seven columns Lundi to Dimanche — so it is read as one.
  //
  // This used to count days elapsed since start_date, which is only the same
  // number when the coach pushed on a Monday. Push on a Wednesday and the
  // client was shown Monday's session, while the native app, which always read
  // the weekday, showed Wednesday's. start_date decides which week is current,
  // which the query above already does with it; it does not number the days.
  const todayIndex: number | null = assignment ? todayWeekday : null;

  const todaySession =
    todayIndex === null
      ? undefined
      : week?.sessions?.find((s) => s.day_index === todayIndex);

  // Which kind of day today is for her, and what it asks her to eat. Falls
  // back to the default row when the day has no type, which is what a client
  // with no day types at all always gets.
  const todayTypeId =
    (weekRes.data ?? []).find((row) => row.day_index === todayWeekday)
      ?.day_type_id ?? null;
  const todayType =
    (typesRes.data ?? []).find((type) => type.id === todayTypeId) ?? null;
  const allTargets = targetsRes.data ?? [];
  const todayTarget =
    allTargets.find((row) => row.day_type_id === todayTypeId) ??
    allTargets.find((row) => row.day_type_id === null) ??
    null;

  // Today's supplements: the ones for today's type, plus the everyday ones,
  // in the order the day runs rather than the order the coach typed them.
  const timingOrder = new Map(
    SUPPLEMENT_TIMINGS.map((key, index) => [key, index] as const),
  );
  const todaySupplements = (protocolRes.data ?? [])
    .filter((row) => row.day_type_id === null || row.day_type_id === todayTypeId)
    .sort(
      (a, b) =>
        (timingOrder.get(a.timing) ?? 9) - (timingOrder.get(b.timing) ?? 9),
    );

  return (
    <main className="mx-auto min-h-dvh max-w-[720px] space-y-4 p-5">
      <div className="atmosphere" aria-hidden />

      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
        <h1 className="font-display text-[26px] font-extrabold tracking-[-.03em]">
          {t("title")}
        </h1>
        <p className="text-[13px] text-[var(--ink3)]">
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
          <p className="text-[14px] font-semibold">
            {week ? tLog("noSession") : t("none")}
          </p>
          {!week && (
            <p className="mt-1 text-[13px] text-[var(--ink2)]">{t("noneHint")}</p>
          )}
        </section>
      )}

      {/* Sets that reached the server today, each removable. */}
      {(setsRes.data ?? []).length > 0 && (
        <section className="glass rounded-r3 p-4">
          <h2 className="text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
            {tLog("done")}
          </h2>
          <ul className="mt-2">
            {(setsRes.data ?? []).map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-3 border-b border-[var(--hair)] py-2 last:border-0"
              >
                <span className="tnum min-w-0 flex-1 truncate text-[13px]">
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
                    className="rounded-r1 px-2 py-0.5 text-[11px] text-[var(--ink3)] hover:text-[var(--a3)]"
                  >
                    ×
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {todayType && (
        <section className="glass rounded-r3 p-4">
          <h2 className="text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
            {t("todayIs")}
          </h2>
          <p className="mt-1.5 text-[19px] font-semibold">{todayType.name}</p>
          {todayTarget && (
            <p className="tnum mt-1 text-[13px] text-[var(--ink2)]">
              {t("todayKcal", { kcal: todayTarget.kcal })}
            </p>
          )}
        </section>
      )}

      {todaySupplements.length > 0 && (
        <section className="glass rounded-r3 p-4">
          <h2 className="text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
            {tProto("todayTitle")}
          </h2>
          <ul className="mt-2 space-y-1.5">
            {todaySupplements.map((row) => (
              <li
                key={row.id}
                className="flex items-baseline justify-between gap-3 rounded-r2 border border-[var(--hair)] px-3 py-2"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold">
                    {row.name}
                  </span>
                  <span className="block text-[11.5px] text-[var(--ink3)]">
                    {tSupp(`timing.${row.timing}`)}
                  </span>
                </span>
                {row.dose !== null && (
                  <span className="tnum shrink-0 text-[14px] font-semibold text-[var(--ink2)]">
                    {Number(row.dose).toLocaleString("fr-FR")}{" "}
                    {tSupp(`unit.${row.unit}`, { count: Number(row.dose) })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <MyWeek
        clientId={user.id}
        week={[0, 1, 2, 3, 4, 5, 6].map((day) => {
          const id = (weekRes.data ?? []).find((row) => row.day_index === day)
            ?.day_type_id;
          return (typesRes.data ?? []).find((type) => type.id === id)?.name ?? null;
        })}
        types={(typesRes.data ?? []).map((type) => ({
          id: type.id,
          name: type.name,
          isRest: type.is_rest,
        }))}
      />

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
          <h2 className="text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
            {tEntry("cycleTitle")}
          </h2>
          <ul className="mt-2">
            {(cycleLogsRes.data ?? []).map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-3 border-b border-[var(--hair)] py-2 last:border-0"
              >
                <span className="tnum min-w-0 flex-1 truncate text-[13px]">
                  {row.period_start_date} · {row.cycle_length_days} j
                </span>
                <form action={deleteCycleLog} className="shrink-0">
                  <input type="hidden" name="cycle_log_id" value={row.id} />
                  <button
                    type="submit"
                    className="rounded-r1 px-2 py-0.5 text-[11px] text-[var(--ink3)] hover:text-[var(--a3)]"
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
          <h2 className="text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
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
                    className={`w-12 shrink-0 text-[12px] ${
                      isToday ? "font-semibold text-[var(--ink)]" : "text-[var(--ink3)]"
                    }`}
                  >
                    {tDays(String(dayIndex)).slice(0, 3)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px]">
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
