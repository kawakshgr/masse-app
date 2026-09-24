import { getTranslations } from "next-intl/server";
import { addDays, clientSession, localDay, todaySession } from "@/lib/clientData";
import { Card, CardTitle, ScreenHeader } from "@/components/client/ui";
import { TrainLog } from "@/components/client/TrainLog";
import { LeverLine } from "@/components/client/LeverLine";

/** Séance — TrainView.swift: today's session, being done. */
export default async function SessionPage() {
  const { supabase, client, zone, today } = await clientSession();
  const { session, levers } = await todaySession();
  const t = await getTranslations("log");

  const exercises = session?.session_exercises ?? [];

  // What the server already has for today, for these exercises only. A set she
  // already did must show, or she is invited to do it again.
  const { data: onServer } = exercises.length
    ? await supabase
        .from("set_logs")
        .select("id, session_exercise_id, set_index, reps, weight_kg, rpe, synced_at, logged_at")
        .in(
          "session_exercise_id",
          exercises.map((e) => e.id),
        )
        // A day either side of UTC midnight; her own timezone decides below.
        .gte("logged_at", `${addDays(today, -1)}T00:00:00Z`)
    : { data: [] };

  // "Today" in her timezone, not the server's.
  const todays = (onServer ?? []).filter((row) => localDay(zone, new Date(row.logged_at)) === today);

  return (
    <>
      <ScreenHeader kicker={t("title")} title={session?.name ?? t("title")} />
      {levers && exercises.length > 0 && <LeverLine levers={levers} kind="training" />}

      {exercises.length === 0 ? (
        <Card>
          <CardTitle>{t("noSession")}</CardTitle>
        </Card>
      ) : (
        <TrainLog clientId={client.id} exercises={exercises} onServer={todays} />
      )}
    </>
  );
}
