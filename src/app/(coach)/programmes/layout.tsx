import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { SplitPane } from "@/components/SplitPane";
import { createProgramme } from "./actions";
import { PaneHead } from "@/components/Pane";
import { ProgrammeRows } from "@/components/ProgrammeRows";

export default async function ProgrammesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("programmes");
  const supabase = await createClient();

  // Week count and assignment count are both derived, never stored.
  const { data: programmes } = await supabase
    .from("programmes")
    .select("id, name, is_template, programme_weeks(id, assignments(client_id))")
    .order("updated_at", { ascending: false });

  const rows = (programmes ?? []).map((programme) => {
    const weeks =
      (programme.programme_weeks as unknown as {
        id: string;
        assignments: { client_id: string }[];
      }[]) ?? [];

    const clients = new Set<string>();
    for (const week of weeks) {
      for (const assignment of week.assignments ?? []) clients.add(assignment.client_id);
    }

    return {
      id: programme.id,
      name: programme.name,
      isTemplate: programme.is_template,
      weekCount: weeks.length,
      clientCount: clients.size,
    };
  });

  const list = (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--hair)] p-3 pt-4">
        <PaneHead kicker={t("count", { count: rows.length })} title={t("title")} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="p-5">
            <p className="text-[14px] font-semibold">{t("empty")}</p>
            <p className="mt-1 text-[13px] leading-[1.5] text-[var(--ink2)]">
              {t("emptyAction")}
            </p>
          </div>
        ) : (
          <ProgrammeRows rows={rows} />
        )}
      </div>

      <div className="shrink-0 border-t border-[var(--hair)] p-3">
        <form action={createProgramme} className="flex gap-2">
          <input
            name="name"
            placeholder={t("new")}
            aria-label={t("new")}
            className="h-9 min-w-0 flex-1 rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink3)]"
          />
          <button
            type="submit"
            aria-label={t("new")}
            className="cta h-9 shrink-0 rounded-r2 px-3.5 text-[15px] font-bold text-[var(--onA)]"
          >
            +
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <SplitPane storageKey="masse:pane:programmes" list={list} detail={children} />
  );
}
