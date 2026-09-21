"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Deferred features keep their nav entry, rendered inert. One list drives it —
 * not a condition scattered across three components.
 */
const SOON = ["messaging"] as const;

type Item = { key: string; href: string; label: string };

export function Sidebar() {
  const t = useTranslations("shell");
  const pathname = usePathname();
  const [revealed, setRevealed] = useState<string | null>(null);

  const items: Item[] = [
    { key: "clients", href: "/clients", label: t("clients") },
    { key: "programmes", href: "/programmes", label: t("programmes") },
    { key: "messaging", href: "/messages", label: t("messaging") },
  ];

  return (
    <nav className="flex w-[168px] shrink-0 flex-col gap-1 border-r border-[var(--hair)] p-3">
      {items.map((item) => {
        const isSoon = (SOON as readonly string[]).includes(item.key);
        const active = !isSoon && pathname.startsWith(item.href);

        if (isSoon) {
          return (
            <div key={item.key}>
              <button
                type="button"
                aria-disabled="true"
                onClick={() =>
                  setRevealed((current) =>
                    current === item.key ? null : item.key,
                  )
                }
                className="flex h-9 w-full items-center justify-between rounded-r2 px-3 text-left text-[13px] font-medium text-[var(--ink3)]"
              >
                {item.label}
                <span className="rounded-r1 border border-[var(--edge)] px-1.5 py-0.5 text-[9px] uppercase tracking-wide">
                  {t("soon")}
                </span>
              </button>
              {revealed === item.key && (
                <p className="px-3 pt-1 pb-2 text-[11px] leading-snug text-[var(--ink3)]">
                  {t("messagingSoon")}
                </p>
              )}
            </div>
          );
        }

        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex h-9 items-center rounded-r2 px-3 text-[13px] font-medium transition-colors ${
              active
                ? "bg-[var(--glass2)] text-[var(--ink)]"
                : "text-[var(--ink2)] hover:bg-[var(--glass)]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
