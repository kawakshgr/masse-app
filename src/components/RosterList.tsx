"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Toolbar } from "@/components/Toolbar";
import type { RosterEntry } from "@/lib/roster";
import { InviteDialog, type PendingInvite } from "@/components/InviteDialog";

export function RosterList({
  entries,
  pendingInvites,
}: {
  entries: RosterEntry[];
  pendingInvites: PendingInvite[];
}) {
  const t = useTranslations("roster");
  const tAttention = useTranslations("attention");
  const tChip = useTranslations("chip");
  const tToolbar = useTranslations("toolbar");
  const tInvite = useTranslations("invite");
  const params = useParams<{ id?: string }>();
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((e) => e.name.toLowerCase().includes(needle));
  }, [entries, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pt-3">
        <Toolbar query={query} onQueryChange={setQuery} />
      </div>

      <div className="mt-3 flex h-10 shrink-0 items-center justify-between border-y border-[var(--hair)] px-3">
        <span className="text-[10px] uppercase tracking-[.14em] text-[var(--ink2)]">
          {t("title")}
        </span>
        <span className="tnum text-[10px] text-[var(--ink3)]">
          {t("count", { count: entries.length })}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          // Empty states are designed, not blank.
          <div className="p-5">
            <p className="text-[13px] font-bold">{t("empty")}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--ink2)]">
              {t("emptyAction")}
            </p>
          </div>
        ) : (
          <ul>
            {shown.map((entry) => {
              const active = params?.id === entry.id;
              const secondLine = entry.attention
                ? tAttention(entry.attention)
                : (entry.blockLabel ?? t("noBlock"));

              return (
                <li key={entry.id}>
                  <Link
                    href={`/clients/${entry.id}`}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 border-b border-[var(--hair)] px-3 transition-colors ${
                      active ? "sel" : "hover:bg-[var(--glass)]"
                    }`}
                    style={{ height: "var(--row-h)" }}
                  >
                    <span
                      aria-hidden
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-[var(--on-accent)]"
                      style={{
                        background: "linear-gradient(140deg, var(--a1), var(--a2))",
                      }}
                    >
                      {entry.initials}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span
                        className="block truncate text-[13px] font-bold leading-tight"
                        title={entry.name}
                      >
                        {entry.name}
                      </span>
                      <span
                        className={`block truncate text-[11px] leading-tight ${
                          entry.attention ? "text-[var(--a3)]" : "text-[var(--ink2)]"
                        }`}
                        title={secondLine}
                      >
                        {secondLine}
                      </span>
                    </span>

                    {entry.attention && (
                      <span className="shrink-0 rounded-rp border border-[var(--a3)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--a3)]">
                        {tChip(entry.attention)}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t border-[var(--hair)] p-3">
        {pendingInvites.length > 0 && (
          <p className="tnum mb-2 text-[11px] text-[var(--ink3)]">
            {tInvite("pending", { count: pendingInvites.length })}
          </p>
        )}
        <InviteDialog pending={pendingInvites} label={tToolbar("addClient")} />
      </div>
    </div>
  );
}
