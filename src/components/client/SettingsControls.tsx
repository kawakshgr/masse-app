"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { setLocale, signOut } from "@/app/(client)/actions";
import { getServerTheme, getTheme, setTheme, subscribeTheme, type ThemeChoice } from "@/lib/theme";
import { clearSymptomNotes } from "./CycleCards";
import { Choice, Secondary } from "./ui";

/** Auto, light, dark — the same three the iPhone offers, under the same words. */
export function AppearanceChoice() {
  const t = useTranslations("theme");
  const choice = useSyncExternalStore(subscribeTheme, getTheme, getServerTheme);
  return (
    <div className="flex gap-1.5">
      {(["auto", "light", "dark"] as ThemeChoice[]).map((option) => (
        <Choice key={option} selected={choice === option} onClick={() => setTheme(option)}>
          {t(option)}
        </Choice>
      ))}
    </div>
  );
}

/**
 * The web has no system setting to defer to, unlike iOS, so the choice is
 * made here — and kept in a cookie on this device.
 */
export function LanguageChoice() {
  const t = useTranslations("settings");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  return (
    <div className={`flex gap-1.5 ${pending ? "opacity-60" : ""}`}>
      {(["fr", "en"] as const).map((option) => (
        <Choice
          key={option}
          selected={locale === option}
          onClick={() => startTransition(() => setLocale(option))}
        >
          {t(option)}
        </Choice>
      ))}
    </div>
  );
}

export function ClearNotes() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [state, setState] = useState<"idle" | "confirming" | "cleared">("idle");

  if (state === "cleared") {
    return <p className="text-[13px] text-[var(--a1)]">{t("cleared")}</p>;
  }
  if (state === "confirming") {
    return (
      <div className="space-y-2.5 rounded-r2 border border-[var(--a3)] p-3">
        <p className="text-[13px] leading-[1.45] text-[var(--ink2)]">{t("clearConfirm")}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              clearSymptomNotes();
              setState("cleared");
            }}
            className="h-11 rounded-rp border border-[var(--a3)] px-4 text-[15px] font-semibold text-[var(--a3)]"
          >
            {t("clearDo")}
          </button>
          <button
            type="button"
            onClick={() => setState("idle")}
            className="h-11 rounded-rp px-4 text-[15px] text-[var(--ink2)]"
          >
            {tCommon("cancel")}
          </button>
        </div>
      </div>
    );
  }
  return <Secondary onClick={() => setState("confirming")}>{t("clearNotes")}</Secondary>;
}

export function SignOutButton() {
  const t = useTranslations("settings");
  const [pending, startTransition] = useTransition();
  return (
    <Secondary disabled={pending} onClick={() => startTransition(() => signOut())}>
      {t("signOut")}
    </Secondary>
  );
}
