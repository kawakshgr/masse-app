"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import {
  getResolvedTheme,
  getServerResolvedTheme,
  subscribeTheme,
  toggleTheme,
  watchSystemTheme,
} from "@/lib/theme";

/* Two glyphs, drawn rather than typed: an emoji sun would arrive in whatever
   colour the platform feels like, and these have to take the ink around them. */

function Sun() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-[13px]">
      <circle cx="12" cy="12" r="4.4" fill="currentColor" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <line
          key={angle}
          x1="12"
          y1="2.6"
          x2="12"
          y2="5.4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${angle} 12 12)`}
        />
      ))}
    </svg>
  );
}

function Moon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-[13px]">
      <path
        d="M20 14.2A8.4 8.4 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * One switch, two states. "Auto" is not a third position: the app follows the
 * system until she touches this, and after that the choice is hers and sticks.
 */
export function ThemeToggle() {
  const t = useTranslations("theme");
  const resolved = useSyncExternalStore(
    subscribeTheme,
    getResolvedTheme,
    getServerResolvedTheme,
  );
  const dark = resolved === "dark";

  useEffect(() => watchSystemTheme(), []);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={t("label")}
      title={dark ? t("toLight") : t("toDark")}
      onClick={toggleTheme}
      className="glass2 relative flex h-7 w-[52px] shrink-0 items-center rounded-rp p-0.5"
      style={{ boxShadow: "var(--spec)" }}
    >
      {/* The knob rides above the glyphs, so the active one reads on the
          gradient and the other stays quietly on the track. */}
      <span
        aria-hidden
        className="cta absolute top-0.5 left-0.5 size-6 rounded-rp transition-transform duration-300 ease-[cubic-bezier(.5,1.6,.4,1)] motion-reduce:transition-none"
        style={{ transform: dark ? "translateX(24px)" : "none" }}
      />
      <span
        aria-hidden
        className={`relative z-10 flex size-6 items-center justify-center transition-colors ${
          dark ? "text-[var(--ink3)]" : "text-[var(--onA)]"
        }`}
      >
        <Sun />
      </span>
      <span
        aria-hidden
        className={`relative z-10 flex size-6 items-center justify-center transition-colors ${
          dark ? "text-[var(--onA)]" : "text-[var(--ink3)]"
        }`}
      >
        <Moon />
      </span>
    </button>
  );
}
