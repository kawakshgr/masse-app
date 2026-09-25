"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Card, CardTitle, Cta, Secondary } from "./ui";

/*
 * Offers to put Masse on the home screen, so nobody has to find it in a menu.
 *
 * Android's browsers can install on request: the button hands over to the
 * browser's own sheet. Safari cannot be asked, so on an iPhone the card shows
 * the three taps instead. Nothing shows once installed, or for two weeks after
 * "later".
 */

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __masseInstall?: InstallEvent;
  }
}

type Mode = "hidden" | "prompt" | "ios" | "manual";

const LATER_KEY = "masse:install:later";
const LATER_MS = 14 * 24 * 3600 * 1000;

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("masse:installable", onChange);
  window.addEventListener("appinstalled", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("masse:installable", onChange);
    window.removeEventListener("appinstalled", onChange);
  };
}

function mode(): Mode {
  try {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return "hidden";

    const later = Number(window.localStorage.getItem(LATER_KEY) ?? 0);
    if (Date.now() - later < LATER_MS) return "hidden";
  } catch {
    // Storage blocked: offer it; "later" simply will not be remembered.
  }

  if (window.__masseInstall) return "prompt";

  const ua = navigator.userAgent;
  const ios =
    /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (ios) return "ios";

  // Chrome on Android asks through the event above, which may simply not have
  // arrived yet — or never will, because it is already installed. Other
  // Android browsers never send it, so they get the menu steps.
  if (/Android/.test(ua) && !/Chrome\//.test(ua)) return "manual";
  if (/Android/.test(ua) && /SamsungBrowser|Firefox/.test(ua)) return "manual";
  return "hidden";
}

export function InstallPrompt() {
  const t = useTranslations("install");
  const current = useSyncExternalStore(subscribe, mode, () => "hidden" as Mode);

  if (current === "hidden") return null;

  function later() {
    try {
      window.localStorage.setItem(LATER_KEY, String(Date.now()));
    } catch {
      // Not remembered; hidden for this visit all the same.
    }
    window.__masseInstall = undefined;
    notify();
  }

  async function install() {
    const event = window.__masseInstall;
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    // One prompt per event, whatever she answered.
    window.__masseInstall = undefined;
    notify();
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- the app's own icon */}
        <img src="/icon-192.png?v=2" alt="" className="size-11 rounded-r2" />
        <CardTitle>{t("title")}</CardTitle>
      </div>
      <p className="text-[15px] leading-[1.45] text-[var(--ink2)]">{t("lede")}</p>

      {current === "ios" && (
        <ol className="space-y-2 text-[15px]">
          <Step n={1}>
            {t("iosShare")}
            <ShareGlyph />
          </Step>
          <Step n={2}>{t("iosAdd")}</Step>
          <Step n={3}>{t("iosConfirm")}</Step>
          <li className="pt-1 text-[13px] leading-[1.45] text-[var(--ink3)]">{t("iosSignIn")}</li>
        </ol>
      )}

      {current === "manual" && (
        <p className="text-[15px] leading-[1.45]">{t("manual")}</p>
      )}

      <div className="flex gap-2.5">
        {current === "prompt" && <Cta onClick={() => void install()}>{t("action")}</Cta>}
        <Secondary onClick={later} className={current === "prompt" ? "shrink-0 whitespace-nowrap" : "w-full"}>
          {t("later")}
        </Secondary>
      </div>
    </Card>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="tnum flex size-7 shrink-0 items-center justify-center rounded-rp bg-[var(--glass2)] text-[13px] font-bold text-[var(--a1)]">
        {n}
      </span>
      <span className="flex items-center gap-1.5">{children}</span>
    </li>
  );
}

/** Safari's share icon, drawn, so she recognises the button she is looking for. */
function ShareGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="size-[18px] text-[var(--a1)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M7 11H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}
