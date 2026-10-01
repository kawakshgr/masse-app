"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { CLIENT_TABS, type ClientTab } from "@/lib/clientTabs";
import { SubNav } from "@/components/SubNav";
import { Icon } from "@/components/Icon";

const TAB_ICONS: Record<ClientTab, string> = {
  overview: "home",
  history: "chart",
  checkins: "checkIns",
  nutrition: "foods",
  cycle: "cycle",
  steps: "steps",
  file: "account",
};

/**
 * URL-driven, so a tab is linkable and survives a reload. Cycle is absent, not
 * disabled, when the client does not track it. On a phone the seven capsules
 * wrapped to three rows; there they are one row of icon tiles that scrolls
 * sideways and opens on the current tab (1 Oct 2026).
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
  const active = useRef<HTMLAnchorElement>(null);
  const tabs = CLIENT_TABS.filter((tab) => tab !== "cycle" || cycleTracking);

  useEffect(() => {
    active.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [current]);

  return (
    <>
      <div className="max-md:hidden">
        <SubNav
          items={tabs.map((tab) => ({
            key: tab,
            href: `/clients/${clientId}?onglet=${tab}`,
            label: t(tab),
            active: tab === current,
          }))}
        />
      </div>

      <nav aria-label={t("overview")} className="-mx-5 overflow-x-auto px-5 pb-1 md:hidden [scrollbar-width:none]">
        <ul className="flex w-max gap-2">
          {tabs.map((tab) => {
            const on = tab === current;
            return (
              <li key={tab}>
                <Link
                  ref={on ? active : undefined}
                  href={`/clients/${clientId}?onglet=${tab}`}
                  aria-current={on ? "page" : undefined}
                  className={`flex h-[78px] w-[86px] flex-col items-center justify-center gap-2 rounded-r3 border text-center ${
                    on
                      ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_18%,var(--deep))] text-[var(--ink)]"
                      : "glass border-[var(--edge)] text-[var(--ink2)]"
                  }`}
                >
                  <span className={on ? "text-[var(--accent)]" : ""}>
                    <Icon name={TAB_ICONS[tab]} size={26} />
                  </span>
                  <span className="max-w-full truncate px-1 text-[10px] font-bold uppercase tracking-[.08em]">
                    {t(tab)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
