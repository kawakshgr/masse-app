import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { SplitPane } from "@/components/SplitPane";
import { createProgramme } from "./actions";

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
      <div className="flex h-10 shrink-0 items-center border-b border-[var(--hair)] px-3">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
          {t("title")}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="p-5">
            <p className="text-[13px] font-semibold">{t("empty")}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--ink2)]">
              {t("emptyAction")}
            </p>
          </div>
        ) : (
          <ul>
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/programmes/${row.id}`}
                  className="flex items-center gap-3 border-b border-[var(--hair)] px-3 hover:bg-[var(--glass)]"
                  style={{ height: "var(--row-h)" }}
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-[13px] font-bold leading-tight"
                      title={row.name}
                    >
                      {row.name}
                    </span>
                    <span className="tnum block truncate text-[11px] leading-tight text-[var(--ink2)]">
                      {t("weeks", { count: row.weekCount })} ·{" "}
                      {t("assigned", { count: row.clientCount })}
                    </span>
                  </span>
                  {row.isTemplate && (
                    <span className="shrink-0 rounded-r1 border border-[var(--edge)] px-2 py-0.5 text-[10px] text-[var(--ink3)]">
                      {t("template")}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t border-[var(--hair)] p-3">
        <form action={createProgramme} className="flex gap-2">
          <input
            name="name"
            placeholder={t("new")}
            aria-label={t("new")}
            className="h-9 min-w-0 flex-1 rounded-r2 border border-[var(--edge)] bg-[var(--glass)] px-2 text-[12px] text-[var(--ink)] placeholder:text-[var(--ink3)]"
          />
          <button
            type="submit"
            className="h-9 shrink-0 rounded-r2 px-3 text-[12px] font-semibold text-[var(--onA)]"
            style={{ background: "linear-gradient(140deg, var(--a1), var(--a2))" }}
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
