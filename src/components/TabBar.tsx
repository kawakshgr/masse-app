"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Deferred features keep their nav entry, rendered inert: greyed label, soon
 * badge, one line of copy on tap. Driven by this one list — never by a
 * condition scattered across the tab bar, a sidebar and a rail.
 */
// Messaging alone: a credible thread needs real time, read states, push and
// media upload — a month of work to end up worse than WhatsApp.
const SOON = ["inbox"] as const;

type SoonKey = (typeof SOON)[number];

export function TabBar() {
  const t = useTranslations("nav");
  const tSoon = useTranslations("soonCopy");
  const tShell = useTranslations("shell");
  const tToolbar = useTranslations("toolbar");
  const pathname = usePathname();
  const [revealed, setRevealed] = useState<SoonKey | null>(null);

  const items = [
    { key: "clients", href: "/clients", chord: "⌘1" },
    { key: "programmes", href: "/programmes", chord: "⌘2" },
    { key: "foods", href: "/aliments", chord: "⌘3" },
    { key: "inbox", href: "/inbox", chord: "⌘4" },
    { key: "billing", href: "/facturation", chord: "⌘5" },
    // Every coach has one: it holds her own company and her own exports.
    { key: "admin", href: "/admin", chord: "⌘6" },
  ];

  return (
    <div className="border-b border-[var(--hair)]">
      <div className="flex items-center gap-2 px-4 py-2">
        <nav className="flex flex-wrap items-center gap-1">
          {items.map((item) => {
            const isSoon = (SOON as readonly string[]).includes(item.key);
            const active = !isSoon && pathname.startsWith(item.href);

            if (isSoon) {
              const key = item.key as SoonKey;
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-disabled="true"
                  aria-expanded={revealed === key}
                  onClick={() => setRevealed((c) => (c === key ? null : key))}
                  className="flex h-8 items-center gap-2 rounded-r2 px-3.5 text-[14px] font-semibold text-[var(--ink3)]"
                >
                  {t(item.key)}
                  <span className="rounded-rp border border-[var(--edge)] bg-[var(--glass2)] px-2 py-px text-[10px] uppercase tracking-[.14em]">
                    {tShell("soon")}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-8 items-center gap-2 rounded-r2 px-3.5 text-[14px] font-semibold transition-colors ${
                  active
                    ? "sel border border-[var(--edge)] text-[var(--ink)]"
                    : "text-[var(--ink2)] hover:bg-[var(--glass)]"
                }`}
              >
                {t(item.key)}
                <span className="tnum text-[11px] text-[var(--ink3)]">
                  {item.chord}
                </span>
              </Link>
            );
          })}
        </nav>

        <p className="ml-auto hidden truncate pl-4 text-[12px] text-[var(--ink3)] xl:block">
          {tToolbar("addClientHint")}
        </p>
      </div>

      {revealed && (
        <p className="px-4 pb-2 text-[12px] leading-[1.5] text-[var(--ink3)]">
          {tSoon(revealed)}
        </p>
      )}
    </div>
  );
}
