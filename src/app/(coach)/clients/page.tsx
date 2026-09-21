import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { loadRoster, type RosterEntry } from "@/lib/roster";
import { SplitPane } from "@/components/SplitPane";

function Avatar({ initials }: { initials: string }) {
  return (
    <span
      aria-hidden
      className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-[var(--onA)]"
      style={{ background: "linear-gradient(140deg, var(--a1), var(--a2))" }}
    >
      {initials}
    </span>
  );
}

async function Row({ entry }: { entry: RosterEntry }) {
  const tAttention = await getTranslations("attention");
  const tChip = await getTranslations("chip");
  const tRoster = await getTranslations("roster");

  const secondLine = entry.attention
    ? tAttention(entry.attention)
    : (entry.blockLabel ?? tRoster("noBlock"));

  return (
    <li>
      <div
        className="flex items-center gap-3 border-b border-[var(--hair)] px-3"
        style={{ height: "var(--row-h)" }}
      >
        <Avatar initials={entry.initials} />

        <div className="min-w-0 flex-1">
          <p
            className="truncate text-[13px] font-bold leading-tight"
            title={entry.name}
          >
            {entry.name}
          </p>
          <p
            className={`truncate text-[11px] leading-tight ${
              entry.attention ? "text-[var(--a3)]" : "text-[var(--ink2)]"
            }`}
            title={secondLine}
          >
            {secondLine}
          </p>
        </div>

        {entry.attention && (
          <span className="shrink-0 rounded-r1 border border-[var(--a3)] px-2 py-0.5 text-[10px] font-semibold text-[var(--a3)]">
            {tChip(entry.attention)}
          </span>
        )}
      </div>
    </li>
  );
}

export default async function ClientsPage() {
  const t = await getTranslations("roster");
  const supabase = await createClient();
  const { entries } = await loadRoster(supabase);

  const list =
    entries.length === 0 ? (
      // Empty states are designed, not blank.
      <div className="p-6">
        <p className="text-[13px] font-semibold">{t("empty")}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--ink2)]">
          {t("emptyAction")}
        </p>
      </div>
    ) : (
      <>
        <div className="flex h-10 items-center justify-between border-b border-[var(--hair)] px-3">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
            {t("title")}
          </span>
          <span className="tnum text-[10px] text-[var(--ink3)]">
            {t("count", { count: entries.length })}
          </span>
        </div>
        <ul>
          {entries.map((entry) => (
            <Row key={entry.id} entry={entry} />
          ))}
        </ul>
      </>
    );

  return (
    <SplitPane
      storageKey="masse:pane:clients"
      list={list}
      detail={
        <div className="grid h-full place-items-center p-6">
          <p className="text-[12px] text-[var(--ink3)]">{t("emptyAction")}</p>
        </div>
      }
    />
  );
}
