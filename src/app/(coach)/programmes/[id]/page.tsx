import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { WeekEditor, type EditorSession } from "@/components/WeekEditor";
import { WeekExport, WeekPrintout } from "@/components/WeekExport";
import { addWeek, deleteWeek, duplicateWeek, toggleTemplate } from "../actions";
import { ProgrammeHeader } from "@/components/ProgrammeHeader";

export default async function ProgrammeEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ semaine?: string }>;
}) {
  const { id } = await params;
  const { semaine } = await searchParams;
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
        .select("id, day_index, name, session_exercises(id, position, name, scheme, cue)")
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
      name: s.name,
      exercises: [
        ...((s.session_exercises as unknown as EditorSession["exercises"]) ?? []),
      ].sort((a, b) => a.position - b.position),
    }));

    assignedClientIds = (assignmentsRes.data ?? []).map((a) => a.client_id);
  }

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  return (
    <div className="p-5">
      <header className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <ProgrammeHeader programmeId={programme.id} name={programme.name} />

        <form
          action={async () => {
            "use server";
            await toggleTemplate(programme.id, !programme.is_template);
          }}
        >
          <button
            type="submit"
            className="h-8 rounded-r2 border border-[var(--edge)] px-3 text-[11px] text-[var(--ink2)]"
          >
            {programme.is_template ? t("untemplate") : t("template")}
          </button>
        </form>

        {current && (
          <WeekExport
            programmeName={programme.name}
            weekNumber={current.week_number}
            sessions={sessions}
          />
        )}

        {current && (
          <form
            action={async () => {
              "use server";
              await duplicateWeek(current.id, programme.id);
            }}
          >
            <button
              type="submit"
              className="h-8 rounded-r2 border border-[var(--edge)] px-3 text-[11px] text-[var(--ink2)]"
            >
              {t("duplicate")}
            </button>
          </form>
        )}
      </header>

      <nav className="mb-4 flex flex-wrap items-center gap-1 print:hidden">
        {weeks.map((week) => {
          const active = current?.id === week.id;
          return (
            <Link
              key={week.id}
              href={`/programmes/${programme.id}?semaine=${week.week_number}`}
              aria-current={active ? "page" : undefined}
              className={`h-8 rounded-r2 px-3 text-[12px] font-semibold leading-8 ${
                active
                  ? "border border-[var(--edge)] bg-[var(--glass2)] text-[var(--ink)]"
                  : "text-[var(--ink2)] hover:bg-[var(--glass)]"
              }`}
            >
              {tProg("week", { number: week.week_number })}
            </Link>
          );
        })}

        <form
          action={async () => {
            "use server";
            await addWeek(programme.id);
          }}
        >
          <button
            type="submit"
            className="h-8 rounded-r2 px-3 text-[12px] text-[var(--accent)]"
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
              className="h-8 rounded-r2 px-3 text-[12px] text-[var(--ink3)] hover:text-[var(--a3)]"
            >
              {tProgramme("removeWeek")}
            </button>
          </form>
        )}
      </nav>

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
        />
      ) : (
        <p className="text-[12px] text-[var(--ink3)]">{tProg("emptyAction")}</p>
      )}
    </div>
  );
}
