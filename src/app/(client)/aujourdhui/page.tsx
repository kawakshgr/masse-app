import Link from "next/link";
import { logoUrl } from "@/lib/logo";
import { getLocale, getTranslations } from "next-intl/server";
import { addDays, checkInState, clientSession, targetLine, todaySession, upcomingWeek } from "@/lib/clientData";
import { Card, CardTitle, CtaLink, Kicker, ScreenHeader } from "@/components/client/ui";
import { callLabel, callsShownFrom } from "@/lib/calls";
import { CallPicker } from "@/components/client/CallPicker";
import { EntryCard } from "@/components/client/EntryCard";
import { CheckInCard } from "@/components/client/CheckInCard";
import { InstallPrompt } from "@/components/client/InstallPrompt";
import { LeverLine } from "@/components/client/LeverLine";
import { Icon } from "@/components/Icon";

/**
 * Today — TodayView.swift. The week the coach pushed and the session standing
 * in it; then her sleep and steps; then the weekly check-in. A day with
 * nothing in it is a designed state: it says so.
 */
export default async function TodayPage() {
  const { supabase, client, today, monday } = await clientSession();
  const t = await getTranslations("today");
  // Her coach's logo, when there is one: the app wears the coach's colours,
  // not only Masse's.
  const [{ data: coach }, { data: call }] = await Promise.all([
    supabase.from("coaches").select("name, first_name, logo_path, call_link").eq("id", client.coach_id).maybeSingle(),
    // The video call booked at sign-up, while it is still to come.
    supabase
      .from("appointments")
      .select("id, starts_at, minutes")
      .is("cancelled_at", null)
      .gte("starts_at", callsShownFrom())
      .order("starts_at")
      .limit(1)
      .maybeSingle(),
  ]);
  const tCalls = await getTranslations("calls");
  const logo = logoUrl(coach?.logo_path);
  const tLog = await getTranslations("log");
  const tSettings = await getTranslations("settings");
  const tBilan = await getTranslations("bilan");
  const locale = (await getLocale()) === "en" ? "en-GB" : "fr-FR";
  const dayMonth = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "long" });
  // "dimanche 28 septembre": a due day reads better with its weekday.
  const weekdayDay = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

  const [{ week, session, levers }, metricsRes, checkIn, weighedRes] = await Promise.all([
    todaySession(),
    supabase
      .from("daily_metrics")
      .select("day, sleep_h, sleep_quality, steps")
      .gte("day", monday)
      .lte("day", addDays(monday, 6)),
    checkInState(),
    // Her weight across check-ins, for the line that opens Mon évolution.
    supabase
      .from("check_ins")
      .select("week_start_date, bodyweight_kg")
      .not("bodyweight_kg", "is", null)
      .order("week_start_date"),
  ]);

  // Nothing current: is a programme on its way?
  const upcoming = week ? null : await upcomingWeek();

  const metrics = metricsRes.data ?? [];
  const tEvolution = await getTranslations("evolution");
  const weighed = weighedRes.data ?? [];
  const weightChange =
    weighed.length > 1
      ? Math.round((Number(weighed.at(-1)!.bodyweight_kg) - Number(weighed[0].bodyweight_kg)) * 10) / 10
      : 0;
  const todayRow = metrics.find((row) => row.day === today) ?? null;
  // Monday to Sunday, the week she is in — the same seven her coach reads.
  const stepsWeek = Array.from(
    { length: 7 },
    (_, i) => metrics.find((row) => row.day === addDays(monday, i))?.steps ?? null,
  );

  const name = client.first_name ?? client.name;
  const weekLine = week
    ? [week.programmes?.name, `${t("week")} ${week.week_number}`].filter(Boolean).join(" · ")
    : null;

  return (
    <>
      {logo && (
        // eslint-disable-next-line @next/next/no-img-element -- a public storage URL, sized by its box
        <img src={logo} alt={t("coachLogo")} className="h-10 max-w-[160px] object-contain" />
      )}
      <ScreenHeader
        kicker={t("title")}
        title={name ? `${t("title")}, ${name}` : t("title")}
        sub={weekLine}
        aside={
          // Settings live on the first screen, top right, where a gear is
          // looked for — the same place as on the iPhone.
          <Link
            href="/reglages"
            aria-label={tSettings("open")}
            className="flex size-11 items-center justify-center rounded-rp bg-[var(--glass2)] text-[var(--ink2)]"
          >
            <Gear />
          </Link>
        }
      />

      {/* Only in a browser, never once installed. */}
      <InstallPrompt />

      {/* A call the coach offered, not booked yet: the client takes a slot. */}
      {!call && client.call_offer_minutes && (
        <Card className="space-y-3">
          <Kicker icon="video" accent>
            {tCalls("kicker", { length: tCalls("length", { minutes: client.call_offer_minutes }) })}
          </Kicker>
          <CardTitle>{tCalls("offerTitle", { coach: coach?.first_name ?? coach?.name ?? "" })}</CardTitle>
          <p className="text-[14px] leading-[1.45] text-[var(--ink2)]">{tCalls("offerBody")}</p>
          <CallPicker />
        </Card>
      )}

      {call && (
        <Card className="space-y-3">
          <Kicker icon="video" accent>
            {tCalls("kicker", { length: tCalls("length", { minutes: call.minutes }) })}
          </Kicker>
          <CardTitle>{tCalls("clientTitle", { coach: coach?.first_name ?? coach?.name ?? "" })}</CardTitle>
          <p className="text-[15px] font-semibold first-letter:uppercase">{callLabel(call.starts_at, locale)}</p>
          <p className="text-[13px] leading-[1.45] text-[var(--ink3)]">{tCalls("clientHint")}</p>
          <div className="flex gap-2">
            {coach?.call_link && (
              <a
                href={coach.call_link}
                target="_blank"
                rel="noopener noreferrer"
                className="cta flex h-11 flex-1 items-center justify-center rounded-rp text-[14px] font-semibold text-[var(--on-accent)]"
              >
                {tCalls("join")}
              </a>
            )}
            <a
              href={`/rendez-vous/${call.id}`}
              className="flex h-11 flex-1 items-center justify-center rounded-rp bg-[var(--glass2)] text-[14px] font-semibold text-[var(--ink)]"
            >
              {tCalls("addToCalendar")}
            </a>
          </div>
        </Card>
      )}

      {session && session.session_exercises.length > 0 ? (
        <div className="space-y-3.5">
          <Card className="space-y-3.5">
            {session.name && <CardTitle>{session.name}</CardTitle>}
            {levers && <LeverLine levers={levers} kind="training" />}
            {session.session_exercises.map((exercise) => {
              const target = targetLine(exercise, (time) => t("restTime", { time }), locale);
              return (
                <div key={exercise.id} className="space-y-0.5">
                  <p className="text-[15px] font-semibold">{exercise.name}</p>
                  {target && <p className="tnum text-[13px] text-[var(--ink2)]">{target}</p>}
                  {exercise.cue && (
                    <p className="text-[13px] leading-[1.45] text-[var(--ink3)]">{exercise.cue}</p>
                  )}
                </div>
              );
            })}
          </Card>
          {/* The whole point of the screen. */}
          <CtaLink href="/seance">{tLog("title")}</CtaLink>
        </div>
      ) : week ? (
        <Card>
          <CardTitle>{t("rest")}</CardTitle>
        </Card>
      ) : upcoming ? (
        <Card className="space-y-2">
          <Kicker icon="programmes" accent>
            {upcoming.programme ?? t("programme")}
          </Kicker>
          <CardTitle>{t("startsOn", { day: weekdayDay(upcoming.startDate) })}</CardTitle>
          <p className="text-[15px] leading-[1.45] text-[var(--ink2)]">{t("startsHint")}</p>
        </Card>
      ) : (
        <Card className="space-y-2">
          <CardTitle>{t("none")}</CardTitle>
          <p className="text-[15px] leading-[1.45] text-[var(--ink2)]">{t("noneHint")}</p>
        </Card>
      )}

      <EntryCard
        day={today}
        initial={
          todayRow && {
            sleepH: todayRow.sleep_h === null ? null : Number(todayRow.sleep_h),
            sleepQuality: todayRow.sleep_quality,
            steps: todayRow.steps,
          }
        }
        week={stepsWeek}
        target={client.steps_target}
      />

      <CheckInCard
        weekStart={checkIn.weekStart}
        clientId={client.id}
        existing={checkIn.existing}
        late={checkIn.late}
        upcoming={checkIn.upcoming}
        nudged={checkIn.nudged}
        prompt={
          checkIn.upcoming
            ? tBilan("upcoming", { day: weekdayDay(checkIn.due) })
            : checkIn.late
              ? tBilan("latePrompt", {
                  date: dayMonth(checkIn.weekStart),
                  day: weekdayDay(checkIn.lastChance),
                })
              : `${tBilan("prompt")} ${tBilan("due", { day: weekdayDay(checkIn.due) })}`
        }
      />

      {/* What the check-ins add up to (1 Oct 2026). */}
      <Link href="/evolution" className="glass flex items-center gap-3.5 rounded-r4 p-[18px]">
        <span className="glass2 flex size-12 shrink-0 items-center justify-center rounded-r3 text-[var(--accent)]">
          <Icon name="chart" size={26} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[18px] font-extrabold uppercase leading-tight tracking-[-.01em]">
            {tEvolution("title")}
          </span>
          <span className="tnum block truncate text-[13px] text-[var(--ink2)]">
            {weighed.length > 1
              ? tEvolution("todayLine", {
                  weight: Number(weighed.at(-1)!.bodyweight_kg).toLocaleString(locale),
                  change: `${weightChange > 0 ? "+" : weightChange < 0 ? "−" : "±"}${Math.abs(weightChange).toLocaleString(locale)}`,
                  date: dayMonth(weighed[0].week_start_date),
                })
              : tEvolution("todayLineFirst", { count: weighed.length })}
          </span>
        </span>
        <span aria-hidden className="text-[22px] text-[var(--ink3)]">›</span>
      </Link>
    </>
  );
}

function Gear() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-[19px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
