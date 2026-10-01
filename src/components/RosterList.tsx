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
          <ul className="flex flex-col gap-1 p-2 max-md:gap-2 max-md:p-3">
            {/* On a phone the rows grow for a thumb — a bigger face, bigger
                words, each row on its card (1 Oct 2026); still a list, since
                the reason under each name is what is read. */}
            {shown.map((entry) => {
              const active = params?.id === entry.id;
              const secondLine = entry.pending
                ? t("pendingLine")
                : entry.attention
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
                    className={`${rowClass(active)} max-md:h-[78px] max-md:gap-3.5 max-md:px-3.5 max-md:[&>span:first-child]:size-12 max-md:[&>span:first-child]:text-[15px] ${
                      active ? "" : "max-md:border-[var(--hair)] max-md:bg-[var(--glass)]"
                    } ${entry.archived ? "opacity-60" : ""}`}
                  >
                    <Tile accent>{entry.initials}</Tile>

                    <span className="min-w-0 flex-1">
                      <span
                        className="block truncate text-[13.5px] font-semibold leading-tight max-md:text-[16.5px]"
                        title={entry.name}
                      >
                        {entry.name}
                      </span>
                      <span
                        className={`mt-0.5 block truncate text-[12px] leading-tight max-md:mt-1 max-md:text-[13.5px] ${
                          entry.attention ? "text-[var(--a3)]" : "text-[var(--ink2)]"
                        }`}
                        title={secondLine}
                      >
                        {secondLine}
                      </span>
                    </span>

                    {entry.attention && <Badge tone="alert">{tChip(entry.attention)}</Badge>}
                    {entry.archived && <Badge>{t("archived")}</Badge>}
                    {entry.pending && <Badge>{t("pending")}</Badge>}
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
