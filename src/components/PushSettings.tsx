"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { removePushSubscription, savePushSubscription, sendTestPush } from "@/app/push-actions";

type State = "loading" | "unsupported" | "install" | "denied" | "off" | "on" | "notReady";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** The VAPID key, as the bytes the browser wants. */
function keyBytes(base64: string): Uint8Array {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function standalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Notifications on this device, for clients and coaches alike (1 Oct 2026).
 * An iPhone only lets an app installed on the home screen ask, so outside
 * it the card says how to install instead of offering a button that fails.
 */
export function PushSettings({ coach = false }: { coach?: boolean }) {
  const t = useTranslations("pushSettings");
  const locale = useLocale();
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      let next: State;
      if (!KEY) next = "notReady";
      else if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
        next = ios && !standalone() ? "install" : "unsupported";
      } else if (Notification.permission === "denied") next = "denied";
      else {
        const registration = await navigator.serviceWorker.getRegistration();
        const existing = await registration?.pushManager.getSubscription();
        next = existing ? "on" : "off";
      }
      if (alive) setState(next);
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function enable() {
    setBusy(true);
    setNote(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(KEY) as BufferSource,
      });
      const json = subscription.toJSON();
      const { ok } = await savePushSubscription({
        endpoint: subscription.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        locale,
      });
      setState(ok ? "on" : "off");
      if (!ok) setNote(t("failed"));
    } catch {
      setNote(t("failed"));
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    const { sent } = await sendTestPush();
    setNote(sent > 0 ? t("testSent") : t("testNone"));
    setBusy(false);
  }

  const button =
    "h-12 w-full rounded-r2 text-[14px] font-semibold disabled:opacity-60";

  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-[1.5] text-[var(--ink2)]">{t(coach ? "ledeCoach" : "lede")}</p>

      {state === "loading" && <p className="text-[13px] text-[var(--ink3)]">…</p>}
      {state === "notReady" && <p className="text-[13px] text-[var(--ink3)]">{t("notReady")}</p>}
      {state === "unsupported" && <p className="text-[13px] text-[var(--ink3)]">{t("unsupported")}</p>}
      {state === "install" && <p className="text-[13px] leading-[1.5] text-[var(--ink2)]">{t("install")}</p>}
      {state === "denied" && <p className="text-[13px] leading-[1.5] text-[var(--a3)]">{t("denied")}</p>}

      {state === "off" && (
        <button type="button" disabled={busy} onClick={enable} className={`cta ${button} text-[var(--onA)]`}>
          {t("enable")}
        </button>
      )}

      {state === "on" && (
        <>
          <p className="text-[13px] font-semibold text-[var(--accent-soft)]">✓ {t("on")}</p>
          <button type="button" disabled={busy} onClick={test} className={`glass2 ${button} border border-[var(--edge)]`}>
            {t("test")}
          </button>
          <button type="button" disabled={busy} onClick={disable} className={`${button} text-[var(--ink3)]`}>
            {t("disable")}
          </button>
        </>
      )}

      {note && <p className="text-[12.5px] text-[var(--ink2)]">{note}</p>}
    </div>
  );
}
