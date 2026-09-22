"use client";

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
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t("search")}
          aria-label={t("search")}
          className="glass h-8 w-full rounded-r2 px-3 text-[12px] text-[var(--ink)] placeholder:text-[var(--ink3)]"
        />
      </div>
      {action}
    </div>
  );
}
