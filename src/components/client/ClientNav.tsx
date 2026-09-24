"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

/*
 * The client's tab bar, the iPhone's five tabs in the iPhone's order. Coach
 * keeps its place, greyed: a deferred feature that leaves the nav makes the
 * product's shape a lie. Cycle only exists for a client who asked for it.
 */

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ICONS: Record<string, React.ReactNode> = {
  today: <path {...stroke} d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1z" />,
  train: (
    <g {...stroke}>
      <path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" />
    </g>
  ),
  fuel: (
    <g {...stroke}>
      <path d="m12 3 3.5 2v4L12 11 8.5 9V5z" />
      <path d="m7.5 12 3.5 2v4l-3.5 2L4 18v-4zM16.5 12l3.5 2v4l-3.5 2-3.5-2v-4z" />
    </g>
  ),
  cycle: <path {...stroke} d="m12 3 7.8 4.5v9L12 21l-7.8-4.5v-9z" />,
  coach: <path {...stroke} d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4.5 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />,
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
      className="topbar fixed inset-x-0 bottom-0 z-20 border-t border-[var(--hair)] pb-[env(safe-area-inset-bottom)]"
      style={{ borderBottom: 0 }}
    >
      <ul className="mx-auto flex max-w-[560px]">
        {items.map((item) => {
          // Settings open from Today, so Today stays lit while she is in them.
          const active =
            pathname.startsWith(item.href) ||
            (item.key === "today" && pathname.startsWith("/reglages"));
          const tone = item.soon
            ? "text-[var(--ink3)]"
            : active
              ? "text-[var(--a1)]"
              : "text-[var(--ink2)]";
          return (
            <li key={item.key} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-[58px] flex-col items-center justify-center gap-1 text-[10.5px] font-semibold ${tone}`}
              >
                <svg viewBox="0 0 24 24" aria-hidden className="size-[22px]">
                  {ICONS[item.key]}
                </svg>
                {t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
