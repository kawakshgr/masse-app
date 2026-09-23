import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { loadClientDetail, formatHours } from "@/lib/clientDetail";
import { MetricCard } from "@/components/MetricCard";
import { CheckInPanel } from "@/components/CheckInPanel";
import { DayTypes } from "@/components/DayTypes";
import { RecordPanel } from "@/components/RecordPanel";
import { ClientTabs } from "@/components/ClientTabs";
import { isClientTab, type ClientTab } from "@/lib/clientTabs";
import type { CheckInRow } from "@/lib/supabase/types";
import { CheckInReview, type ReviewWeek } from "@/components/CheckInReview";
import { BarChart } from "@/components/BarChart";
import { StrengthPanel } from "@/components/StrengthPanel";
import { CyclePanel, type PhaseLevers } from "@/components/CyclePanel";
import {
  NutritionPlan,
  type PlanMeal,
  type Targets,
} from "@/components/NutritionPlan";
import { SupplementProtocol } from "@/components/SupplementProtocol";
import type { CyclePhase } from "@/lib/supabase/types";
import { loadHistory, type Range } from "@/lib/history";
import { dayLabel, euros } from "@/lib/billing";
import type { PhotoPose } from "@/lib/supabase/types";

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

const panel = "glass rounded-r3 p-4";
const heading = "text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string; portee?: string; jour?: string }>;
}) {
  const { id } = await params;
  const { onglet, portee, jour } = await searchParams;
  const supabase = await createClient();
  const detail = await loadClientDetail(supabase, id);
  if (!detail) notFound();

  const t = await getTranslations("detail");
  const tProse = await getTranslations("prose");
  const tDays = await getTranslations("days");
  const tGoal = await getTranslations("goal");
  const tPhase = await getTranslations("phase");
  const tSteps = await getTranslations("stepsTab");

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

  // What was agreed, read from the billing tab's own record rather than typed
  // a second time here.
  const tBilling = await getTranslations("billing");
  const { data: arrangement } = await supabase
    .from("billing_arrangements")
    .select("amount_cents, type, day_of_month, pack_sessions")
    .eq("client_id", id)
    .maybeSingle();
  const billingLine = arrangement
    ? arrangement.type === "monthly"
      ? `${euros(arrangement.amount_cents)} · ${tBilling("billedOn", {
          day: dayLabel(arrangement.day_of_month),
        })}`
      : `${euros(arrangement.amount_cents)} · ${tBilling("pack")} · ${
          arrangement.pack_sessions
        }`
    : null;

  return (
    <div className="space-y-4 p-5">
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold text-[var(--onA)]"
          style={{
            background: "linear-gradient(140deg, var(--a1), var(--a2))",
          }}
        >
          {initialsOf(client.name)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-[22px] font-extrabold leading-tight tracking-[-.03em]">
            {client.name}
          </h2>
          {meta.length > 0 && (
            <p className="truncate text-[12px] text-[var(--ink2)]">
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

      {tab === "nutrition" && <NutritionTab clientId={id} jour={jour} />}

      {tab === "cycle" && <CycleTab clientId={id} />}

      {tab === "steps" && <StepsTab clientId={id} tSteps={tSteps} />}

      {tab === "file" && (
        <RecordPanel
          client={client}
          sleepTargetLabel={targetLabel}
          billingLine={billingLine}
        />
      )}
    </div>
  );
}

/* ---------- tabs ---------- */

type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;

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
    } else if (
      detail.intensityCoefficient != null &&
      detail.intensityCoefficient > 1
    ) {
      prose += tProse("intensityLift", {
        pct: Math.round((detail.intensityCoefficient - 1) * 100),
      });
    } else if (
      detail.intensityCoefficient != null &&
      detail.intensityCoefficient < 1
    ) {
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
          kind="adherence"
          value={adherence.pct == null ? "—" : `${adherence.pct}%`}
          sub={adherence.expected === 0 ? null : t("adherenceSub")}
          wash="wash-1"
        />
        <MetricCard
          label={t("sessions")}
          kind="sessions"
          value={`${sessionsThisWeek.done} / ${sessionsThisWeek.total}`}
          sub={t("sessionsSub")}
          wash="wash-2"
        />
        <MetricCard
          label={t("sleep")}
          kind="sleep"
          value={avgLabel ?? "—"}
          sub={targetLabel && t("sleepSub", { target: targetLabel })}
          wash="wash-3"
        />
        <MetricCard
          label={t("steps")}
          kind="steps"
          value={
            steps.latest == null ? "—" : steps.latest.toLocaleString("fr-FR")
          }
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
              <span className="truncate text-[11px] text-[var(--ink3)]">
                {tDays(String(night.dayIndex)).slice(0, 3)}
              </span>
              <span className="tnum mt-1 text-[13px] font-semibold">
                {formatHours(night.hours) ?? "—"}
              </span>
            </div>
          ))}
        </div>
        <p className="tnum mt-3 text-[12px] leading-[1.5] text-[var(--ink2)]">
          {prose ?? t("noSleep")}
        </p>
      </section>

      <section className={panel}>
        <div className="flex items-center justify-between">
          <h3 className={heading}>{t("thisWeek")}</h3>
          {detail.blockLabel && (
            <span className="truncate text-[12px] text-[var(--ink3)]">
              {detail.blockLabel}
            </span>
          )}
        </div>

        {detail.blockLabel == null ? (
          <p className="mt-3 text-[12px] text-[var(--ink2)]">{t("noWeek")}</p>
        ) : (
          <ul className="mt-3">
            {week.map((day) => (
              <li
                key={day.dayIndex}
                className="flex items-center gap-3 border-b border-[var(--hair)] px-1 last:border-0"
                style={{ height: "36px" }}
              >
                <span className="w-10 shrink-0 text-[12px] text-[var(--ink3)]">
                  {tDays(String(day.dayIndex)).slice(0, 3)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                  {day.sessionName ?? t("rest")}
                </span>
                {day.status !== "rest" && (
                  <span
                    className={`shrink-0 text-[11px] ${statusTone[day.status]}`}
                  >
                    {t(
                      day.status === "in-progress" ? "inProgress" : day.status,
                    )}
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
        <span className="text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
          {t("longView")}
        </span>
        <div className="flex gap-1">
          {ranges.map((r) => (
            <Link
              key={r}
              href={`/clients/${clientId}?onglet=history&portee=${r}`}
              aria-current={r === range ? "page" : undefined}
              className={`h-7 rounded-rp px-2.5 text-[12px] font-semibold leading-7 ${
                r === range
                  ? "sel text-[var(--ink)]"
                  : "border border-[var(--edge)] bg-[var(--glass2)] text-[var(--ink2)]"
              }`}
            >
              {t(r === "12w" ? "r12w" : r === "6m" ? "r6m" : "r1y")}
            </Link>
          ))}
        </div>
        <span className="ml-auto text-[11px] text-[var(--ink3)]">
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
          kind="sessions"
          value={`${view.sessionsLogged} / ${view.sessionsPrescribed}`}
          sub={t("loggedSub")}
          wash="wash-2"
        />
        <MetricCard
          label={t("adherence")}
          kind="adherence"
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
          <p className="mt-2 text-[12px] text-[var(--ink2)]">
            {t("perWeekNone")}
          </p>
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
            <p className="mt-2 text-[11px] leading-[1.5] text-[var(--ink3)]">
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
            <p className="mt-2 text-[12px] text-[var(--ink2)]">
              {t("noRecords")}
            </p>
          ) : (
            <ul className="mt-2">
              {view.records.map((record, index) => (
                <li
                  key={`${record.exercise}-${record.on}-${index}`}
                  className="flex items-center gap-3 border-b border-[var(--hair)] py-2 last:border-0"
                >
                  <span
                    aria-hidden
                    className="text-[13px] text-[var(--accent)]"
                  >
                    ★
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">
                      {record.exercise}
                    </span>
                    <span className="tnum block text-[11px] text-[var(--ink2)]">
                      {record.on}
                    </span>
                  </span>
                  <span className="tnum shrink-0 text-right text-[13px] font-semibold">
                    {record.weight} kg {t("reps")} {record.reps}
                    {record.gain !== null && record.gain > 0 && (
                      <span className="ml-1 text-[11px] font-normal text-[var(--accent-soft)]">
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

async function CycleTab({ clientId }: { clientId: string }) {
  const supabase = await createClient();

  const [clientRes, stateRes, adjRes] = await Promise.all([
    supabase
      .from("clients")
      .select(
        "first_name, name, cycle_tracking, cycle_mode, cycle_phase_manual",
      )
      .eq("id", clientId)
      .maybeSingle(),
    supabase.rpc("client_cycle_state", { p_client: clientId }),
    supabase.from("cycle_adjustments").select("*").eq("client_id", clientId),
  ]);

  const client = clientRes.data;
  const state = (stateRes.data ?? [])[0] ?? null;
  const saved = new Map((adjRes.data ?? []).map((row) => [row.phase, row]));

  // Defaults come from the same functions the database falls back to, so an
  // unconfigured column shows what is actually being applied — not a zero.
  const PHASES: CyclePhase[] = [
    "menstrual",
    "follicular",
    "ovulatory",
    "luteal",
  ];
  const fallbackLoad: Record<CyclePhase, number> = {
    menstrual: -10,
    follicular: 0,
    ovulatory: 5,
    luteal: 0,
  };

  const levers = Object.fromEntries(
    PHASES.map((phase) => {
      const row = saved.get(phase);
      return [
        phase,
        {
          phase,
          loadPct: row?.load_pct ?? fallbackLoad[phase],
          rpeCap: row?.rpe_cap == null ? null : Number(row.rpe_cap),
          setsDelta: row?.sets_delta ?? (phase === "luteal" ? -1 : 0),
          kcalDelta: row?.kcal_delta ?? 0,
          carbsDelta: row?.carbs_g_delta ?? 0,
          configured: row != null,
        } satisfies PhaseLevers,
      ];
    }),
  ) as Record<CyclePhase, PhaseLevers>;

  return (
    <CyclePanel
      clientId={clientId}
      firstName={client?.first_name ?? client?.name?.split(/\s+/)[0] ?? ""}
      tracking={client?.cycle_tracking ?? false}
      mode={client?.cycle_mode ?? "log"}
      currentPhase={state?.phase ?? null}
      manualPhase={client?.cycle_phase_manual ?? null}
      levers={levers}
    />
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
      : ((
          await supabase.storage
            .from("check-in-photos")
            .createSignedUrls(paths, 3600)
        ).data ?? []);

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

  const firstName = client?.first_name ?? client?.name?.split(/\s+/)[0] ?? "";

  return (
    <div className="space-y-4">
      <CheckInPanel clientId={clientId} current={checkIns.at(-1) ?? null} />
      <CheckInReview clientId={clientId} firstName={firstName} weeks={weeks} />
    </div>
  );
}

async function NutritionTab({
  clientId,
  jour,
}: {
  clientId: string;
  /** The day type being edited, from the URL. Absent means the default. */
  jour?: string;
}) {
  const supabase = await createClient();
  const tWeek = await getTranslations("nutWeek");
  const tRead = await getTranslations("nutRead");
  const tDays = await getTranslations("days");

  const today = new Date();
  const weekStart = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  weekStart.setUTCDate(
    weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7),
  );
  const weekStartIso = weekStart.toISOString().slice(0, 10);
  const todayIso = today.toISOString().slice(0, 10);

  const [
    clientRes,
    targetsRes,
    mealsRes,
    foodsRes,
    loggedRes,
    typesRes,
    weekRes,
    protocolRes,
    suppRes,
    suppHiddenRes,
  ] = await Promise.all([
      supabase
        .from("clients")
        .select("first_name, name, nutrition_mode")
        .eq("id", clientId)
        .maybeSingle(),
      // Every target this client has: one per day type plus the default. The
      // panel picks the one being edited rather than the query doing it, so
      // switching types costs no round trip.
      supabase.from("nutrition_targets").select("*").eq("client_id", clientId),
      supabase
        .from("plan_meals")
        .select(
          "id, at_time, name, position, day_type_id, plan_meal_items(id, name, quantity_g, kcal, protein_g, carbs_g, fat_g, position)",
        )
        .eq("client_id", clientId)
        .order("at_time"),
      supabase
        .from("foods")
        .select("id, name, brand, category, serving_label, serving_g, kcal_100g")
        .order("name")
        .limit(500),
      supabase
        .from("meals")
        .select("id, day, name, kcal, food_id")
        .eq("client_id", clientId)
        .gte("day", weekStartIso)
        .order("day"),
      supabase
        .from("day_types")
        .select("id, name, is_rest, position")
        .eq("client_id", clientId)
        .order("position"),
      supabase
        .from("client_week_days")
        .select("day_index, day_type_id")
        .eq("client_id", clientId),
      supabase
        .from("client_supplements")
        .select(
          "id, name, supplement_id, dose, unit, timing, protein_g, carbs_g, fat_g, kcal, day_type_id, position",
        )
        .eq("client_id", clientId)
        .order("position"),
      // The library she picks from: built-ins plus her own, minus what she hid.
      supabase
        .from("supplements")
        .select(
          "id, name, dose_min, unit, timing, usable, protein_per_unit, carbs_per_unit, fat_per_unit",
        )
        .order("name"),
      supabase.from("supplement_hidden").select("supplement_id"),
    ]);

  // Which day type the panel is editing. Absent means the default.
  const dayTypeId = typeof jour === "string" && jour !== "" ? jour : null;
  const allTargets = targetsRes.data ?? [];
  const targetRow =
    allTargets.find((row) => row.day_type_id === dayTypeId) ??
    (dayTypeId === null
      ? undefined
      : allTargets.find((row) => row.day_type_id === null));

  const client = clientRes.data;
  const targets: Targets = {
    kcal: targetRow?.kcal ?? 2000,
    proteinG: targetRow?.protein_g ?? 0,
    carbsG: targetRow?.carbs_g ?? 0,
    fatG: targetRow?.fat_g ?? 0,
  };

  const hiddenSupp = new Set(
    (suppHiddenRes.data ?? []).map((row) => row.supplement_id),
  );

  const protocol = protocolRes.data ?? [];

  // Only this day type's supplements — plus the everyday ones — belong in this
  // day type's macros. The panel below still lists the whole protocol, so a
  // supplement pinned to OFF does not look deleted while she edits Upper.
  const applies = protocol.filter(
    (row) => row.day_type_id === null || row.day_type_id === dayTypeId,
  );

  const supplementMacros: Targets = applies.reduce(
    (acc, row) => ({
      kcal: acc.kcal + Number(row.kcal ?? 0),
      proteinG: acc.proteinG + Number(row.protein_g ?? 0),
      carbsG: acc.carbsG + Number(row.carbs_g ?? 0),
      fatG: acc.fatG + Number(row.fat_g ?? 0),
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );

  const meals: PlanMeal[] = (mealsRes.data ?? [])
    .filter((row) => (row.day_type_id ?? null) === dayTypeId)
    .map((row) => ({
    id: row.id,
    atTime: row.at_time,
    name: row.name,
    items: [
      ...((row.plan_meal_items as unknown as {
        id: string;
        name: string;
        quantity_g: number | null;
        kcal: number | null;
        protein_g: number | null;
        carbs_g: number | null;
        fat_g: number | null;
        position: number;
      }[]) ?? []),
    ]
      .sort((a, b) => a.position - b.position)
      .map((item) => ({
        id: item.id,
        name: item.name,
        quantityG: item.quantity_g,
        kcal: item.kcal,
        proteinG: item.protein_g,
        carbsG: item.carbs_g,
        fatG: item.fat_g,
      })),
  }));

  const logged = loggedRes.data ?? [];

  // Calories per day this week, summed from the very rows listed below.
  const byDay = new Map<string, number>();
  for (const meal of logged) {
    byDay.set(meal.day, (byDay.get(meal.day) ?? 0) + Number(meal.kcal ?? 0));
  }

  // 300 kcal is the tolerance the prototype reads "on target" against.
  const TOLERANCE = 300;

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const kcal = byDay.get(iso) ?? 0;
    return {
      iso,
      dayIndex: i,
      kcal,
      isToday: iso === todayIso,
      isFuture: iso > todayIso,
      near: Math.abs(kcal - targets.kcal) <= TOLERANCE,
    };
  });

  const todayKcal = byDay.get(todayIso) ?? 0;
  const firstName = client?.first_name ?? client?.name?.split(/\s+/)[0] ?? "";

  // The read computes from the same days the bars draw, so the sentence can
  // never contradict the chart. Today is reported, never judged.
  const closed = days.filter((d) => !d.isFuture && !d.isToday && d.kcal > 0);
  const short = closed.filter((d) => !d.near && d.kcal < targets.kcal);
  const over = closed.filter((d) => !d.near && d.kcal > targets.kcal);
  const dayName = (i: number) => tDays(String(i)).slice(0, 3);

  const now = tRead("today", {
    today: Math.round(todayKcal).toLocaleString("fr-FR"),
    target: targets.kcal.toLocaleString("fr-FR"),
  });

  let verdict: string;
  if (closed.length === 0) verdict = tRead("noFull");
  else if (short.length >= 2)
    verdict = tRead("shortMany", {
      count: short.length,
      days: short.map((d) => dayName(d.dayIndex)).join(", "),
      first: firstName,
    });
  else if (short.length === 1)
    verdict = tRead("shortOne", {
      day: dayName(short[0]!.dayIndex),
      gap: Math.round(targets.kcal - short[0]!.kcal).toLocaleString("fr-FR"),
    });
  else if (over.length > 0)
    verdict = tRead("over", {
      count: over.length,
      days: over.map((d) => dayName(d.dayIndex)).join(", "),
    });
  else verdict = tRead("allNear");

  return (
    <div className="space-y-4">
      <section className={panel}>
        <h3 className={heading}>{tWeek("title")}</h3>
        {logged.length === 0 ? (
          <p className="mt-2 text-[12px] text-[var(--ink2)]">{tWeek("none")}</p>
        ) : (
          <>
            <div className="mt-3">
              <BarChart
                ariaLabel={tWeek("title")}
                bars={days.map((d) => ({
                  value: d.kcal === 0 ? null : d.kcal,
                  label: `${tDays(String(d.dayIndex))} · ${Math.round(d.kcal)} kcal`,
                  tone: d.isFuture
                    ? "future"
                    : d.isToday
                      ? "today"
                      : d.near
                        ? "near"
                        : "off",
                }))}
              />
            </div>
            <p className="tnum mt-2 text-[11px] leading-[1.5] text-[var(--ink3)]">
              {`${now} ${verdict}`}
            </p>
          </>
        )}
      </section>

      <DayTypes
        clientId={clientId}
        firstName={firstName}
        selected={dayTypeId}
        types={(typesRes.data ?? []).map((type) => ({
          id: type.id,
          name: type.name,
          isRest: type.is_rest,
          kcal:
            allTargets.find((row) => row.day_type_id === type.id)?.kcal ?? null,
          meals: (mealsRes.data ?? []).filter(
            (row) => row.day_type_id === type.id,
          ).length,
        }))}
        week={[0, 1, 2, 3, 4, 5, 6].map(
          (day) =>
            (weekRes.data ?? []).find((row) => row.day_index === day)
              ?.day_type_id ?? null,
        )}
      />

      <NutritionPlan
        supplements={supplementMacros}
        clientId={clientId}
        dayTypeId={dayTypeId}
        firstName={firstName}
        mode={client?.nutrition_mode ?? "macros"}
        targets={targets}
        meals={meals}
        foods={foodsRes.data ?? []}
        foodAsks={[
          ...new Set(
            logged
              .filter((m) => m.food_id == null && m.name.trim() !== "")
              .map((m) => m.name.trim()),
          ),
        ]}
        offPlan={logged.map((m) => ({
          id: m.id,
          name: m.name,
          day: m.day,
          kcal: m.kcal == null ? null : Number(m.kcal),
        }))}
      />

      <SupplementProtocol
        clientId={clientId}
        firstName={firstName}
        dayTypeId={dayTypeId}
        dayTypes={(typesRes.data ?? []).map((type) => ({
          id: type.id,
          name: type.name,
        }))}
        rows={protocol.map((row) => ({
          id: row.id,
          name: row.name,
          dose: row.dose === null ? null : Number(row.dose),
          unit: row.unit,
          timing: row.timing,
          proteinG: row.protein_g === null ? null : Number(row.protein_g),
          kcal: row.kcal === null ? null : Number(row.kcal),
          dayTypeId: row.day_type_id,
          // The library knows this one's macros, but per its own unit, and she
          // asked for a different one — so they are not counted, and the row
          // names the unit that would have worked. Creatine carries no macros
          // at all, which is not the same thing and must not say so.
          knownPerUnit:
            (suppRes.data ?? []).find(
              (entry) =>
                entry.id === row.supplement_id &&
                entry.unit !== row.unit &&
                (entry.protein_per_unit !== null ||
                  entry.carbs_per_unit !== null ||
                  entry.fat_per_unit !== null),
            )?.unit ?? null,
        }))}
        library={(suppRes.data ?? [])
          .filter((row) => !hiddenSupp.has(row.id))
          .map((row) => ({
            id: row.id,
            name: row.name,
            doseMin: row.dose_min === null ? null : Number(row.dose_min),
            unit: row.unit,
            timing: row.timing,
            usable: row.usable,
          }))}
      />
    </div>
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
        <p className="text-[13px] text-[var(--ink2)]">{tSteps("none")}</p>
      </section>
    );
  }

  const slept = rows
    .filter((r) => r.sleep_h != null)
    .map((r) => Number(r.sleep_h));
  const stepped = rows
    .filter((r) => r.steps != null)
    .map((r) => Number(r.steps));

  return (
    <section className={panel}>
      <div className="flex flex-wrap gap-3">
        <MetricCard
          label={tSteps("avgSleep")}
          kind="sleep"
          value={
            slept.length === 0
              ? "—"
              : (formatHours(slept.reduce((a, b) => a + b, 0) / slept.length) ??
                "—")
          }
          sub={null}
          wash="wash-3"
        />
        <MetricCard
          label={tSteps("avgSteps")}
          kind="steps"
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
            className="tnum flex items-center gap-3 border-b border-[var(--hair)] py-2 text-[12px] last:border-0"
          >
            <span className="w-24 shrink-0 text-[var(--ink3)]">{row.day}</span>
            <span className="w-20 shrink-0">
              {formatHours(Number(row.sleep_h)) ?? "—"}
            </span>
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
