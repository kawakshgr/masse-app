"use client";

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";

type WidthStore = {
  subscribe: (onChange: () => void) => () => void;
  get: () => number;
  getServer: () => number;
  set: (value: number) => void;
};

/**
 * The divider position is a per-viewer convenience, so localStorage is the right
 * home for it. Read through useSyncExternalStore: the server and the hydrating
 * client both see `initial`, and React re-reads once hydration is done.
 */
function makeWidthStore(
  key: string,
  initial: number,
  min: number,
  max: number,
): WidthStore {
  const listeners = new Set<() => void>();
  let cached: number | null = null;

  const clamp = (value: number) => Math.min(max, Math.max(min, value));

  return {
    subscribe(onChange) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    get() {
      if (cached !== null) return cached;
      try {
        const raw = window.localStorage.getItem(key);
        const value = raw === null ? initial : Number(raw);
        cached = Number.isFinite(value) ? clamp(value) : initial;
      } catch {
        // Private window or blocked storage: the default width is fine.
        cached = initial;
      }
      return cached;
    },
    getServer() {
      return initial;
    },
    set(value) {
      const next = clamp(value);
      if (next === cached) return;
      cached = next;
      try {
        window.localStorage.setItem(key, String(next));
      } catch {
        // The divider still works for this session.
      }
      listeners.forEach((listener) => listener());
    },
  };
}

export function SplitPane({
  storageKey,
  initial = 280,
  min = 200,
  max = 520,
  list,
  detail,
}: {
  storageKey: string;
  initial?: number;
  min?: number;
  max?: number;
  list: React.ReactNode;
  detail: React.ReactNode;
}) {
  const store = useMemo(
    () => makeWidthStore(storageKey, initial, min, max),
    [storageKey, initial, min, max],
  );

  const width = useSyncExternalStore(store.subscribe, store.get, store.getServer);

  const paneRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const live = useRef(width);

  const nudge = useCallback(
    (delta: number) => store.set(live.current + delta),
    [store],
  );

  useEffect(() => {
    live.current = width;
  }, [width]);

  useEffect(() => {
    function onMove(event: PointerEvent) {
      if (!dragging.current || !paneRef.current) return;
      // The new width is the pointer's distance from the pane's own left edge,
      // measured rather than assumed: this component does not know where on the
      // page it has been placed.
      const left = paneRef.current.getBoundingClientRect().left;
      const next = Math.min(max, Math.max(min, event.clientX - left));
      // Move the DOM directly while dragging — no re-render per pointer event.
      live.current = next;
      paneRef.current.style.width = `${next}px`;
    }

    function onUp() {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      store.set(live.current);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [min, max, store]);

  return (
    <div className="flex min-h-0 flex-1">
      <div
        ref={paneRef}
        style={{ width }}
        className="min-w-0 shrink-0 overflow-y-auto"
      >
        {list}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={width}
        aria-valuemin={min}
        aria-valuemax={max}
        tabIndex={0}
        onPointerDown={(event) => {
          // Without this the drag selects the text in both panes.
          event.preventDefault();
          dragging.current = true;
          document.body.style.cursor = "col-resize";
        }}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 32 : 8;
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            nudge(-step);
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            nudge(step);
          }
        }}
        className="w-2 shrink-0 cursor-col-resize touch-none bg-[var(--hair)] transition-colors hover:bg-[var(--glass2)]"
      />

      <div className="min-w-0 flex-1 overflow-y-auto">{detail}</div>
    </div>
  );
}
