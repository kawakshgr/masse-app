"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const DURATION_KEY = "masse:rest:seconds";

/** A rest starting now, at her usual length. */
export function newRest(): { startedAt: number; endsAt: number } {
  const now = Date.now();
  return { startedAt: now, endsAt: now + restDuration() * 1000 };
}

/** Her last-settled rest length. The programme has no rest column. */
function restDuration(): number {
  try {
    const stored = Number(window.localStorage.getItem(DURATION_KEY));
    return stored > 0 ? stored : 120;
  } catch {
    return 120;
  }
}

function remember(seconds: number) {
  try {
    window.localStorage.setItem(DURATION_KEY, String(Math.min(Math.max(seconds, 15), 600)));
  } catch {
    // Not remembered; this rest still runs.
  }
}

/**
 * The rest between two sets — RestBar in TrainView.swift. Two timestamps and a
 * clock rather than a counter, so a tab put in the background comes back on
 * time. The browser cannot put it on the lock screen; the iPhone app can.
 */
export function RestBar({
  rest,
  onChange,
}: {
  rest: { startedAt: number; endsAt: number };
  onChange: (next: { startedAt: number; endsAt: number } | null) => void;
}) {
  const t = useTranslations("log");
  const tCommon = useTranslations("common");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const left = Math.max(0, Math.ceil((rest.endsAt - now) / 1000));
  const done = left === 0;

  useEffect(() => {
    if (done) navigator.vibrate?.(200);
  }, [done]);

  function adjust(seconds: number) {
    const endsAt = Math.max(rest.endsAt + seconds * 1000, Date.now() + 1000);
    remember(Math.round((endsAt - rest.startedAt) / 1000));
    onChange({ ...rest, endsAt });
  }

  const chip =
    "flex h-11 shrink-0 items-center rounded-rp bg-[var(--glass2)] px-3 text-[15px] font-semibold text-[var(--ink)]";

  return (
    <div
      role="timer"
      aria-live="off"
      className="chrome fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+70px)] z-20 mx-auto flex max-w-[528px] items-center gap-2.5 rounded-r3 px-4 py-3"
      style={done ? { borderColor: "var(--a1)" } : undefined}
    >
      <div className="min-w-0 flex-1">
        <p
          className={`text-[11px] font-bold uppercase tracking-[.14em] ${
            done ? "text-[var(--a1)]" : "text-[var(--ink2)]"
          }`}
        >
          {t(done ? "ready" : "rest")}
        </p>
        <p className="tnum font-display text-[26px] font-extrabold leading-tight tracking-[-.03em]">
          {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
        </p>
      </div>
      {!done && (
        <>
          <button type="button" onClick={() => adjust(-15)} className={chip}>
            {t("restLess")}
          </button>
          <button type="button" onClick={() => adjust(15)} className={chip}>
            {t("restMore")}
          </button>
        </>
      )}
      <button type="button" onClick={() => onChange(null)} className={chip}>
        {done ? tCommon("close") : t("skipRest")}
      </button>
    </div>
  );
}
