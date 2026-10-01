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
 * for today. Nothing to say, nothing sent. Service role, CRON_SECRET only.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorised", { status: 401 });
  }
  if (!pushReady()) return Response.json({ ok: false, reason: "push keys not set" }, { status: 500 });

  const admin = pushAdmin();
  const today = localDay("Europe/Paris");
  const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
  const monday = addDays(today, -weekday);

  const { data: devices } = await admin.from("push_subscriptions").select("user_id");
  const userIds = [...new Set((devices ?? []).map((d) => d.user_id))];
  if (userIds.length === 0) return Response.json({ ok: true, sent: 0 });

  const { data: clients } = await admin
    .from("clients")
    .select("id, coach_id, coaches(first_name, name, check_in_due_offset)")
    .in("id", userIds)
    .eq("status", "active");
  const ids = (clients ?? []).map((c) => c.id);
  if (ids.length === 0) return Response.json({ ok: true, sent: 0 });

  // A day either side in UTC, then kept to today in Paris: no offset to get
  // wrong across the clock change.
  const dayStart = new Date(`${addDays(today, -1)}T00:00:00Z`).toISOString();
  const dayEnd = new Date(`${addDays(today, 2)}T00:00:00Z`).toISOString();

  const [assignments, moves, checkIns, calls] = await Promise.all([
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

  return Response.json({ ok: true, sent });
}
