"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Deferred features keep their nav entry, rendered inert. One list drives it —
 * not a condition scattered across three components.
 */
const SOON = ["inbox"] as const;

export function TabBar() {
  const t = useTranslations("shell");
  const tToolbar = useTranslations("toolbar");
  const pathname = usePathname();
  const [revealed, setRevealed] = useState(false);

  const items = [
    { key: "clients", href: "/clients", label: t("clients"), chord: "⌘1" },
    { key: "programmes", href: "/programmes", label: t("programmes"), chord: "⌘2" },
    { key: "inbox", href: "/inbox", label: t("messaging"), chord: "⌘3" },
  ];

  return (
    <div className="border-b border-[var(--hair)]">
      <div className="flex items-center gap-2 px-4 py-2">
        <nav className="flex items-center gap-1">
          {items.map((item) => {
            const isSoon = (SOON as readonly string[]).includes(item.key);
            const active = !isSoon && pathname.startsWith(item.href);

            if (isSoon) {
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-disabled="true"
                  onClick={() => setRevealed((v) => !v)}
                  className="flex h-8 items-center gap-2 rounded-r2 px-3 text-[12px] font-semibold text-[var(--ink3)]"
                >
                  {item.label}
                  <span className="rounded-r1 border border-[var(--edge)] px-1.5 py-px text-[9px] uppercase tracking-wide">
                    {t("soon")}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-8 items-center gap-2 rounded-r2 px-3 text-[12px] font-semibold transition-colors ${
                  active
                    ? "border border-[var(--edge)] bg-[var(--glass2)] text-[var(--ink)]"
                    : "text-[var(--ink2)] hover:bg-[var(--glass)]"
                }`}
              >
                {item.label}
                <span className="tnum text-[10px] text-[var(--ink3)]">
                  {item.chord}
                </span>
              </Link>
            );
          })}
        </nav>

        <p className="ml-auto hidden truncate pl-4 text-[11px] text-[var(--ink3)] lg:block">
          {tToolbar("addClientHint")}
        </p>
      </div>

      {revealed && (
        <p className="px-4 pb-2 text-[11px] text-[var(--ink3)]">
          {t("messagingSoon")}
        </p>
      )}
    </div>
  );
}
