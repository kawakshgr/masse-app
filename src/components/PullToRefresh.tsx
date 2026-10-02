"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

/** How far the finger travels, damped, before letting go refreshes. */
const THRESHOLD = 70;
const MAX_PULL = 110;
/** Back in the app after this long in the background, the data is read again. */
const STALE_MS = 5 * 60 * 1000;

type State = { pull: number; armed: boolean } | null;

/**
 * Fresh data without reloading the app (2 Oct 2026). An installed app keeps
 * its page in memory: reopened, it shows the week as it was, not the one the
 * coach has just sent, and À traiter misses the check-in just filed.
 *
 * - On a touch screen, pulling down from the top of whatever scrolls reads
 *   the page again (router.refresh: the server's data, the client's state —
 *   a set being typed, the held queue — left as it is). Never inside a sheet
 *   or while typing. A computer has F5.
 * - Everywhere, coming back after five minutes away does the same, unasked.
 */
export function PullToRefresh() {
  const t = useTranslations("refresh");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<State>(null);
  const [offline, setOffline] = useState(false);
  const start = useRef<{ y: number; x: number } | null>(null);
  const live = useRef<State>(null);

  // Back from the background: refresh when the page has been away a while.
  useEffect(() => {
    let hiddenAt = 0;
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt && Date.now() - hiddenAt > STALE_MS && navigator.onLine && !busy()) {
        startTransition(() => router.refresh());
      }
      hiddenAt = 0;
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [router]);

  // The pull, on touch screens only.
  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    function set(next: State) {
      live.current = next;
      setState(next);
    }

    function onStart(event: TouchEvent) {
      start.current = null;
      if (event.touches.length !== 1 || busy()) return;
      const target = event.target as Element | null;
      if (!target || target.closest("[role=dialog], input, textarea, select, [data-no-pull]")) return;
      if (!atTop(target)) return;
      start.current = { y: event.touches[0].clientY, x: event.touches[0].clientX };
    }

    function onMove(event: TouchEvent) {
      if (!start.current) return;
      const dy = event.touches[0].clientY - start.current.y;
      const dx = event.touches[0].clientX - start.current.x;
      // Upwards, or sideways first (a chart, a slider): not a pull.
      if (dy <= 0 || (!live.current && Math.abs(dx) > dy)) {
        start.current = null;
        if (live.current) set(null);
        return;
      }
      const pull = Math.min(MAX_PULL, dy * 0.5);
      set({ pull, armed: pull >= THRESHOLD });
    }

    function onEnd() {
      const was = live.current;
      start.current = null;
      set(null);
      if (!was?.armed) return;
      if (!navigator.onLine) {
        setOffline(true);
        window.setTimeout(() => setOffline(false), 1800);
        return;
      }
      startTransition(() => router.refresh());
    }

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, [router]);

  const shown = pending || offline || state !== null;
  const pull = pending || offline ? THRESHOLD : (state?.pull ?? 0);
  const label = offline ? t("offline") : pending ? t("loading") : state?.armed ? t("release") : t("pull");

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center print:hidden"
      style={{
        transform: `translateY(calc(env(safe-area-inset-top) + ${pull - 44}px))`,
        opacity: shown ? Math.min(1, pull / THRESHOLD) : 0,
        transition: state ? "none" : "transform .25s ease, opacity .25s ease",
      }}
    >
      <span className="sr-only">{shown ? label : ""}</span>
      {offline ? (
        <span className="glass rounded-rp px-3.5 py-2 text-[12.5px] font-semibold text-[var(--ink)]">{label}</span>
      ) : (
        <span className="glass flex size-10 items-center justify-center rounded-full text-[var(--accent)]">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className={pending ? "animate-spin" : undefined}
            style={pending ? undefined : { transform: `rotate(${(pull / THRESHOLD) * 270}deg)` }}
          >
            <path d="M20 12a8 8 0 1 1-2.34-5.66" />
            <path d="M20 4v4.5h-4.5" />
          </svg>
        </span>
      )}
    </div>
  );
}

/** A sheet is open or something is being typed: leave the page alone. */
function busy() {
  const active = document.activeElement;
  if (active && active.matches("input, textarea, select, [contenteditable=true]")) return true;
  return Boolean(document.querySelector("[role=dialog][aria-modal=true]"));
}

/** Every scroller between the finger and the document is at its top. */
function atTop(from: Element) {
  for (let node: Element | null = from; node && node !== document.body; node = node.parentElement) {
    const style = getComputedStyle(node);
    const scrolls = /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight;
    if (scrolls && node.scrollTop > 0) return false;
  }
  return (document.scrollingElement?.scrollTop ?? 0) <= 0;
}
