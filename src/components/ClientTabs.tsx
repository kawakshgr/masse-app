"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { CLIENT_TABS, type ClientTab } from "@/lib/clientTabs";

/**
 * URL-driven, so a tab is linkable and survives a reload. Cycle is absent, not
 * disabled, when the client does not track it.
 */
export function ClientTabs({
  clientId,
  current,
  cycleTracking,
}: {
  clientId: string;
  current: ClientTab;
  cycleTracking: boolean;
}) {
  const t = useTranslations("tabs");

  const shown = CLIENT_TABS.filter((tab) => tab !== "cycle" || cycleTracking);

  return (
    <nav className="flex flex-wrap gap-1">
      {shown.map((tab) => {
        const active = tab === current;
        return (
          <Link
            key={tab}
            href={`/clients/${clientId}?onglet=${tab}`}
            aria-current={active ? "page" : undefined}
            className={`h-8 rounded-rp px-3 text-[12px] font-semibold leading-8 transition-colors ${
              active
                ? "sel text-[var(--ink)]"
                : "text-[var(--ink2)] hover:bg-[var(--glass)]"
            }`}
          >
            {t(tab)}
          </Link>
        );
      })}
    </nav>
  );
}
