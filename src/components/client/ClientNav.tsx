"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";

/*
 * The client's tab bar, the iPhone's five tabs in the iPhone's order, as the
 * coach's top bar is: one floating glass capsule, icons, and the current tab
 * opened out to its name in capitals. Coach keeps its place, greyed: a
 * deferred feature that leaves the nav makes the product's shape a lie.
 * Cycle only exists for a client who asked for it.
 */

const ICON: Record<string, string> = {
  today: "home",
  train: "programmes",
  fuel: "foods",
  cycle: "cycle",
  coach: "inbox",
};

export function ClientNav({ cycleTracking }: { cycleTracking: boolean }) {
  const t = useTranslations("clientNav");
  const pathname = usePathname();

  const items = [
    { key: "today", href: "/aujourdhui" },
    { key: "train", href: "/seance" },
    { key: "fuel", href: "/nutrition" },
    ...(cycleTracking ? [{ key: "cycle", href: "/cycle" }] : []),
    { key: "coach", href: "/coach", soon: true },
  ];

  return (
    <nav
      aria-label="Masse"
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+10px)] z-20 mx-auto max-w-[520px]"
    >
      <ul className="glass lift flex h-[62px] items-center justify-between gap-1 rounded-rp px-2">
        {items.map((item) => {
          // Settings open from Today, so Today stays lit while she is in them.
          const active =
            !item.soon &&
            (pathname.startsWith(item.href) ||
              (item.key === "today" && pathname.startsWith("/reglages")));

          return (
            <li key={item.key} className={active ? "shrink-0" : "flex flex-1 justify-center"}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={t(item.key)}
                className={
                  active
                    ? "sel flex h-12 items-center gap-2 rounded-rp border pl-1.5 pr-4 text-[var(--ink)]"
                    : `flex size-12 items-center justify-center rounded-full ${
                        item.soon ? "text-[var(--ink3)]" : "text-[var(--ink2)]"
                      }`
                }
                style={active ? { boxShadow: "var(--spec)" } : undefined}
              >
                {active ? (
                  <>
                    <span className="cta flex size-9 items-center justify-center rounded-full text-[var(--onA)]">
                      <Icon name={ICON[item.key]} size={19} />
                    </span>
                    <span className="text-[11.5px] font-bold uppercase tracking-[.1em]">
                      {t(item.key)}
                    </span>
                  </>
                ) : (
                  <Icon name={ICON[item.key]} size={24} />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
