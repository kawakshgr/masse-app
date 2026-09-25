"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A page's secondary actions behind one button, so the title keeps its room.
 * The panel is hidden, not unmounted, when it closes: a server-action form
 * inside it must still be in the page when its submit button is pressed.
 */
export function ActionMenu({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div ref={box} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((on) => !on)}
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
      <div
        role="menu"
        hidden={!open}
        // A click on an item closes the menu after the click has done its work.
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("button")) window.setTimeout(() => setOpen(false), 0);
        }}
        className="chrome lift absolute right-0 top-[calc(100%+8px)] z-50 w-[260px] rounded-r3 p-1.5"
      >
        {children}
      </div>
    </div>
  );
}
