import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { addDays, clientSession, targetLine, todaySession } from "@/lib/clientData";
import { Card, CardTitle, CtaLink, ScreenHeader } from "@/components/client/ui";
import { EntryCard } from "@/components/client/EntryCard";
import { CheckInCard } from "@/components/client/CheckInCard";
import { InstallPrompt } from "@/components/client/InstallPrompt";

/**
 * Today — TodayView.swift. The week the coach pushed and the session standing
 * in it; then her sleep and steps; then the weekly check-in. A day with
 * nothing in it is a designed state: it says so.
 */
export default async function TodayPage() {
  const { supabase, client, today, monday } = await clientSession();
  const t = await getTranslations("today");
  const tLog = await getTranslations("log");
  const tSettings = await getTranslations("settings");

  const [{ week, session }, metricsRes, checkInRes] = await Promise.all([
    todaySession(),
    supabase
      .from("daily_metrics")
      .select("day, sleep_h, sleep_quality, steps")
      .gte("day", monday)
      .lte("day", addDays(monday, 6)),
    supabase
      .from("check_ins")
      .select(
        "feel, pain, adherence, bodyweight_kg, waist_cm, chest_cm, hips_cm, thigh_cm, note, author, reviewed_at",
      )
      .eq("week_start_date", monday)
      .maybeSingle(),
  ]);

  const metrics = metricsRes.data ?? [];
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

      {session && session.session_exercises.length > 0 ? (
        <div className="space-y-3.5">
          <Card className="space-y-3.5">
            {session.name && <CardTitle>{session.name}</CardTitle>}
            {session.session_exercises.map((exercise) => {
              const target = targetLine(exercise);
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
        weekStart={monday}
        clientId={client.id}
        existing={checkInRes.data ?? null}
      />
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
