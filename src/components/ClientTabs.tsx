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
    <nav className="glass2 flex flex-wrap gap-0.5 self-start rounded-rp p-1" style={{ boxShadow: "var(--spec)" }}>
      {shown.map((tab) => {
        const active = tab === current;
        return (
          <Link
            key={tab}
            href={`/clients/${clientId}?onglet=${tab}`}
            aria-current={active ? "page" : undefined}
            className={`h-7 rounded-rp px-3 text-[13.5px] font-semibold leading-7 transition-colors ${
              active
                ? "sel text-[var(--ink)]"
                : "text-[var(--ink2)] hover:text-[var(--ink)]"
            }`}
            style={active ? { boxShadow: "var(--spec)" } : undefined}
          >
            {t(tab)}
          </Link>
        );
      })}
    </nav>
  );
}
