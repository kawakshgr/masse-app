"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Card, CardTitle, Secondary } from "./ui";

/*
 * Masse installed on an iPhone before 1 Oct 2026 keeps the translucent status
 * bar it was installed with, and with it iOS 26's grey band at the bottom
 * (WebKit 301108) — iOS reads the setting only at install. This card offers
 * the reinstall that gives the whole screen back. It shows only in such an
 * app (installed, a top inset present), and not for a week after "later".
 */

const LATER_KEY = "masse:reinstall:later";
const LATER_MS = 7 * 24 * 3600 * 1000;

const listeners = new Set<() => void>();
function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

let measured: boolean | null = null;

function oldInstall(): boolean {
  if (measured !== null) return measured;
  try {
    const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!standalone || !document.body) return false;
    if (Date.now() - Number(window.localStorage.getItem(LATER_KEY) ?? 0) < LATER_MS) return (measured = false);
    // The opaque bar leaves no top inset; the old translucent one does.
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;top:0;left:0;width:1px;height:env(safe-area-inset-top);visibility:hidden";
    document.body.appendChild(probe);
    const inset = probe.offsetHeight;
    probe.remove();
    measured = inset > 0;
  } catch {
    measured = false;
  }
  return measured;
}

export function ReinstallPrompt() {
  const t = useTranslations("reinstall");
  const show = useSyncExternalStore(subscribe, oldInstall, () => false);
  if (!show) return null;

  function later() {
    try {
      window.localStorage.setItem(LATER_KEY, String(Date.now()));
    } catch {
      // Not remembered; hidden for this visit all the same.
    }
    measured = false;
    listeners.forEach((listener) => listener());
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- the app's own icon */}
        <img src="/icon-192.png?v=2" alt="" className="size-11 rounded-r2" />
        <CardTitle>{t("title")}</CardTitle>
      </div>
      <p className="text-[15px] leading-[1.45] text-[var(--ink2)]">{t("lede")}</p>
      <ol className="space-y-2 text-[15px]">
        {(["step1", "step2", "step3"] as const).map((key, index) => (
          <li key={key} className="flex items-center gap-3">
            <span className="tnum flex size-7 shrink-0 items-center justify-center rounded-rp bg-[var(--glass2)] text-[13px] font-bold text-[var(--a1)]">
              {index + 1}
            </span>
            <span>{t(key)}</span>
          </li>
        ))}
        <li className="pt-1 text-[13px] leading-[1.45] text-[var(--ink3)]">{t("after")}</li>
      </ol>
      <Secondary onClick={later} className="w-full">
        {t("later")}
      </Secondary>
    </Card>
  );
}
