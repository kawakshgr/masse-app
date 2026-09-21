import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { SplitPane } from "@/components/SplitPane";

export default async function ProgrammesPage() {
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

  const list =
    rows.length === 0 ? (
      <div className="p-6">
        <p className="text-[13px] font-semibold">{t("empty")}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--ink2)]">
          {t("emptyAction")}
        </p>
      </div>
    ) : (
      <>
        <div className="flex h-10 items-center border-b border-[var(--hair)] px-3">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
            {t("title")}
          </span>
        </div>
        <ul>
          {rows.map((row) => (
            <li key={row.id}>
              <div
                className="flex items-center gap-3 border-b border-[var(--hair)] px-3"
                style={{ height: "var(--row-h)" }}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-[13px] font-bold leading-tight"
                    title={row.name}
                  >
                    {row.name}
                  </p>
                  <p className="tnum truncate text-[11px] leading-tight text-[var(--ink2)]">
                    {t("weeks", { count: row.weekCount })} ·{" "}
                    {t("assigned", { count: row.clientCount })}
                  </p>
                </div>
                {row.isTemplate && (
                  <span className="shrink-0 rounded-r1 border border-[var(--edge)] px-2 py-0.5 text-[10px] text-[var(--ink3)]">
                    {t("template")}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </>
    );

  return (
    <SplitPane
      storageKey="masse:pane:programmes"
      list={list}
      detail={
        <div className="grid h-full place-items-center p-6">
          <p className="text-[12px] text-[var(--ink3)]">{t("emptyAction")}</p>
        </div>
      }
    />
  );
}
