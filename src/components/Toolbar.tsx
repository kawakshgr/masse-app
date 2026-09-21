"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

/**
 * The search field is the ⌘K surface. It filters the roster today; running
 * commands from it comes with the palette.
 */
export function Toolbar({
  query,
  onQueryChange,
  action,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  action?: React.ReactNode;
}) {
  const t = useTranslations("toolbar");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <input
          ref={input}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t("search")}
          aria-label={t("search")}
          className="glass h-8 w-[260px] rounded-r2 pl-3 pr-10 text-[12px] text-[var(--ink)] placeholder:text-[var(--ink3)]"
        />
        <span
          aria-hidden
          className="tnum pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-r1 border border-[var(--edge)] px-1.5 py-px text-[10px] text-[var(--ink3)]"
        >
          ⌘K
        </span>
      </div>
      {action}
    </div>
  );
}
