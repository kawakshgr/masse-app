"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  deleteMyAccount,
  giveHealthConsent,
  setLocale,
  signOut,
  withdrawHealthConsent,
} from "@/app/(client)/actions";
import { getServerTheme, getTheme, setTheme, subscribeTheme, type ThemeChoice } from "@/lib/theme";
import { clearSymptomNotes } from "./CycleCards";
import { Choice, Secondary, fieldClass } from "./ui";

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

/**
 * Consent to health data: its state, and the way to withdraw it — or give it
 * again. Withdrawing says what goes before anything does.
 */
export function HealthConsent({ givenAt }: { givenAt: string | null }) {
  const t = useTranslations("myData");
  const tCommon = useTranslations("common");
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!givenAt) {
    return (
      <div className="space-y-2.5">
        <p className="text-[13px] leading-[1.45] text-[var(--ink2)]">{t("consentNone")}</p>
        <Secondary disabled={pending} onClick={() => startTransition(() => giveHealthConsent())}>
          {t("consentGive")}
        </Secondary>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <p className="text-[13px] leading-[1.45] text-[var(--ink2)]">
        {t("consentGiven", { date: new Date(givenAt).toLocaleDateString("fr-FR") })}
      </p>
      {confirming ? (
        <div className="space-y-2.5 rounded-r2 border border-[var(--a3)] p-3">
          <p className="text-[13px] leading-[1.45] text-[var(--ink2)]">{t("consentWithdrawConfirm")}</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => withdrawHealthConsent())}
              className="h-11 rounded-rp border border-[var(--a3)] px-4 text-[15px] font-semibold text-[var(--a3)]"
            >
              {t("consentWithdraw")}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="h-11 rounded-rp px-4 text-[15px] text-[var(--ink3)]"
            >
              {tCommon("cancel")}
            </button>
          </div>
        </div>
      ) : (
        <Secondary onClick={() => setConfirming(true)}>{t("consentWithdraw")}</Secondary>
      )}
    </div>
  );
}

/** Erases the account, after the word SUPPRIMER is typed. */
export function DeleteAccount() {
  const t = useTranslations("myData");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass2 h-[52px] w-full rounded-rp text-[15px] font-semibold text-[var(--a3)]"
      >
        {t("delete")}
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-r2 border border-[var(--a3)] p-3.5">
      <p className="text-[13px] leading-[1.5] text-[var(--ink2)]">{t("deleteBody")}</p>
      <label className="block space-y-1.5">
        <span className="text-[12px] font-bold uppercase tracking-[.12em] text-[var(--ink2)]">{t("deleteType")}</span>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className={fieldClass} />
      </label>
      {failed && <p className="text-[13px] text-[var(--a3)]">{t("deleteFailed")}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending || typed.trim().toUpperCase() !== "SUPPRIMER"}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteMyAccount(typed);
              if (result && !result.ok) setFailed(true);
            })
          }
          className="h-11 flex-1 rounded-rp border border-[var(--a3)] px-4 text-[15px] font-semibold text-[var(--a3)] disabled:opacity-40"
        >
          {t("deleteDo")}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-rp px-4 text-[15px] text-[var(--ink3)]">
          {tCommon("cancel")}
        </button>
      </div>
    </div>
  );
}
