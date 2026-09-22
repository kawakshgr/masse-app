import Link from "next/link";
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
import { CheckInReview, type ReviewWeek } from "@/components/CheckInReview";
import { BarChart } from "@/components/BarChart";
import { StrengthPanel } from "@/components/StrengthPanel";
import { loadHistory, type Range } from "@/lib/history";
import type { PhotoPose } from "@/lib/supabase/types";

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
  searchParams: Promise<{ onglet?: string; portee?: string }>;
}) {
  const { id } = await params;
  const { onglet, portee } = await searchParams;
  const supabase = await createClient();
  const detail = await loadClientDetail(supabase, id);
  if (!detail) notFound();

  const t = await getTranslations("detail");
  const tProse = await getTranslations("prose");
  const tDays = await getTranslations("days");
  const tGoal = await getTranslations("goal");
  const tPhase = await getTranslations("phase");
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

      {tab === "history" && (
        <HistoryTab
          clientId={id}
          range={portee === "6m" || portee === "1y" ? portee : "12w"}
        />
      )}

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
  range,
}: {
  clientId: string;
  range: Range;
}) {
  const supabase = await createClient();
  const t = await getTranslations("hist");
  const view = await loadHistory(supabase, clientId, range);

  const ranges: Range[] = ["12w", "6m", "1y"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
          {t("longView")}
        </span>
        <div className="flex gap-1">
          {ranges.map((r) => (
            <Link
              key={r}
              href={`/clients/${clientId}?onglet=history&portee=${r}`}
              aria-current={r === range ? "page" : undefined}
              className={`h-7 rounded-rp px-2.5 text-[11px] font-semibold leading-7 ${
                r === range
                  ? "sel text-[var(--ink)]"
                  : "border border-[var(--edge)] text-[var(--ink2)]"
              }`}
            >
              {t(r === "12w" ? "r12w" : r === "6m" ? "r6m" : "r1y")}
            </Link>
          ))}
        </div>
        <span className="ml-auto text-[10px] text-[var(--ink3)]">
          {t("clientSince", { date: view.since, weeks: view.weeksWithCoach })}
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        <MetricCard
          label={t("withYou")}
          value={`${view.weeksWithCoach} sem.`}
          sub={t("withYouSub", { date: view.since })}
          wash="wash-1"
        />
        <MetricCard
          label={t("logged")}
          value={`${view.sessionsLogged} / ${view.sessionsPrescribed}`}
          sub={t("loggedSub")}
          wash="wash-2"
        />
        <MetricCard
          label={t("adherence")}
          value={view.adherencePct == null ? "—" : `${view.adherencePct}%`}
          sub={t("adherenceSub")}
          wash="wash-1"
        />
        <MetricCard
          label={t("weight")}
          value={
            view.weightFrom == null || view.weightTo == null
              ? "—"
              : `${Math.round((view.weightTo - view.weightFrom) * 10) / 10} kg`
          }
          sub={
            view.weightFrom == null || view.weightTo == null
              ? null
              : t("weightSub", { from: view.weightFrom, to: view.weightTo })
          }
          wash="wash-3"
        />
      </div>

      <section className={panel}>
        <h3 className={heading}>{t("perWeek")}</h3>
        {view.weeks.length === 0 ? (
          <p className="mt-2 text-[11px] text-[var(--ink2)]">{t("perWeekNone")}</p>
        ) : (
          <>
            <div className="mt-3">
              <BarChart
                ariaLabel={t("perWeek")}
                bars={view.weeks.map((w) => ({
                  value: w.prescribed,
                  label: `${w.week} · ${w.logged}/${w.prescribed}`,
                  // Red marks a week where something prescribed went unlogged.
                  alert: w.logged < w.prescribed,
                }))}
              />
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-[var(--ink3)]">
              {t("perWeekNote", {
                logged: view.sessionsLogged,
                prescribed: view.sessionsPrescribed,
              })}
            </p>
          </>
        )}
      </section>

      <div className="flex flex-wrap gap-4">
        <div className="min-w-[280px] flex-1">
          <StrengthPanel strengthByExercise={view.strengthByExercise} />
        </div>

        <section className={`${panel} min-w-[260px] flex-1`}>
          <h3 className={heading}>{t("records")}</h3>
          {view.records.length === 0 ? (
            <p className="mt-2 text-[11px] text-[var(--ink2)]">{t("noRecords")}</p>
          ) : (
            <ul className="mt-2">
              {view.records.map((record, index) => (
                <li
                  key={`${record.exercise}-${record.on}-${index}`}
                  className="flex items-center gap-3 border-b border-[var(--hair)] py-2 last:border-0"
                >
                  <span aria-hidden className="text-[12px] text-[var(--accent)]">
                    ★
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold">
                      {record.exercise}
                    </span>
                    <span className="tnum block text-[10px] text-[var(--ink3)]">
                      {record.on}
                    </span>
                  </span>
                  <span className="tnum shrink-0 text-right text-[12px] font-semibold">
                    {record.weight} kg {t("reps")} {record.reps}
                    {record.gain !== null && record.gain > 0 && (
                      <span className="ml-1 text-[10px] font-normal text-[var(--accent-soft)]">
                        +{record.gain}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

async function CheckInsTab({ clientId }: { clientId: string }) {
  const supabase = await createClient();

  const [{ data: rows }, { data: client }] = await Promise.all([
    supabase
      .from("check_ins")
      .select("*")
      // Oldest first: week 1 is the baseline everything is measured against.
      .eq("client_id", clientId)
      .order("week_start_date", { ascending: true })
      .limit(52),
    supabase
      .from("clients")
      .select("first_name, name")
      .eq("id", clientId)
      .maybeSingle(),
  ]);

  const checkIns = (rows ?? []) as CheckInRow[];

  const { data: photos } = await supabase
    .from("check_in_photos")
    .select("id, check_in_id, storage_path, pose")
    .eq("client_id", clientId);

  // The bucket is private, so every file is served through a signed URL.
  const paths = (photos ?? []).map((p) => p.storage_path);
  const signed =
    paths.length === 0
      ? []
      : ((await supabase.storage.from("check-in-photos").createSignedUrls(paths, 3600))
          .data ?? []);

  const urlByPath = new Map(
    signed.map((entry) => [entry.path ?? "", entry.signedUrl ?? null]),
  );

  const photosByCheckIn = new Map<
    string,
    Partial<Record<PhotoPose, { id: string; url: string | null }>>
  >();

  for (const photo of photos ?? []) {
    const slot = photosByCheckIn.get(photo.check_in_id) ?? {};
    slot[photo.pose] = {
      id: photo.id,
      url: urlByPath.get(photo.storage_path) ?? null,
    };
    photosByCheckIn.set(photo.check_in_id, slot);
  }

  const weeks: ReviewWeek[] = checkIns.map((row, index) => ({
    id: row.id,
    weekStart: row.week_start_date,
    number: index + 1,
    bodyweight: row.bodyweight_kg == null ? null : Number(row.bodyweight_kg),
    feel: row.feel,
    pain: row.pain,
    adherence: row.adherence,
    note: row.note,
    waist: row.waist_cm == null ? null : Number(row.waist_cm),
    chest: row.chest_cm == null ? null : Number(row.chest_cm),
    hips: row.hips_cm == null ? null : Number(row.hips_cm),
    thigh: row.thigh_cm == null ? null : Number(row.thigh_cm),
    photos: photosByCheckIn.get(row.id) ?? {},
  }));

  const firstName =
    client?.first_name ?? client?.name?.split(/\s+/)[0] ?? "";

  return (
    <div className="space-y-4">
      <CheckInPanel clientId={clientId} current={checkIns.at(-1) ?? null} />
      <CheckInReview clientId={clientId} firstName={firstName} weeks={weeks} />
    </div>
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
