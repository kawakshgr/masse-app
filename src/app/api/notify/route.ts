import type { NextRequest } from "next/server";
import { pushAdmin, pushReady, pushTo } from "@/lib/push";
import { localDay, addDays } from "@/lib/clientData";
import { plannedDays } from "@/lib/dayMoves";
import { DEFAULT_DUE_OFFSET, checkInWindow, isFiled } from "@/lib/checkIns";

/**
 * The morning notification (1 Oct 2026), run once a day by Vercel Cron: to
 * every active client with a device that said yes, one notification for
 * the day — the session, read through the week as they arranged it (as
 * Today does), the check-in when it is due or late, and a video call booked
 * for today, and the night to note when it is not yet (1 Oct 2026). Nothing
 * to say, nothing sent. Service role, CRON_SECRET only.
 *
 * `?moment=soir` is the evening run (21:00 in Paris in summer, 20:00 in
 * winter): only the day's steps — and the night, if still missing — to
 * those who have not typed them. Nothing else is repeated at night.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorised", { status: 401 });
  }
  if (!pushReady()) return Response.json({ ok: false, reason: "push keys not set" }, { status: 500 });

  const admin = pushAdmin();
  const today = localDay("Europe/Paris");
  if (request.nextUrl.searchParams.get("moment") === "soir") return evening(admin, today);
  const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
  const monday = addDays(today, -weekday);

  const { data: devices } = await admin.from("push_subscriptions").select("user_id");
  const userIds = [...new Set((devices ?? []).map((d) => d.user_id))];
  if (userIds.length === 0) return Response.json({ ok: true, sent: 0 });

  const coachSent = await coachDay(admin, userIds, today, weekday, monday);

  const { data: clients } = await admin
    .from("clients")
    .select("id, coach_id, coaches(first_name, name, check_in_due_offset)")
    .in("id", userIds)
    .eq("status", "active");
  const ids = (clients ?? []).map((c) => c.id);
  if (ids.length === 0) return Response.json({ ok: true, sent: coachSent });

  // A day either side in UTC, then kept to today in Paris: no offset to get
  // wrong across the clock change.
  const dayStart = new Date(`${addDays(today, -1)}T00:00:00Z`).toISOString();
  const dayEnd = new Date(`${addDays(today, 2)}T00:00:00Z`).toISOString();

  const [assignments, moves, checkIns, calls, metrics] = await Promise.all([
    admin
      .from("assignments")
      .select("client_id, start_date, programme_weeks(sessions(day_index, kind, name, session_exercises(id)))")
      .in("client_id", ids)
      .not("pushed_at", "is", null)
      .lte("start_date", today)
      .gte("start_date", addDays(today, -7)),
    admin.from("client_day_moves").select("client_id, day_index, planned_day").in("client_id", ids).eq("week_start", monday),
    admin
      .from("check_ins")
      .select("client_id, week_start_date, feel, pain, adherence, bodyweight_kg, note, waist_cm, chest_cm, hips_cm, thigh_cm, check_in_photos(id)")
      .in("client_id", ids)
      .gte("week_start_date", addDays(monday, -7)),
    admin
      .from("appointments")
      .select("client_id, starts_at")
      .in("client_id", ids)
      .is("cancelled_at", null)
      .gte("starts_at", dayStart)
      .lt("starts_at", dayEnd),
    admin.from("daily_metrics").select("client_id, sleep_h").in("client_id", ids).eq("day", today),
  ]);

  let sent = 0;
  for (const client of clients ?? []) {
    const coach = client.coaches as unknown as { first_name: string | null; name: string; check_in_due_offset: number | null } | null;

    // The latest week delivered, read through this week's moves.
    const week = (assignments.data ?? [])
      .filter((row) => row.client_id === client.id)
      .sort((a, b) => b.start_date.localeCompare(a.start_date))[0];
    const sessions = (week?.programme_weeks as unknown as {
      sessions: { day_index: number; kind: string; name: string | null; session_exercises: { id: string }[] }[];
    } | null)?.sessions ?? [];
    const plan = plannedDays((moves.data ?? []).filter((m) => m.client_id === client.id));
    const session = sessions.find(
      (s) => s.day_index === plan[weekday] && s.kind !== "rest" && s.session_exercises.length > 0,
    );

    // The check-in asked today, by her coach's due day: due today, or late.
    const window = checkInWindow(monday, weekday, coach?.check_in_due_offset ?? DEFAULT_DUE_OFFSET);
    const row = (checkIns.data ?? []).find((c) => c.client_id === client.id && c.week_start_date === window.weekStart);
    const filed = row ? isFiled(row, row.check_in_photos?.length ?? 0) : false;
    const checkIn = filed ? null : window.due === today ? "due" : window.late && today <= window.lastChance ? "late" : null;

    const call = (calls.data ?? []).find(
      (c) => c.client_id === client.id && localDay("Europe/Paris", new Date(c.starts_at)) === today,
    );
    const coachName = coach?.first_name ?? coach?.name ?? "";
    // Last night, typed on today's row as Today asks for it.
    const sleepMissing = !(metrics.data ?? []).some((m) => m.client_id === client.id && m.sleep_h != null);

    sent += await pushTo([client.id], (t, locale) => {
      const lines = [
        session ? (session.name ? t("session", { name: session.name }) : t("sessionUnnamed")) : null,
        checkIn === "due" ? t("checkInDue") : checkIn === "late" ? t("checkInLate") : null,
        call
          ? t("callToday", {
              coach: coachName,
              time: new Date(call.starts_at).toLocaleTimeString(locale === "en" ? "en-GB" : "fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Europe/Paris",
              }),
            })
          : null,
        sleepMissing ? t("sleepAsk") : null,
      ].filter(Boolean);
      if (lines.length === 0) return null;
      return {
        title: t("morningTitle"),
        body: lines.join(" · "),
        url: checkIn ? "/aujourdhui" : session ? "/seance" : "/aujourdhui",
        tag: `morning-${today}`,
      };
    });
  }

  return Response.json({ ok: true, sent: sent + coachSent });
}

/**
 * The coach's day of check-ins — the weekday she set them due, the day she
 * keeps for them (Kevin, 1 Oct 2026): one morning notification with what
 * waits — check-ins filed and unread, not yet filed, late payments, pain
 * not yet seen. Nothing waiting, nothing sent.
 */
