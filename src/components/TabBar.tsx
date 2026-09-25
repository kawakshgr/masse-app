"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { setLocale, signOut } from "@/app/(client)/actions";
import { locales } from "@/i18n/config";
import { Icon } from "@/components/Icon";

/**
 * Deferred features keep their nav entry, rendered inert: greyed label, soon
 * badge, one line of copy on tap. Driven by this one list — never by a
 * condition scattered across the tab bar, a sidebar and a rail.
 */
// Messaging alone: a credible thread needs real time, read states, push and
// media upload — a month of work to end up worse than WhatsApp.
const SOON = ["inbox"] as const;

type SoonKey = (typeof SOON)[number];

export function TabBar({
  name,
  initials,
  subtitle,
  children,
}: {
  name: string;
  initials: string;
  /** Derived from the roster, singular and plural handled by the caller. */
  subtitle: string;
  /** The theme switch, rendered by the layout. */
  children?: React.ReactNode;
}) {
  const t = useTranslations("nav");
  const tSoon = useTranslations("soonCopy");
  const tShell = useTranslations("shell");
  const pathname = usePathname();
  const [revealed, setRevealed] = useState<SoonKey | null>(null);

  const items = [
    { key: "clients", href: "/clients", chord: "⌘1" },
    { key: "programmes", href: "/programmes", chord: "⌘2" },
    { key: "foods", href: "/aliments", chord: "⌘3" },
    { key: "inbox", href: "/inbox", chord: "⌘4" },
    { key: "billing", href: "/facturation", chord: "⌘5" },
    // Every coach has one: it holds her own company and her own exports.
    { key: "admin", href: "/admin", chord: "⌘6" },
  ];

  const circle =
    "relative flex size-10 shrink-0 items-center justify-center rounded-full border border-transparent transition-colors";

  return (
    <div className="shrink-0 px-3 pt-3">
      {/* One floating capsule: who she is on the left, where she can go in the
          centre — icons, the current one opened out with its name — and her
          own switches on the right. The side columns share the free width
          equally, so the centre stays centred whatever the name's length. */}
      <header className="glass lift flex h-[60px] items-center gap-3 rounded-rp px-2.5">
        <div className="flex min-w-0 flex-1 basis-0 items-center gap-2.5">
          <span
            aria-hidden
            className="cta flex size-10 shrink-0 items-center justify-center rounded-full font-display text-[15px] font-extrabold text-[var(--onA)]"
          >
            M
          </span>
          <span className="hidden min-w-0 flex-col md:flex">
            <span className="text-[13px] font-extrabold uppercase leading-tight tracking-[.16em]">
              Masse
            </span>
            <span className="tnum truncate text-[11.5px] text-[var(--ink2)]">{subtitle}</span>
          </span>
        </div>

        <nav className="flex items-center gap-1">
          {items.map((item) => {
            const isSoon = (SOON as readonly string[]).includes(item.key);
            const active = !isSoon && pathname.startsWith(item.href);

            if (isSoon) {
              const key = item.key as SoonKey;
              return (
                <button
                  key={item.key}
                  type="button"
                  title={`${t(item.key)} · ${tShell("soon")}`}
                  aria-label={`${t(item.key)} · ${tShell("soon")}`}
                  aria-disabled="true"
                  aria-expanded={revealed === key}
                  onClick={() => setRevealed((c) => (c === key ? null : key))}
                  className={`${circle} text-[var(--ink3)] hover:bg-[var(--glass2)]`}
                >
                  <Icon name={item.key} size={20} />
                  <span className="absolute -bottom-1 rounded-rp border border-[var(--edge)] bg-[var(--glass2)] px-1 text-[7.5px] font-bold uppercase leading-[11px] tracking-[.1em]">
                    {tShell("soon")}
                  </span>
                </button>
              );
            }

            if (active) {
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  title={item.chord}
                  aria-current="page"
                  className="sel flex h-10 items-center gap-2 rounded-rp border pl-1 pr-4 text-[var(--ink)]"
                  style={{ boxShadow: "var(--spec)" }}
                >
                  <span className="cta flex size-8 items-center justify-center rounded-full text-[var(--onA)]">
                    <Icon name={item.key} size={17} />
                  </span>
                  <span className="text-[11.5px] font-bold uppercase tracking-[.12em]">
                    {t(item.key)}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.key}
                href={item.href}
                title={`${t(item.key)} · ${item.chord}`}
                aria-label={t(item.key)}
                className={`${circle} text-[var(--ink2)] hover:border-[var(--edge)] hover:bg-[var(--glass2)] hover:text-[var(--ink)]`}
              >
                <Icon name={item.key} size={20} />
              </Link>
            );
          })}
        </nav>

        <div className="flex min-w-0 flex-1 basis-0 items-center justify-end gap-2">
          {children}
          <AccountMenu name={name} initials={initials} />
        </div>
      </header>

      {revealed && (
        <p className="pt-2 text-center text-[12px] leading-[1.5] text-[var(--ink3)]">
          {t(revealed)} — {tSoon(revealed)}
        </p>
      )}
    </div>
  );
}

/**
 * Her name, which opens a small menu: the interface language and signing
 * out. Closes on Escape, on a click elsewhere, and after a choice.
 */
function AccountMenu({ name, initials }: { name: string; initials: string }) {
  const t = useTranslations("shell");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
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

  const row =
    "flex h-10 w-full items-center gap-2.5 rounded-r2 px-2.5 text-left text-[13px] font-semibold transition-colors hover:bg-[var(--glass2)]";

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((on) => !on)}
        className={`flex h-10 min-w-0 items-center gap-2 rounded-rp border pl-1 pr-1 transition-colors lg:pr-3 ${
          open ? "sel" : "glass2 hover:border-[var(--edge)]"
        }`}
      >
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--edge)] text-[11px] font-bold tracking-[.04em]"
        >
          {initials}
        </span>
        <span className="hidden truncate text-[12.5px] font-semibold lg:inline">
          {name} <span className="text-[var(--ink2)]">· {t("role")}</span>
        </span>
        <span
          aria-hidden
          className={`hidden text-[13px] leading-none text-[var(--ink3)] transition-transform lg:inline ${
            open ? "rotate-90" : ""
          }`}
        >
          ›
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="chrome lift absolute right-0 top-[calc(100%+8px)] z-50 w-[240px] rounded-r3 p-1.5"
        >
          <p className="px-2.5 pb-1 pt-2 text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
            {t("language")}
          </p>
          {locales.map((option) => {
            const current = option === locale;
            return (
              <button
                key={option}
                type="button"
                role="menuitemradio"
                aria-checked={current}
                disabled={pending}
                onClick={() => {
                  setOpen(false);
                  if (!current) startTransition(() => setLocale(option));
                }}
                className={row}
              >
                <span className="flex-1">{t(`locale.${option}`)}</span>
                {current && <span className="text-[var(--accent)]">✓</span>}
              </button>
            );
          })}

          <div className="my-1.5 border-t border-[var(--hair)]" />

          <button
            type="button"
            role="menuitem"
            disabled={pending}
            onClick={() => startTransition(() => signOut())}
            className={`${row} text-[var(--a3)]`}
          >
            {t("signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
