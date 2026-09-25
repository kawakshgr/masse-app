"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Toolbar } from "@/components/Toolbar";
import { Badge, PaneHead, Tile, rowClass } from "@/components/Pane";
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
      <div className="flex flex-col gap-3 border-b border-[var(--hair)] p-3 pt-4">
        <PaneHead kicker={t("count", { count: entries.length })} title={t("title")} />
        <Toolbar query={query} onQueryChange={setQuery} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          // Empty states are designed, not blank.
          <div className="p-5">
            <p className="text-[14px] font-semibold">{t("empty")}</p>
            <p className="mt-1 text-[13px] leading-[1.5] text-[var(--ink2)]">
              {t("emptyAction")}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1 p-2">
            {shown.map((entry) => {
              const active = params?.id === entry.id;
              const secondLine = entry.attention
                ? tAttention(entry.attention)
                : (entry.blockLabel ?? t("noBlock"));

              return (
                <li key={entry.id}>
                  <Link
                    // The chip opens the tab that answers it.
                    href={
                      entry.attention === "checkin" || entry.attention === "late"
                        ? `/clients/${entry.id}?onglet=checkins`
                        : `/clients/${entry.id}`
                    }
                    aria-current={active ? "page" : undefined}
                    className={rowClass(active)}
                  >
                    <Tile accent>{entry.initials}</Tile>

                    <span className="min-w-0 flex-1">
                      <span
                        className="block truncate text-[13.5px] font-semibold leading-tight"
                        title={entry.name}
                      >
                        {entry.name}
                      </span>
                      <span
                        className={`block truncate text-[12px] leading-tight ${
                          entry.attention ? "text-[var(--a3)]" : "text-[var(--ink2)]"
                        }`}
                        title={secondLine}
                      >
                        {secondLine}
                      </span>
                    </span>

                    {entry.attention && <Badge tone="alert">{tChip(entry.attention)}</Badge>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t border-[var(--hair)] p-3">
        {pendingInvites.length > 0 && (
          <p className="tnum mb-2 text-[12px] text-[var(--ink3)]">
            {tInvite("pending", { count: pendingInvites.length })}
          </p>
        )}
        <InviteDialog pending={pendingInvites} label={tToolbar("addClient")} />
      </div>
    </div>
  );
}
