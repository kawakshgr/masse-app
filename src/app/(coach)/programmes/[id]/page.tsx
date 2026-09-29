import { SubNav } from "@/components/SubNav";
import { MENU_ITEM, SectionTitle } from "@/components/Pane";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { WeekEditor, type EditorSession } from "@/components/WeekEditor";
import { WeekExport, WeekPrintout } from "@/components/WeekExport";
import { addWeek, deleteWeek, duplicateWeek, progressWeek, toggleTemplate } from "../actions";
import { ProgrammeHeader } from "@/components/ProgrammeHeader";
import { hevyConfigured } from "@/lib/hevy";

export default async function ProgrammeEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    semaine?: string;
    progres?: string;
    stable?: string;
    inconnu?: string;
    regle?: string;
  }>;
}) {
  const { id } = await params;
  const { semaine, progres, stable, inconnu, regle } = await searchParams;
  const tProgress = await getTranslations("progress");
  const supabase = await createClient();

  const { data: programme } = await supabase
    .from("programmes")
    .select("id, name, is_template, programme_weeks(id, week_number)")
    .eq("id", id)
    .maybeSingle();

  if (!programme) notFound();

  const t = await getTranslations("editor");
  const tProg = await getTranslations("programmes");
  const tProgramme = await getTranslations("programme");

  const weeks = [
    ...((programme.programme_weeks as unknown as { id: string; week_number: number }[]) ?? []),
  ].sort((a, b) => a.week_number - b.week_number);

  const current =
    weeks.find((w) => String(w.week_number) === semaine) ?? weeks[0] ?? null;

  let sessions: EditorSession[] = [];
  let assignedClientIds: string[] = [];

  if (current) {
    const [sessionsRes, assignmentsRes] = await Promise.all([
      supabase
        .from("sessions")
        .select("id, day_index, name, kind, session_exercises(id, position, name, scheme, cue, rest_min_s, rest_max_s)")
        .eq("week_id", current.id)
        .order("day_index"),
      supabase
        .from("assignments")
        .select("client_id")
        .eq("week_id", current.id)
        .not("pushed_at", "is", null),
    ]);

    sessions = (sessionsRes.data ?? []).map((s) => ({
      id: s.id,
      day_index: s.day_index,
      kind: s.kind,
      name: s.name,
      exercises: [
        ...((s.session_exercises as unknown as EditorSession["exercises"]) ?? []),
      ].sort((a, b) => a.position - b.position),
    }));

    assignedClientIds = (assignmentsRes.data ?? []).map((a) => a.client_id);
  }

  const [{ data: clients }, { data: catalogue }, { data: hidden }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, name")
        .eq("status", "active")
        .order("name"),
      // Built-ins plus her own, in one list.
      supabase
        .from("exercises")
        .select("id, name, muscle_group, equipment, coach_id")
        .order("name")
        .limit(500),
      // Built-ins she has put away. Hers alone; nobody else's list changes.
      supabase.from("exercise_hidden").select("exercise_id"),
    ]);

  const hiddenIds = new Set((hidden ?? []).map((row) => row.exercise_id));

  return (
    <div className="p-5">
      <header className="mb-4 print:hidden">
        <ProgrammeHeader
          programmeId={programme.id}
          name={programme.name}
          actions={
            <>
              <form
                action={async () => {
                  "use server";
                  await toggleTemplate(programme.id, !programme.is_template);
                }}
              >
                <button type="submit" className={MENU_ITEM}>
                  {programme.is_template ? t("untemplate") : t("template")}
                </button>
              </form>

              {current && (
                <form
                  action={async () => {
                    "use server";
                    await duplicateWeek(current.id, programme.id);
                  }}
                >
                  <button type="submit" className={MENU_ITEM}>
                    {t("duplicate")}
                  </button>
                </form>
              )}

              {/* The next week, from how this one went — by load or by reps. */}
              {current &&
                (["load", "reps"] as const).map((rule) => (
                  <form
                    key={rule}
                    action={async () => {
                      "use server";
                      await progressWeek(current.id, programme.id, rule);
                    }}
                  >
                    <button type="submit" className={MENU_ITEM}>
                      {tProgress(rule === "load" ? "menuLoad" : "menuReps")}
                    </button>
                  </form>
                ))}

              {current && (
                <WeekExport
                  programmeName={programme.name}
                  weekNumber={current.week_number}
                  sessions={sessions}
                />
              )}
            </>
          }
        />
      </header>

      {progres !== undefined && current && (
        <section className="glass mb-4 rounded-r3 p-4 print:hidden">
          <SectionTitle icon="chart">
            {tProgress("done", { week: current.week_number })}
          </SectionTitle>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {(
              [
                ["up", Number(progres ?? 0), regle === "reps" ? "upReps" : "upLoad"],
                ["hold", Number(stable ?? 0), "hold"],
                ["unknown", Number(inconnu ?? 0), "unknown"],
              ] as const
            ).map(([key, count, message]) => (
              <div key={key} className="glass2 rounded-r2 px-3 py-2.5">
                <p className="tnum font-display text-[24px] font-extrabold leading-none">{count}</p>
                <p className="mt-1 text-[12px] leading-[1.4] text-[var(--ink2)]">{tProgress(message, { count })}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12.5px] leading-[1.5] text-[var(--ink3)]">{tProgress("notPushed")}</p>
        </section>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <SubNav
          items={weeks.map((week) => ({
            key: week.id,
            href: `/programmes/${programme.id}?semaine=${week.week_number}`,
            label: tProg("week", { number: week.week_number }),
            active: current?.id === week.id,
          }))}
        />

        <form
          action={async () => {
            "use server";
            await addWeek(programme.id);
          }}
        >
          <button
            type="submit"
            className="h-8 rounded-r2 px-3 text-[13px] text-[var(--accent)]"
          >
            {t("addWeek")}
          </button>
        </form>

        {current && weeks.length > 1 && (
          <form
            action={async () => {
              "use server";
              await deleteWeek(current.id, programme.id);
            }}
          >
            <button
              type="submit"
              className="h-8 rounded-r2 px-3 text-[13px] text-[var(--ink3)] hover:text-[var(--a3)]"
            >
              {tProgramme("removeWeek")}
            </button>
          </form>
        )}
      </div>

      {current && (
        <WeekPrintout
          programmeName={programme.name}
          weekNumber={current.week_number}
          sessions={sessions}
        />
      )}

      {current ? (
        <WeekEditor
          programmeId={programme.id}
          weekId={current.id}
          sessions={sessions}
          clients={clients ?? []}
          assignedClientIds={assignedClientIds}
          catalogue={(catalogue ?? [])
            .filter((e) => !hiddenIds.has(e.id))
            .map((e) => ({
              id: e.id,
              name: e.name,
              // Hevy writes the same muscle two ways and says "None" for no
              // equipment; both are tidied here, once, before anything shows.
              muscleGroup: e.muscle_group === "Quads" ? "Quadriceps" : e.muscle_group,
              equipment: e.equipment === "None" ? null : e.equipment,
              mine: e.coach_id !== null,
            }))}
          hevyConfigured={hevyConfigured()}
        />
      ) : (
        <p className="text-[13px] text-[var(--ink3)]">{tProg("emptyAction")}</p>
      )}
    </div>
  );
}
