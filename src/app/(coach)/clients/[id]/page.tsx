import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { loadClientDetail, formatHours } from "@/lib/clientDetail";
import { MetricCard } from "@/components/MetricCard";
import { CheckInPanel } from "@/components/CheckInPanel";
import { RecordPanel } from "@/components/RecordPanel";
import { ClientTabs } from "@/components/ClientTabs";
import { isClientTab, type ClientTab } from "@/lib/clientTabs";
import type { CheckInRow } from "@/lib/supabase/types";
import type { PhotoView } from "@/components/CheckInPhotos";

function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

const panel = "glass rounded-r3 p-4";
const heading =
  "text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { id } = await params;
  const { onglet } = await searchParams;
  const supabase = await createClient();
  const detail = await loadClientDetail(supabase, id);
  if (!detail) notFound();

  const t = await getTranslations("detail");
  const tProse = await getTranslations("prose");
  const tDays = await getTranslations("days");
  const tGoal = await getTranslations("goal");
  const tPhase = await getTranslations("phase");
  const tHistory = await getTranslations("history");
  const tCycle = await getTranslations("cycleTab");
  const tSteps = await getTranslations("stepsTab");
  const tNutrition = await getTranslations("nutritionTab");

  const { client, sleep } = detail;

  let tab: ClientTab = isClientTab(onglet) ? onglet : "overview";
  // Cycle is absent, not disabled: a hand-typed URL must not reach it either.
  if (tab === "cycle" && !client.cycle_tracking) tab = "overview";

  const meta = [
    client.goal && tGoal(client.goal),
    detail.blockLabel && detail.weekNumber
      ? `${detail.blockLabel} · sem. ${detail.weekNumber}`
      : detail.blockLabel,
    detail.phase && tPhase(detail.phase),
  ].filter(Boolean);

  const avgLabel = formatHours(sleep.avg);
  const targetLabel = formatHours(sleep.target);

  return (
    <div className="space-y-4 p-5">
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-[var(--onA)]"
          style={{ background: "linear-gradient(140deg, var(--a1), var(--a2))" }}
        >
          {initialsOf(client.name)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-[22px] font-extrabold leading-tight tracking-[-.04em]">
            {client.name}
          </h2>
          {meta.length > 0 && (
            <p className="truncate text-[11px] text-[var(--ink2)]">
              {meta.join(" · ")}
            </p>
          )}
        </div>
      </header>

      <ClientTabs
        clientId={id}
        current={tab}
        cycleTracking={client.cycle_tracking}
      />

      {tab === "overview" && (
        <OverviewTab
          detail={detail}
          avgLabel={avgLabel}
          targetLabel={targetLabel}
          t={t}
          tProse={tProse}
          tDays={tDays}
        />
      )}

      {tab === "history" && <HistoryTab clientId={id} tHistory={tHistory} />}

      {tab === "checkins" && <CheckInsTab clientId={id} />}

      {tab === "nutrition" && (
        <NutritionTab clientId={id} tNutrition={tNutrition} />
      )}

      {tab === "cycle" && (
        <section className={panel}>
          <h3 className={heading}>{tCycle("phase")}</h3>
          {detail.phase == null ? (
            <p className="mt-3 text-[12px] text-[var(--ink2)]">
              {tCycle("noData")}
            </p>
          ) : (
            <div className="mt-3 flex gap-3">
              <MetricCard
                label={tCycle("phase")}
                value={tPhase(detail.phase)}
                sub={null}
                wash="wash-2"
              />
              <MetricCard
                label={tCycle("intensity")}
                value={`${Math.round((detail.intensityCoefficient ?? 1) * 100)}%`}
                sub={null}
                wash="wash-1"
              />
              <MetricCard
                label={tCycle("volume")}
                value={`${Math.round((detail.volumeCoefficient ?? 1) * 100)}%`}
                sub={null}
                wash="wash-1"
              />
            </div>
          )}
          {/* Stated plainly, because the database is what keeps it. */}
          <p className="mt-4 text-[11px] leading-relaxed text-[var(--ink2)]">
            {tCycle("promise")}
          </p>
        </section>
      )}

      {tab === "steps" && <StepsTab clientId={id} tSteps={tSteps} />}

      {tab === "file" && (
        <RecordPanel client={client} sleepTargetLabel={targetLabel} />
      )}
    </div>
  );
}

/* ---------- tabs ---------- */

type Translate = (key: string, values?: Record<string, string | number>) => string;

