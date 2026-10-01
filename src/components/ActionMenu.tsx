"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const PHONE = "(max-width: 767.98px)";

const subscribeNever = () => () => {};

function subscribePhone(onChange: () => void) {
  const query = window.matchMedia(PHONE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * A page's secondary actions behind one button, so the title keeps its room.
 * On a computer, a dropdown under the button; on a phone, a sheet of big
 * tiles from the bottom, under the thumb (1 Oct 2026). Both go to the body:
 * a glass card's backdrop filter makes it a layer of its own, so a menu left
 * inside slid under the next card (the call banner's, over the steps tab).
 * The panel is hidden, not unmounted, when it closes: a server-action form
 * inside it must still be in the page when its submit button is pressed.
 */
export function ActionMenu({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const phone = useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE).matches, () => false);
  // Where the dropdown opens on a computer: under the button, right-aligned.
  const [at, setAt] = useState<{ top: number; right: number } | null>(null);
  const portalReady = useSyncExternalStore(subscribeNever, () => true, () => false);

  useEffect(() => {
    if (!open) return;
    const away = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!box.current?.contains(target) && !sheet.current?.contains(target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    // A pane scrolled or a window resized moves the button: the menu closes.
    const shut = () => setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", escape);
    document.addEventListener("scroll", shut, true);
    window.addEventListener("resize", shut);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", escape);
      document.removeEventListener("scroll", shut, true);
      window.removeEventListener("resize", shut);
    };
  }, [open]);

  // A click on an item closes the menu after the click has done its work.
  const closeAfter = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest("button, a")) window.setTimeout(() => setOpen(false), 0);
  };

  const panel = phone ? (
    createPortal(
      <div hidden={!open} className="fixed inset-0 z-[70]">
        <div aria-hidden className="absolute inset-0 bg-black/50" />
        <div
          ref={sheet}
          role="menu"
          aria-label={label}
          onClick={closeAfter}
          className="chrome lift absolute inset-x-3 bottom-[max(12px,calc(env(safe-area-inset-bottom)+8px-var(--app-gap,0px)))] rounded-r4 p-3"
        >
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <p className="text-[12px] font-bold uppercase tracking-[.14em] text-[var(--ink2)]">{label}</p>
            <button
              type="button"
              aria-label="×"
              onClick={() => setOpen(false)}
              className="glass2 flex size-10 items-center justify-center rounded-full text-[20px] leading-none text-[var(--ink2)]"
            >
              ×
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 [&>div:empty]:hidden [&>div:not(:empty)]:contents [&>form:not([data-wide])]:contents">{children}</div>
        </div>
      </div>,
      document.body,
    )
  ) : portalReady ? (
    createPortal(
      <div
        ref={sheet}
        role="menu"
        hidden={!open}
        onClick={closeAfter}
        className="chrome lift fixed z-[70] w-[260px] rounded-r3 p-1.5"
        style={at ? { top: at.top, right: at.right } : undefined}
      >
        {children}
      </div>,
      document.body,
    )
  ) : null;

  return (
    <div ref={box} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setAt({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
          setOpen((on) => !on);
        }}
        className={`flex h-10 items-center gap-2 rounded-rp border px-4 text-[11.5px] font-bold uppercase tracking-[.1em] ${
          open ? "sel" : "glass2"
        }`}
        style={{ boxShadow: "var(--spec)" }}
      >
        {label}
        <span aria-hidden className={`text-[14px] leading-none transition-transform ${open ? "rotate-90" : ""}`}>
          ›
        </span>
      </button>
      {panel}
    </div>
  );
}
