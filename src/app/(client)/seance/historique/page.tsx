import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { clientSession, weekPlan } from "@/lib/clientData";
import { weekdayFor } from "@/lib/dayMoves";
import { Card, Kicker, ScreenHeader } from "@/components/client/ui";

const WEEKS = 8;

type Exercise = { id: string; position: number; name: string };
type Session = { day_index: number; name: string | null; kind: string; session_exercises: Exercise[] };
type SetRow = { session_exercise_id: string; set_index: number; reps: number | null; weight_kg: number | null; done_as: string | null };

/**
 * Mes séances passées (1 Oct 2026): the last weeks the client was sent,
 * newest first — each session done, its movements and the sets logged on
 * them, as written. A session not logged is said plainly, never judged.
 */
export default async function SessionHistoryPage() {
  const { supabase, client, today } = await clientSession();
  const t = await getTranslations("sessionHistory");
  const tDays = await getTranslations("days");
  const locale = (await getLocale()) === "en" ? "en-GB" : "fr-FR";
  const fig = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 2, useGrouping: false });

  const [{ data: assignments }, plan] = await Promise.all([
    supabase
      .from("assignments")
      .select("start_date, programme_weeks(week_number, programmes(name), sessions(day_index, name, kind, session_exercises(id, position, name)))")
      .eq("client_id", client.id)
      .not("pushed_at", "is", null)
      .lte("start_date", today)
      .order("start_date", { ascending: false })
      .limit(WEEKS),
    weekPlan(),
  ]);

  const weeks = (assignments ?? []).map((row) => {
    const week = row.programme_weeks as unknown as {
      week_number: number;
      programmes: { name: string } | null;
      sessions: Session[];
    } | null;
    return { start: row.start_date, number: week?.week_number ?? null, programme: week?.programmes?.name ?? null, sessions: week?.sessions ?? [] };
  });
  const ids = weeks.flatMap((w) => w.sessions.flatMap((s) => s.session_exercises.map((e) => e.id)));
  const { data: sets } = ids.length
    ? await supabase
        .from("set_logs")
        .select("session_exercise_id, set_index, reps, weight_kg, done_as")
        .eq("client_id", client.id)
        .in("session_exercise_id", ids)
    : { data: [] as SetRow[] };
  const setsOf = (id: string) =>
    ((sets ?? []) as SetRow[]).filter((s) => s.session_exercise_id === id).sort((a, b) => a.set_index - b.set_index);

  /** "3 × 8 · 82,5 kg" when alike, "8 × 82,5 · 8 × 80 · 6 × 80" otherwise. */
  const line = (rows: SetRow[]) => {
    const one = (s: SetRow) => [s.reps ?? "—", s.weight_kg != null && Number(s.weight_kg) > 0 ? `${fig(Number(s.weight_kg))} kg` : null].filter(Boolean).join(" × ");
    const alike = rows.every((s) => s.reps === rows[0].reps && Number(s.weight_kg) === Number(rows[0].weight_kg));
    return alike
      ? [`${rows.length} × ${rows[0].reps ?? "—"}`, rows[0].weight_kg != null && Number(rows[0].weight_kg) > 0 ? `${fig(Number(rows[0].weight_kg))} kg` : null].filter(Boolean).join(" · ")
      : rows.map(one).join(" · ");
  };
  const dayLabel = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "long" });

  return (
    <>
      <ScreenHeader kicker={t("kicker", { count: weeks.length })} title={t("title")} />

      {weeks.length === 0 && (
        <Card className="space-y-2">
          <Kicker icon="programmes">{t("emptyTitle")}</Kicker>
          <p className="text-[14px] leading-[1.5] text-[var(--ink2)]">{t("emptyHint")}</p>
        </Card>
      )}

      {weeks.map((week, index) => {
        const training = week.sessions
          .filter((s) => s.kind !== "rest" && s.session_exercises.length > 0)
          // The running week as the client arranged it; past weeks as planned.
          .map((s) => ({ ...s, weekday: index === 0 ? weekdayFor(plan, s.day_index) : s.day_index }))
          .sort((a, b) => a.weekday - b.weekday);
        const done = training.filter((s) => s.session_exercises.some((e) => setsOf(e.id).length > 0)).length;
        return (
          <Card key={week.start} className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <Kicker icon="calendar">
                {index === 0 ? t("thisWeek") : t("weekOf", { date: dayLabel(week.start) })}
              </Kicker>
              <span className="tnum shrink-0 text-[12.5px] font-bold text-[var(--a1)]">
                {t("done", { done, total: training.length })}
              </span>
            </div>
            {week.number != null && (
              <p className="text-[12.5px] text-[var(--ink3)]">
                {[week.programme, t("weekNumber", { n: week.number })].filter(Boolean).join(" · ")}
              </p>
            )}
            <ul className="flex flex-col gap-1.5">
              {training.map((session) => {
                const logged = session.session_exercises
                  .slice()
                  .sort((a, b) => a.position - b.position)
                  .map((e) => ({ e, rows: setsOf(e.id) }));
                const any = logged.some((l) => l.rows.length > 0);
                return (
                  <li key={`${week.start}-${session.day_index}`}>
                    <details className="group rounded-r2 bg-[var(--glass2)]">
                      <summary className="flex h-12 cursor-pointer list-none items-center gap-3 px-3 [&::-webkit-details-marker]:hidden">
                        <span className="w-10 shrink-0 text-[12px] uppercase tracking-[.1em] text-[var(--ink2)]">
                          {tDays(String(session.weekday)).slice(0, 3)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{session.name ?? t("session")}</span>
                        <span className={`tnum shrink-0 text-[12px] ${any ? "font-bold text-[var(--a1)]" : "text-[var(--ink3)]"}`}>
                          {any
                            ? t("movements", { done: logged.filter((l) => l.rows.length > 0).length, total: logged.length })
                            : t("notLogged")}
                        </span>
                        <span aria-hidden className="text-[var(--ink3)] transition-transform group-open:rotate-90">›</span>
                      </summary>
                      <ul className="space-y-2 px-3 pb-3 pt-1">
                        {logged.map(({ e, rows }) => {
                          const as = rows.find((r) => r.done_as)?.done_as ?? null;
                          return (
                            <li key={e.id} className="border-t border-[var(--hair)] pt-2 first:border-0 first:pt-0">
                              {/* Movement names stay as the coach wrote them. */}
                              <span className="block text-[13.5px] font-semibold">{as ?? e.name}</span>
                              {as && <span className="block text-[11.5px] text-[var(--accent)]">{t("insteadOf", { name: e.name })}</span>}
                              <span className="tnum block text-[13px] text-[var(--ink2)]">{rows.length ? line(rows) : t("noSets")}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}

      <Link href="/seance" className="block text-center text-[13px] font-semibold text-[var(--accent)]">
        {t("back")}
      </Link>
    </>
  );
}
