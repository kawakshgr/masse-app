"use client";

import { useTranslations } from "next-intl";
import { CLIENT_TABS, type ClientTab } from "@/lib/clientTabs";
import { SubNav } from "@/components/SubNav";

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

  return (
    <SubNav
      items={CLIENT_TABS.filter((tab) => tab !== "cycle" || cycleTracking).map((tab) => ({
        key: tab,
        href: `/clients/${clientId}?onglet=${tab}`,
        label: t(tab),
        active: tab === current,
      }))}
    />
  );
}
