import { DEFAULT_DUE_OFFSET, checkInWindow, isFiled } from "@/lib/checkIns";
import { addDays, localDay, weekdayOf } from "@/lib/clientData";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { loadClientDetail, formatHours } from "@/lib/clientDetail";
import { MetricCard } from "@/components/MetricCard";
import { SECTION_TITLE, SectionTitle } from "@/components/Pane";
import { LinkSelect } from "@/components/LinkSelect";
import { CheckInNudge } from "@/components/CheckInNudge";
import { markCheckInReviewed } from "@/app/(coach)/clients/actions";
import { DayTypes } from "@/components/DayTypes";
import { RecordPanel } from "@/components/RecordPanel";
import { ClientTabs } from "@/components/ClientTabs";
import { isClientTab, type ClientTab } from "@/lib/clientTabs";
import type { CheckInRow } from "@/lib/supabase/types";
import { CheckInReview, type ReviewWeek } from "@/components/CheckInReview";
import { BarChart } from "@/components/BarChart";
import { StepTarget } from "@/components/StepTarget";
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

/** "22 sept. 2026" — never the raw ISO date. */
function shortDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function signedKg(delta: number): string {
  const figure = Math.abs(delta).toLocaleString("fr-FR");
  return `${delta > 0 ? "+" : delta < 0 ? "−" : "±"}${figure} kg`;
}

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

  const fileNote =
    (
      await supabase
        .from("client_file_notes")
        .select("note")
        .eq("client_id", id)
        .maybeSingle()
    ).data?.note ?? null;

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
      <header className="flex items-center gap-4">
        <span
          aria-hidden
          className="cta flex size-14 shrink-0 items-center justify-center rounded-r3 text-[18px] font-extrabold text-[var(--onA)]"
        >
          {initialsOf(client.name)}
        </span>
        <div className="min-w-0 flex-1">
          {meta.length > 0 && (
            <p className="truncate text-[11px] font-bold uppercase tracking-[.14em] text-[var(--accent)]">
              {meta.join(" · ")}
            </p>
          )}
          <h2 className="mt-1 truncate font-display text-[28px] font-extrabold uppercase leading-none tracking-[-.01em]">
            {client.name}
          </h2>
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
          fileNote={fileNote}
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
        <SectionTitle icon="sleep">{t("sleepSeven")}</SectionTitle>
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
        <SectionTitle
          icon="checkIns"
          aside={
            detail.blockLabel && (
              <span className="truncate text-[12px] text-[var(--ink3)]">{detail.blockLabel}</span>
            )
          }
        >
          {t("thisWeek")}
        </SectionTitle>

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
        <span className={SECTION_TITLE}>{t("longView")}</span>
        <LinkSelect
          label={t("longView")}
          value={range}
          options={ranges.map((r) => ({
            value: r,
            label: t(r === "12w" ? "r12w" : r === "6m" ? "r6m" : "r1y"),
            href: `/clients/${clientId}?onglet=history&portee=${r}`,
          }))}
        />
        <span className="ml-auto text-[11px] text-[var(--ink3)]">
          {t("clientSince", { date: shortDate(view.since), weeks: view.weeksWithCoach })}
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        <MetricCard
          label={t("withYou")}
          value={`${view.weeksWithCoach} sem.`}
          sub={t("withYouSub", { date: shortDate(view.since) })}
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
              : // A change, so it says so: "+0,5 kg", "−1 kg", "±0 kg".
                signedKg(Math.round((view.weightTo - view.weightFrom) * 10) / 10)
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
        <SectionTitle icon="chart">{t("perWeek")}</SectionTitle>
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
          <SectionTitle icon="trophy">{t("records")}</SectionTitle>
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
      .select("first_name, name, whatsapp, phone, timezone")
      .eq("id", clientId)
      .maybeSingle(),
  ]);

  const { data: reminders } = await supabase
    .from("check_in_reminders")
    .select("week_start_date, sent_at")
    .eq("client_id", clientId);

  // Her own rule for when a check-in is due, set in Admin.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: coachRow } = await supabase
    .from("coaches")
    .select("check_in_due_offset")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  const dueOffset = coachRow?.check_in_due_offset ?? DEFAULT_DUE_OFFSET;

  const { data: photos } = await supabase
    .from("check_in_photos")
    .select("id, check_in_id, storage_path, pose")
    .eq("client_id", clientId);

  // Rows she opened and left empty are not weeks: they would count as a
  // check-in and push the real baseline aside.
  const photoCount = new Map<string, number>();
  for (const photo of photos ?? []) {
    photoCount.set(photo.check_in_id, (photoCount.get(photo.check_in_id) ?? 0) + 1);
  }
  const checkIns = ((rows ?? []) as CheckInRow[]).filter((row) =>
    isFiled(row, photoCount.get(row.id) ?? 0),
  );

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
    byClient: row.author === "client",
  }));

  const firstName = client?.first_name ?? client?.name?.split(/\s+/)[0] ?? "";

  // The week asked of her today, by the same rule her app uses and the due day
  // this coach set in Admin.
  const today = localDay(client?.timezone || "Europe/Paris");
  const weekday = weekdayOf(today);
  const monday = addDays(today, -weekday);
  const filedWeek = (week: string) => checkIns.find((row) => row.week_start_date === week);
  const open = checkInWindow(monday, weekday, dueOffset);
  const { due, lastChance } = open;
  const openRow = filedWeek(open.weekStart) ?? null;
  const reminder = (reminders ?? []).find((row) => row.week_start_date === open.weekStart);
  const toRead = checkIns.filter((row) => row.reviewed_at === null).reverse();

  const tStatus = await getTranslations("coachCheckin");
  const day = (iso: string) =>
    new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
    });
  // "dimanche 28 septembre": a due day reads better with its weekday.
  const weekdayDay = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

  return (
    <div className="space-y-4">
      <section className={panel}>
        <SectionTitle icon="checkIns">{tStatus("title")}</SectionTitle>
        <p className="mt-1 text-[12px] leading-[1.5] text-[var(--ink2)]">{tStatus("readOnly")}</p>

        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[14px] font-semibold">
            {tStatus("week", { date: day(open.weekStart) })}
          </span>
          <span
            className={`text-[13px] ${
              openRow
                ? "text-[var(--accent-soft)]"
                : open.late
                  ? "text-[var(--a3)]"
                  : "text-[var(--ink2)]"
            }`}
          >
            {openRow
              ? tStatus("filed", { date: day(openRow.submitted_at) })
              : open.upcoming
                ? tStatus("upcoming", { day: weekdayDay(due) })
                : open.late
                ? tStatus("late", {
                    first: firstName,
                    due: weekdayDay(due),
                    lastChance: weekdayDay(lastChance),
                  })
                : tStatus("notFiled", { day: weekdayDay(due) })}
          </span>
        </div>

        {!openRow && !open.upcoming && (
          <>
            {reminder && (
              <p className="mt-2 text-[12px] text-[var(--ink3)]">
                {tStatus("reminded", { date: day(reminder.sent_at) })}
              </p>
            )}
            <CheckInNudge
              clientId={clientId}
              weekStart={open.weekStart}
              firstName={firstName}
              phone={client?.whatsapp || client?.phone || null}
            />
          </>
        )}

        {toRead.length > 0 && (
          <div className="mt-4 border-t border-[var(--hair)] pt-3">
            <h4 className={SECTION_TITLE}>{tStatus("toRead")}</h4>
            <ul className="mt-2">
              {toRead.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 border-b border-[var(--hair)] last:border-0"
                  style={{ height: "var(--row-h)" }}
                >
                  <span className="text-[13px]">{tStatus("week", { date: day(row.week_start_date) })}</span>
                  <form action={markCheckInReviewed}>
                    <input type="hidden" name="check_in_id" value={row.id} />
                    <input type="hidden" name="client_id" value={clientId} />
                    <button
                      type="submit"
                      className="glass2 h-8 rounded-r2 px-3 text-[12px] font-semibold text-[var(--ink)]"
                    >
                      {tStatus("markRead")}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <CheckInReview firstName={firstName} weeks={weeks} />
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
        <SectionTitle icon="foods">{tWeek("title")}</SectionTitle>
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
  const tDays = await getTranslations("days");
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 27);

  const [{ data: metrics }, { data: clientRow }] = await Promise.all([
    supabase
      .from("daily_metrics")
      .select("day, sleep_h, sleep_quality, steps")
      .eq("client_id", clientId)
      .gte("day", since.toISOString().slice(0, 10))
      .order("day", { ascending: false }),
    supabase
      .from("clients")
      .select("first_name, name, steps_target")
      .eq("id", clientId)
      .maybeSingle(),
  ]);

  const rows = metrics ?? [];

  const slept = rows
    .filter((r) => r.sleep_h != null)
    .map((r) => Number(r.sleep_h));
  const stepped = rows
    .filter((r) => r.steps != null)
    .map((r) => Number(r.steps));

  // This week, Monday to Sunday: the week a coach is looking at, not a
  // rolling window that starts on whatever day she opened the tab.
  const byDay = new Map(rows.map((row) => [row.day, row]));
  const today = new Date();
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));

  const days = [0, 1, 2, 3, 4, 5, 6].map((weekday) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + weekday);
    const steps = byDay.get(date.toISOString().slice(0, 10))?.steps;
    return {
      weekday,
      label: tDays(String(weekday)),
      steps: steps == null ? null : Number(steps),
    };
  });

  return (
    <div className="space-y-4">
      <StepTarget
        clientId={clientId}
        firstName={clientRow?.first_name ?? clientRow?.name ?? ""}
        days={days}
        target={clientRow?.steps_target ?? null}
      />

      {rows.length === 0 ? (
        <section className={panel}>
          <p className="text-[13px] text-[var(--ink2)]">{tSteps("none")}</p>
        </section>
      ) : (
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
      )}
    </div>
  );
}