async function coachDay(
  admin: ReturnType<typeof pushAdmin>,
  userIds: string[],
  today: string,
  weekday: number,
  monday: string,
): Promise<number> {
  const { data: coaches } = await admin.from("coaches").select("id, check_in_due_offset").in("id", userIds);
  let sent = 0;
  for (const coach of coaches ?? []) {
    const offset = coach.check_in_due_offset ?? DEFAULT_DUE_OFFSET;
    if (offset % 7 !== weekday) continue;

    const { data: mine } = await admin.from("clients").select("id").eq("coach_id", coach.id).eq("status", "active");
    const ids = (mine ?? []).map((c) => c.id);
    if (ids.length === 0) continue;

    const window = checkInWindow(monday, weekday, offset);
    const [unread, asked, late, pain] = await Promise.all([
      admin
        .from("check_ins")
        .select("feel, pain, adherence, bodyweight_kg, note, waist_cm, chest_cm, hips_cm, thigh_cm, check_in_photos(id)")
        .in("client_id", ids)
        .is("reviewed_at", null),
      admin
        .from("check_ins")
        .select("client_id, feel, pain, adherence, bodyweight_kg, note, waist_cm, chest_cm, hips_cm, thigh_cm, check_in_photos(id)")
        .in("client_id", ids)
        .eq("week_start_date", window.weekStart),
      admin.from("invoices").select("id", { count: "exact", head: true }).eq("coach_id", coach.id).eq("status", "late"),
      admin.from("pain_reports").select("id", { count: "exact", head: true }).in("client_id", ids).is("seen_at", null),
    ]);

    const toRead = (unread.data ?? []).filter((row) => isFiled(row, row.check_in_photos?.length ?? 0)).length;
    const filedIds = new Set(
      (asked.data ?? []).filter((row) => isFiled(row, row.check_in_photos?.length ?? 0)).map((row) => row.client_id),
    );
    const notYet = ids.filter((id) => !filedIds.has(id)).length;

    sent += await pushTo([coach.id], (t) => {
      const lines = [
        toRead > 0 ? t("coachToRead", { count: toRead }) : null,
        notYet > 0 ? t("coachNotYet", { count: notYet }) : null,
        (late.count ?? 0) > 0 ? t("coachLate", { count: late.count ?? 0 }) : null,
        (pain.count ?? 0) > 0 ? t("coachPain", { count: pain.count ?? 0 }) : null,
      ].filter(Boolean);
      if (lines.length === 0) return null;
      return { title: t("coachDayTitle"), body: lines.join(" · "), url: "/clients", tag: `coach-day-${today}` };
    });
  }
  return sent;
}

/**
 * The evening reminder (1 Oct 2026): the day's steps, and the night if it
 * is still not noted, to every active client with a device who has not
 * typed them today. One line, one notification, then nothing until morning.
 */
async function evening(admin: ReturnType<typeof pushAdmin>, today: string) {
  const { data: devices } = await admin.from("push_subscriptions").select("user_id");
  const userIds = [...new Set((devices ?? []).map((d) => d.user_id))];
  if (userIds.length === 0) return Response.json({ ok: true, sent: 0 });

  const [{ data: clients }, { data: metrics }] = await Promise.all([
    admin.from("clients").select("id").in("id", userIds).eq("status", "active"),
    admin.from("daily_metrics").select("client_id, sleep_h, steps").in("client_id", userIds).eq("day", today),
  ]);

  let sent = 0;
  for (const client of clients ?? []) {
    const row = (metrics ?? []).find((m) => m.client_id === client.id);
    if (row?.steps != null) continue;
    const sleepToo = row?.sleep_h == null;
    sent += await pushTo([client.id], (t) => ({
      title: t("eveningTitle"),
      body: sleepToo ? t("stepsAndSleepAsk") : t("stepsAsk"),
      url: "/aujourdhui",
      tag: `evening-${today}`,
    }));
  }
  return Response.json({ ok: true, sent });
}
