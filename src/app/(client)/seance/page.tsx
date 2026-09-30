import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ExportCard } from "@/components/client/ExportCard";
import { clientSession, currentWeek, localDay, todaySession, weekPlan } from "@/lib/clientData";
import { isMoved } from "@/lib/dayMoves";
import { resetWeek, swapWithToday } from "../actions";
import { Card, CardTitle, Kicker, ScreenHeader } from "@/components/client/ui";
import { TrainLog } from "@/components/client/TrainLog";
import { LeverLine } from "@/components/client/LeverLine";
import { lastTimeLines, type PastSet } from "@/lib/lastTime";

/**
 * Séance — today's session, being done; or another day's, when it is asked
 * for: sessions get moved, and a session missed on Monday is done on Tuesday.
 * Another day can trade places with today — the day type, so the food,
 * goes with it (lib/dayMoves.ts). Under it, the week as it now stands: what
 * is planned each day and what is already logged.
 */
export default async function SessionPage({
  searchParams,
}: {
  searchParams: Promise<{ jour?: string }>;
}) {
  const { jour } = await searchParams;
  const { supabase, client, zone, weekday } = await clientSession();
  const asked = jour !== undefined && /^[0-6]$/.test(jour) ? Number(jour) : undefined;
  const day = asked ?? weekday;
  const [{ session, levers }, week, plan] = await Promise.all([todaySession(day), currentWeek(), weekPlan()]);
  const t = await getTranslations("log");
  const tWeek = await getTranslations("myWeek");
  const tDays = await getTranslations("days");
  const locale = (await getLocale()) === "en" ? "en-GB" : "fr-FR";

  const exercises = session?.session_exercises ?? [];
  const weekIds = (week?.sessions ?? []).flatMap((s) => s.session_exercises.map((e) => e.id));

  // Everything logged on this week's exercises since the week started for
  // her: a set she already did must show, whichever day she did it, or she
  // is invited to do it again.
  const { data: weekLogs } = weekIds.length
    ? await supabase
        .from("set_logs")
        .select("id, session_exercise_id, set_index, reps, weight_kg, rpe, synced_at, logged_at")
        .in("session_exercise_id", weekIds)
        .gte("logged_at", `${week!.startDate}T00:00:00Z`)
    : { data: [] };
  const logs = weekLogs ?? [];
  const onServer = logs.filter((row) => exercises.some((e) => e.id === row.session_exercise_id));

  // "La dernière fois": her latest sets on the same movements, from earlier
  // weeks — the figure she is trying to beat.
  const names = [...new Set(exercises.map((e) => e.name))];
  // Two plain reads rather than a filter on an embedded table: every row of
  // these movements she was ever sent (RLS shows only hers), then her sets.
  const { data: sameMovements } = names.length
    ? await supabase.from("session_exercises").select("id, name").in("name", names)
    : { data: [] };
  const nameOf = new Map((sameMovements ?? []).map((row) => [row.id, row.name]));
  const earlierIds = [...nameOf.keys()].filter((id) => !weekIds.includes(id));
  const { data: past } = earlierIds.length
    ? await supabase
        .from("set_logs")
        .select("reps, weight_kg, logged_at, session_exercise_id")
        .eq("client_id", client.id)
        .in("session_exercise_id", earlierIds)
        .order("logged_at", { ascending: false })
        .limit(400)
    : { data: [] };
  const pastSets: PastSet[] = (past ?? []).map((row) => ({
    name: nameOf.get(row.session_exercise_id) ?? "",
    reps: row.reps,
    weightKg: row.weight_kg === null ? null : Number(row.weight_kg),
    day: localDay(zone, new Date(row.logged_at)),
  }));
  const lastByName = lastTimeLines(pastSets, locale, (count, best) => t("lastMixed", { count, best }));
  const last = Object.fromEntries(
    exercises.flatMap((e) => {
      const line = lastByName.get(e.name);
      return line ? [[e.id, t("lastTime", { day: line.day, sets: line.summary })]] : [];
    }),
  );

  const otherDay = asked !== undefined && asked !== weekday;

  return (
    <>
      <ScreenHeader
        kicker={otherDay ? t("dayKicker", { day: tDays(String(day)) }) : t("title")}
        title={session?.name ?? (otherDay && exercises.length === 0 ? t("weekRest") : t("title"))}
      />
      {otherDay && (
        // Doing it today instead: the two days trade places, food included.
        <Card className="space-y-3">
          <p className="text-[14px] leading-[1.45] text-[var(--ink2)]">
            {t("swapHint", { day: tDays(String(day)) })}
          </p>
          <form action={swapWithToday}>
            <input type="hidden" name="day" value={day} />
            <button
              type="submit"
              className="cta flex h-[52px] w-full items-center justify-center rounded-rp text-[15px] font-semibold text-[var(--on-accent)]"
            >
              {t("swapWithToday")}
            </button>
          </form>
          <Link href="/seance" className="block text-[13px] font-semibold text-[var(--accent)]">
            {t("backToToday")}
          </Link>
        </Card>
      )}
      {levers && exercises.length > 0 && <LeverLine levers={levers} kind="training" />}

      {exercises.length === 0 ? (
        <Card>
          <CardTitle>{otherDay ? t("noSessionThatDay") : t("noSession")}</CardTitle>
        </Card>
      ) : (
        <TrainLog
          // A different session is a different log: start it clean.
          key={day}
          clientId={client.id}
          exercises={exercises}
          onServer={onServer}
          canReportPain={client.health_consent_at !== null}
          last={last}
        />
      )}

      {/* The week as it stands, and the way to another day's session. */}
      {week && (
        <Card className="space-y-3">
          <Kicker icon="calendar">{t("myWeek")}</Kicker>
          <ul className="flex flex-col gap-1.5">
            {[0, 1, 2, 3, 4, 5, 6].map((index) => {
              const planned = week.sessions.find((s) => s.day_index === plan[index]);
              const has = planned && planned.session_exercises.length > 0;
              const done = has
                ? planned.session_exercises.filter((e) => logs.some((l) => l.session_exercise_id === e.id)).length
                : 0;
              const state = !has
                ? null
                : done === 0
                  ? t("weekTodo")
                  : done === planned.session_exercises.length
                    ? t("weekDone")
                    : t("weekPartial", { done, total: planned.session_exercises.length });
              const row = (
                <>
                  <span className="w-12 shrink-0 text-[12px] uppercase tracking-[.1em] text-[var(--ink2)]">
                    {tDays(String(index)).slice(0, 3)}
                  </span>
                  <span className={`min-w-0 flex-1 truncate text-[14px] ${has ? "font-semibold" : "text-[var(--ink3)]"}`}>
                    {has ? (planned.name ?? t("title")) : t("weekRest")}
                  </span>
                  {plan[index] !== index && (
                    <span aria-hidden className="shrink-0 text-[13px] text-[var(--ink3)]">
                      ↕
                    </span>
                  )}
                  {index === weekday && (
                    <span className="shrink-0 text-[11px] font-bold uppercase tracking-[.1em] text-[var(--accent)]">
                      {t("weekToday")}
                    </span>
                  )}
                  {state && (
                    <span
                      className={`tnum shrink-0 text-[12px] ${done > 0 ? "font-bold text-[var(--a1)]" : "text-[var(--ink3)]"}`}
                    >
                      {state}
                    </span>
                  )}
                </>
              );
              const rowClass = `flex h-11 items-center gap-3 rounded-r1 px-3 ${
                index === day ? "sel border" : "bg-[var(--glass2)]"
              }`;
              return (
                // A rest day opens too: it can trade places with today.
                <li key={index}>
                  <Link href={index === weekday ? "/seance" : `/seance?jour=${index}`} className={rowClass}>
                    {row}
                  </Link>
                </li>
              );
            })}
          </ul>
          {isMoved(plan) && (
            <form action={resetWeek} className="flex items-center justify-between gap-3">
              <p className="text-[13px] text-[var(--ink2)]">{tWeek("moved")}</p>
              <button type="submit" className="min-h-11 shrink-0 text-[13px] font-semibold text-[var(--accent)]">
                {tWeek("reset")}
              </button>
            </form>
          )}
          <p className="text-[12.5px] leading-[1.45] text-[var(--ink3)]">{t("myWeekHint")}</p>
        </Card>
      )}

      <ExportCard initial="programme" />
    </>
  );
}
