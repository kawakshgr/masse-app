"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import {
  getServerTheme,
  getTheme,
  setTheme,
  subscribeTheme,
  watchSystemTheme,
  type ThemeChoice,
} from "@/lib/theme";

const CHOICES: ThemeChoice[] = ["auto", "light", "dark"];

export function ThemeToggle() {
  const t = useTranslations("theme");
  const choice = useSyncExternalStore(subscribeTheme, getTheme, getServerTheme);

  useEffect(() => watchSystemTheme(), []);

  return (
    <div
      role="group"
      aria-label={t("label")}
      className="glass2 flex h-8 shrink-0 items-center gap-0.5 rounded-rp p-0.5"
    >
      {CHOICES.map((value) => {
        const active = choice === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => setTheme(value)}
            className={`h-7 rounded-rp px-2.5 text-[11px] font-bold transition-colors ${
              active ? "sel text-[var(--ink)]" : "text-[var(--ink3)]"
            }`}
          >
            {t(value)}
          </button>
        );
      })}
    </div>
  );
}