function OverviewTab({
  detail,
  avgLabel,
  targetLabel,
  t,
  tProse,
  tDays,
}: {
  detail: Awaited<ReturnType<typeof loadClientDetail>> & object;
  avgLabel: string | null;
  targetLabel: string | null;
  t: Translate;
  tProse: Translate;
  tDays: Translate;
}) {
  const { sleep, steps, adherence, sessionsThisWeek, week } = detail;

  // Every sentence computes from the rows the element beside it reads.
  let prose: string | null = null;
  if (avgLabel) {
    prose =
      targetLabel != null
        ? tProse("sleep", {
            under: sleep.nightsUnderTarget,
            target: targetLabel,
            avg: avgLabel,
          })
        : tProse("sleepNoTarget", {
            avg: avgLabel,
            nights: sleep.nights.filter((n) => n.hours != null).length,
          });

    if (detail.volumeCoefficient != null && detail.volumeCoefficient < 1) {
      prose += tProse("lutealTrim", {
        pct: Math.round((1 - detail.volumeCoefficient) * 100),
      });
    } else if (detail.intensityCoefficient != null && detail.intensityCoefficient > 1) {
      prose += tProse("intensityLift", {
        pct: Math.round((detail.intensityCoefficient - 1) * 100),
      });
    } else if (detail.intensityCoefficient != null && detail.intensityCoefficient < 1) {
      prose += tProse("intensityDrop", {
        pct: Math.round((1 - detail.intensityCoefficient) * 100),
      });
    }
  }

  const statusTone: Record<string, string> = {
    logged: "text-[var(--accent-soft)]",
    "in-progress": "text-[var(--a2)]",
    scheduled: "text-[var(--ink3)]",
    rest: "text-[var(--ink3)]",
  };

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <MetricCard
          label={t("adherence")}
          value={adherence.pct == null ? "—" : `${adherence.pct}%`}
          sub={adherence.expected === 0 ? null : t("adherenceSub")}
          wash="wash-1"
        />
        <MetricCard
          label={t("sessions")}
          value={`${sessionsThisWeek.done} / ${sessionsThisWeek.total}`}
          sub={t("sessionsSub")}
          wash="wash-2"
        />
        <MetricCard
          label={t("sleep")}
          value={avgLabel ?? "—"}
          sub={targetLabel && t("sleepSub", { target: targetLabel })}
          wash="wash-3"
        />
        <MetricCard
          label={t("steps")}
          value={steps.latest == null ? "—" : steps.latest.toLocaleString("fr-FR")}
          sub={
            steps.avg == null
              ? null
              : t("stepsSub", { avg: steps.avg.toLocaleString("fr-FR") })
          }
          wash="wash-1"
        />
      </div>

      <section className={panel}>
        <h3 className={heading}>{t("sleepSeven")}</h3>
        <div className="mt-3 flex gap-2">
          {sleep.nights.map((night) => (
            <div
              key={night.dayIndex}
              className="flex min-w-0 flex-1 flex-col items-center rounded-r2 border border-[var(--hair)] px-1 py-2"
            >
              <span className="truncate text-[10px] text-[var(--ink3)]">
                {tDays(String(night.dayIndex)).slice(0, 3)}
              </span>
              <span className="tnum mt-1 text-[12px] font-bold">
                {formatHours(night.hours) ?? "—"}
              </span>
            </div>
          ))}
        </div>
        <p className="tnum mt-3 text-[11px] leading-relaxed text-[var(--ink2)]">
          {prose ?? t("noSleep")}
        </p>
      </section>

      <section className={panel}>
        <div className="flex items-center justify-between">
          <h3 className={heading}>{t("thisWeek")}</h3>
          {detail.blockLabel && (
            <span className="truncate text-[11px] text-[var(--ink3)]">
              {detail.blockLabel}
            </span>
          )}
        </div>

        {detail.blockLabel == null ? (
          <p className="mt-3 text-[11px] text-[var(--ink2)]">{t("noWeek")}</p>
        ) : (
          <ul className="mt-3">
            {week.map((day) => (
              <li
                key={day.dayIndex}
                className="flex items-center gap-3 border-b border-[var(--hair)] px-1 last:border-0"
                style={{ height: "36px" }}
              >
                <span className="w-10 shrink-0 text-[11px] text-[var(--ink3)]">
                  {tDays(String(day.dayIndex)).slice(0, 3)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                  {day.sessionName ?? t("rest")}
                </span>
                {day.status !== "rest" && (
                  <span className={`shrink-0 text-[10px] ${statusTone[day.status]}`}>
                    {t(day.status === "in-progress" ? "inProgress" : day.status)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

async function HistoryTab({
  clientId,
  tHistory,
}: {
  clientId: string;
  tHistory: Translate;
}) {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("set_logs")
    .select("id, reps, weight_kg, rpe, logged_at, session_exercises(name)")
    .eq("client_id", clientId)
    .order("logged_at", { ascending: false })
    .limit(600);

  const rows = (logs ?? []) as unknown as {
    id: string;
    reps: number | null;
    weight_kg: number | null;
    logged_at: string;
    session_exercises: { name: string } | null;
  }[];

  if (rows.length === 0) {
    return (
      <section className={panel}>
        <p className="text-[12px] text-[var(--ink2)]">{tHistory("none")}</p>
      </section>
    );
  }

  /** Monday of the week a set was logged in, so weeks line up across exercises. */
  function weekOf(iso: string): string {
    const d = new Date(iso);
    const monday = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    return monday.toISOString().slice(0, 10);
  }

  type WeekStat = { week: string; sets: number; best: number; volume: number };

  const byExercise = new Map<string, Map<string, WeekStat>>();

  for (const row of rows) {
    const name = row.session_exercises?.name ?? "—";
    const week = weekOf(row.logged_at);
    const weeks = byExercise.get(name) ?? new Map<string, WeekStat>();
    const stat = weeks.get(week) ?? { week, sets: 0, best: 0, volume: 0 };

    const weight = Number(row.weight_kg ?? 0);
    const reps = Number(row.reps ?? 0);

    stat.sets += 1;
    stat.best = Math.max(stat.best, weight);
    stat.volume += weight * reps;

    weeks.set(week, stat);
    byExercise.set(name, weeks);
  }

  return (
    <section className={panel}>
      <h3 className={heading}>{tHistory("title")}</h3>

      <ul className="mt-3 space-y-3">
        {[...byExercise.entries()].map(([name, weeks]) => {
          // Newest first, so the change reads against the week before it.
          const ordered = [...weeks.values()].sort((a, b) =>
            b.week.localeCompare(a.week),
          );

          return (
            <li key={name} className="rounded-r2 border border-[var(--hair)] p-3">
              <p className="text-[12px] font-bold">{name}</p>

              <table className="mt-2 w-full text-left text-[11px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-[var(--ink3)]">
                    <th className="pb-1 font-semibold">{tHistory("week")}</th>
                    <th className="pb-1 text-right font-semibold">
                      {tHistory("sets", { count: 0 }).replace(/^\d+\s*/, "")}
                    </th>
                    <th className="pb-1 text-right font-semibold">
                      {tHistory("last")}
                    </th>
                    <th className="pb-1 text-right font-semibold">
                      {tHistory("volume")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ordered.slice(0, 8).map((stat, index) => {
                    const previous = ordered[index + 1];
                    const change =
                      previous && previous.volume > 0
                        ? Math.round(
                            ((stat.volume - previous.volume) / previous.volume) * 100,
                          )
                        : null;

                    return (
                      <tr key={stat.week} className="border-t border-[var(--hair)]">
                        <td className="tnum py-1">{stat.week}</td>
                        <td className="tnum py-1 text-right">{stat.sets}</td>
                        <td className="tnum py-1 text-right">
                          {stat.best > 0 ? `${stat.best} kg` : "—"}
                        </td>
                        <td className="tnum py-1 text-right">
                          {Math.round(stat.volume).toLocaleString("fr-FR")} kg
                          {change !== null && change !== 0 && (
                            <span
                              className={`ml-1 font-semibold ${
                                change > 0
                                  ? "text-[var(--accent-soft)]"
                                  : "text-[var(--a3)]"
                              }`}
                            >
                              {change > 0 ? "+" : ""}
                              {change}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {ordered.length < 2 && (
                <p className="mt-1 text-[10px] text-[var(--ink3)]">
                  {tHistory("noCompare")}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

async function CheckInsTab({ clientId }: { clientId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("check_ins")
    .select("*")
    .eq("client_id", clientId)
    .order("week_start_date", { ascending: false })
    .limit(12);

  const checkIns = (data ?? []) as CheckInRow[];

  const { data: photos } = await supabase
    .from("check_in_photos")
    .select("id, check_in_id, storage_path")
    .eq("client_id", clientId)
    .order("uploaded_at");

  // The bucket is private, so each file is served through a short-lived signed
  // URL rather than a public path.
  const paths = (photos ?? []).map((p) => p.storage_path);
  const signed =
    paths.length === 0
      ? []
      : ((
          await supabase.storage
            .from("check-in-photos")
            .createSignedUrls(paths, 3600)
        ).data ?? []);

  const urlByPath = new Map(
    signed.map((entry) => [entry.path ?? "", entry.signedUrl ?? null]),
  );

  const photosByCheckIn: Record<string, PhotoView[]> = {};
  for (const photo of photos ?? []) {
    const list = photosByCheckIn[photo.check_in_id] ?? [];
    list.push({ id: photo.id, url: urlByPath.get(photo.storage_path) ?? null });
    photosByCheckIn[photo.check_in_id] = list;
  }

  return (
    <CheckInPanel
      clientId={clientId}
      checkIns={checkIns}
      photosByCheckIn={photosByCheckIn}
    />
  );
}

async function NutritionTab({
  clientId,
  tNutrition,
}: {
  clientId: string;
  tNutrition: Translate;
}) {
  const supabase = await createClient();
  const { data: meals } = await supabase
    .from("meals")
    .select("id, day, name, quantity_g, kcal, protein_g, carbs_g, fat_g")
    .eq("client_id", clientId)
    .order("day", { ascending: false })
    .limit(80);

  const rows = meals ?? [];
  if (rows.length === 0) {
    return (
      <section className={panel}>
        <p className="text-[12px] text-[var(--ink2)]">{tNutrition("none")}</p>
      </section>
    );
  }

  const byDay = new Map<string, typeof rows>();
  for (const meal of rows) {
    byDay.set(meal.day, [...(byDay.get(meal.day) ?? []), meal]);
  }

  return (
    <section className={panel}>
      <ul className="space-y-3">
        {[...byDay.entries()].map(([day, meals]) => {
          const total = meals.reduce(
            (acc, m) => ({
              kcal: acc.kcal + Number(m.kcal ?? 0),
              p: acc.p + Number(m.protein_g ?? 0),
              c: acc.c + Number(m.carbs_g ?? 0),
              f: acc.f + Number(m.fat_g ?? 0),
            }),
            { kcal: 0, p: 0, c: 0, f: 0 },
          );
          return (
            <li key={day} className="rounded-r2 border border-[var(--hair)] p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="tnum text-[12px] font-bold">{day}</span>
                <span className="tnum text-[11px] text-[var(--ink3)]">
                  {Math.round(total.kcal)} {tNutrition("kcal")} · {Math.round(total.p)} /{" "}
                  {Math.round(total.c)} / {Math.round(total.f)}
                </span>
              </div>
              <ul className="mt-2">
                {meals.map((meal) => (
                  <li
                    key={meal.id}
                    className="flex items-center gap-3 border-b border-[var(--hair)] py-1 text-[11px] last:border-0"
                  >
                    <span className="min-w-0 flex-1 truncate">{meal.name}</span>
                    <span className="tnum shrink-0 text-[var(--ink3)]">
                      {meal.quantity_g ? `${meal.quantity_g} g` : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

async function StepsTab({
  clientId,
  tSteps,
}: {
  clientId: string;
  tSteps: Translate;
}) {
  const supabase = await createClient();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 27);

  const { data: metrics } = await supabase
    .from("daily_metrics")
    .select("day, sleep_h, sleep_quality, steps")
    .eq("client_id", clientId)
    .gte("day", since.toISOString().slice(0, 10))
    .order("day", { ascending: false });

  const rows = metrics ?? [];
  if (rows.length === 0) {
    return (
      <section className={panel}>
        <p className="text-[12px] text-[var(--ink2)]">{tSteps("none")}</p>
      </section>
    );
  }

  const slept = rows.filter((r) => r.sleep_h != null).map((r) => Number(r.sleep_h));
  const stepped = rows.filter((r) => r.steps != null).map((r) => Number(r.steps));

  return (
    <section className={panel}>
      <div className="flex flex-wrap gap-3">
        <MetricCard
          label={tSteps("avgSleep")}
          value={
            slept.length === 0
              ? "—"
              : (formatHours(slept.reduce((a, b) => a + b, 0) / slept.length) ?? "—")
          }
          sub={null}
          wash="wash-3"
        />
        <MetricCard
          label={tSteps("avgSteps")}
          value={
            stepped.length === 0
              ? "—"
              : Math.round(
                  stepped.reduce((a, b) => a + b, 0) / stepped.length,
                ).toLocaleString("fr-FR")
          }
          sub={null}
          wash="wash-1"
        />
      </div>

      <ul className="mt-3">
        {rows.map((row) => (
          <li
            key={row.day}
            className="tnum flex items-center gap-3 border-b border-[var(--hair)] py-2 text-[11px] last:border-0"
          >
            <span className="w-24 shrink-0 text-[var(--ink3)]">{row.day}</span>
            <span className="w-20 shrink-0">{formatHours(Number(row.sleep_h)) ?? "—"}</span>
            <span className="w-16 shrink-0 text-[var(--ink3)]">
              {row.sleep_quality ?? "—"}
            </span>
            <span className="min-w-0 flex-1">
              {row.steps == null ? "—" : row.steps.toLocaleString("fr-FR")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
