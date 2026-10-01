"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CLIENT_TABS, type ClientTab } from "@/lib/clientTabs";
import { SubNav } from "@/components/SubNav";
import { Icon } from "@/components/Icon";
import { TabSkeleton } from "@/components/Skeleton";

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
 *
 * A tab tapped is lit at once and its body turns to a skeleton while the
 * server writes it (1 Oct 2026): the tabs used to sit still for half a
 * second, then jump. The body is passed in as children for that reason.
 */
export function ClientTabs({
  clientId,
  current,
  cycleTracking,
  children,
}: {
  clientId: string;
  current: ClientTab;
  cycleTracking: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("tabs");
  const router = useRouter();
  const [target, setTarget] = useState<ClientTab | null>(null);
  const [pending, startTransition] = useTransition();
  const shown = pending && target ? target : current;
  const active = useRef<HTMLAnchorElement>(null);
  const tabs = CLIENT_TABS.filter((tab) => tab !== "cycle" || cycleTracking);

  useEffect(() => {
    active.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [shown]);

  // A plain click only: a new tab or window keeps the browser's own way.
  function pick(tab: ClientTab, href: string, event: React.MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    if (tab === current && !pending) return;
    setTarget(tab);
    startTransition(() => router.push(href, { scroll: false }));
  }

  return (
    <>
      <div className="max-md:hidden">
        <SubNav
          items={tabs.map((tab) => ({
            key: tab,
            href: `/clients/${clientId}?onglet=${tab}`,
            label: t(tab),
            active: tab === shown,
          }))}
          onPick={(item, event) => pick(item.key as ClientTab, item.href, event)}
        />
      </div>

      <nav aria-label={t("overview")} className="-mx-5 overflow-x-auto px-5 pb-1 md:hidden [scrollbar-width:none]">
        <ul className="flex w-max gap-2">
          {tabs.map((tab) => {
            const on = tab === shown;
            const href = `/clients/${clientId}?onglet=${tab}`;
            return (
              <li key={tab}>
                <Link
                  ref={on ? active : undefined}
                  href={href}
                  onClick={(event) => pick(tab, href, event)}
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

      {pending ? <TabSkeleton /> : children}
    </>
  );
}
