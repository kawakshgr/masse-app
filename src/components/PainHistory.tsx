import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { SectionTitle } from "@/components/Pane";
import { markPainSeen } from "@/app/(coach)/clients/actions";

/**
 * Every pain the client flagged, newest first — so a shoulder that comes
 * back three weeks running is seen as one story, not three alerts. Absent
 * when there is none: nothing to report is not a section.
 */
export async function PainHistory({ clientId }: { clientId: string }) {
  const supabase = await createClient();
  const { data: reports } = await supabase
    .from("pain_reports")
    .select("id, exercise_name, level, note, created_at, seen_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (!reports?.length) return null;

  const t = await getTranslations("pain");
  const day = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" });

  return (
    <section className="glass rounded-r3 p-4">
      <SectionTitle
        icon="pain"
        aside={<span className="tnum text-[12px] font-bold text-[var(--ink3)]">{reports.length}</span>}
      >
        {t("history")}
      </SectionTitle>
      <ul className="mt-3 flex flex-col gap-1.5">
        {reports.map((report) => (
          <li key={report.id} className="glass2 flex h-[52px] items-center gap-3 rounded-r2 px-3">
            <span className="tnum w-14 shrink-0 text-[12px] text-[var(--ink2)]">{day(report.created_at)}</span>
            <span className="min-w-0 flex-1">
              {/* Movement names stay as the coach wrote them. */}
              <span className="block truncate text-[13px] font-semibold">{report.exercise_name}</span>
              <span
                className={`block truncate text-[11.5px] ${
                  report.level === "mild" ? "text-[var(--ink2)]" : "text-[var(--a3)]"
                }`}
              >
                {[t(`level.${report.level}`), report.note].filter(Boolean).join(" · ")}
              </span>
            </span>
            {report.seen_at ? (
              <span className="shrink-0 text-[11px] uppercase tracking-[.1em] text-[var(--ink3)]">{t("seen")}</span>
            ) : (
              <form action={markPainSeen}>
                <input type="hidden" name="id" value={report.id} />
                <button
                  type="submit"
                  className="glass h-8 shrink-0 rounded-rp px-3 text-[11px] font-bold uppercase tracking-[.08em] text-[var(--ink)]"
                >
                  {t("markSeen")}
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
