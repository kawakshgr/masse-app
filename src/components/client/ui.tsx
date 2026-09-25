import Link from "next/link";
import { Icon } from "@/components/Icon";

/*
 * The client screens' atoms — the web twins of Components.swift, so a card, a
 * kicker or a primary button reads the same on either client. A screen
 * composes these; it does not reach for a size or a radius of its own.
 */

/**
 * A card's title. With an icon it is the section's heading — a large line
 * icon in a glass square and the name in capitals; without, the small
 * uppercase line that sits over a screen's title.
 */
export function Kicker({
  children,
  icon,
  accent = false,
}: {
  children: React.ReactNode;
  icon?: string;
  accent?: boolean;
}) {
  if (icon) {
    return (
      <div className="flex min-h-10 items-center gap-3">
        <span className="glass2 flex size-10 shrink-0 items-center justify-center rounded-r2 text-[var(--accent)]">
          <Icon name={icon} size={21} />
        </span>
        <h2 className="min-w-0 flex-1 text-[13px] font-bold uppercase tracking-[.12em] text-[var(--ink)]">
          {children}
        </h2>
      </div>
    );
  }
  return (
    <p
      className={`text-[11px] font-bold uppercase tracking-[.14em] ${
        accent ? "text-[var(--accent)]" : "text-[var(--ink2)]"
      }`}
    >
      {children}
    </p>
  );
}

/** A panel: glass over the atmosphere. */
export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`glass rounded-r4 p-[18px] ${className}`}>{children}</section>;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-[20px] font-extrabold uppercase leading-tight tracking-[-.01em]">
      {children}
    </h2>
  );
}

/** The top of every tab: a kicker, a title, a line under it, and a slot. */
export function ScreenHeader({
  kicker,
  title,
  sub,
  subTone = "ink2",
  aside,
}: {
  kicker: string;
  title: string;
  sub?: string | null;
  subTone?: "ink2" | "accent";
  aside?: React.ReactNode;
}) {
  return (
    <header className="space-y-2 pb-1">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <Kicker accent>{kicker}</Kicker>
        {aside}
      </div>
      <h1 className="font-display text-[32px] font-extrabold uppercase leading-none tracking-[-.01em]">
        {title}
      </h1>
      {sub && (
        <p
          className={`text-[13px] ${
            subTone === "accent" ? "text-[var(--a1)]" : "text-[var(--ink2)]"
          }`}
        >
          {sub}
        </p>
      )}
    </header>
  );
}

const ctaClass =
  "flex h-[52px] w-full items-center justify-center rounded-rp cta text-[15px] font-semibold text-[var(--on-accent)] disabled:opacity-40";

/** The primary action: full width, teal to violet. */
export function Cta({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...props} className={ctaClass}>
      {children}
    </button>
  );
}

export function CtaLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={ctaClass}>
      {children}
    </Link>
  );
}

/** The quieter action beside the primary one. */
export function Secondary({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`glass2 inline-flex h-[52px] items-center justify-center rounded-rp px-5 text-[15px] font-semibold text-[var(--ink2)] disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

/** One of a row of choices. Selected is the tinted gradient, never a flat fill. */
export function Choice({
  selected,
  children,
  onClick,
  className = "",
}: {
  selected: boolean;
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex min-h-11 flex-1 items-center justify-center rounded-r1 border border-[var(--edge)] px-2 text-center text-[15px] font-semibold ${
        selected ? "sel text-[var(--ink)]" : "bg-[var(--glass2)] text-[var(--ink2)]"
      } ${className}`}
    >
      {children}
    </button>
  );
}

/** A round thumb-sized button carrying one glyph. */
export function RoundButton({
  label,
  children,
  onClick,
  size = 44,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  size?: 44 | 52;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-rp bg-[var(--glass2)] text-[17px] font-semibold text-[var(--ink)]"
    >
      {children}
    </button>
  );
}

export const fieldClass =
  "h-[52px] w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-3.5 text-[15px] text-[var(--ink)] placeholder:text-[var(--ink3)]";

/** "60" rather than "60.0", but 62.5 keeps its half — Double.clean on iOS. */
export function clean(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

/** A pushed screen's top: a way back, and its title. */
export function BackHeader({
  href,
  back,
  title,
  lede,
}: {
  href: string;
  back: string;
  title: string;
  lede?: string;
}) {
  return (
    <header className="space-y-3 pb-1">
      <Link
        href={href}
        aria-label={back}
        className="flex size-11 items-center justify-center rounded-rp bg-[var(--glass2)] text-[20px] text-[var(--ink2)]"
      >
        ‹
      </Link>
      <h1 className="font-display text-[32px] font-extrabold uppercase leading-none tracking-[-.01em]">
        {title}
      </h1>
      {lede && <p className="text-[13px] leading-[1.45] text-[var(--ink2)]">{lede}</p>}
    </header>
  );
}

/** A row that opens a screen of its own, chevron and all. */
export function NavRow({
  href,
  icon,
  children,
}: {
  href: string;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="glass2 flex min-h-[52px] items-center gap-3 rounded-r2 px-3.5 text-[15px] font-semibold"
    >
      {icon && (
        <span className="shrink-0 text-[var(--ink2)]">
          <Icon name={icon} size={20} />
        </span>
      )}
      <span className="min-w-0 flex-1">{children}</span>
      <span aria-hidden className="text-[18px] text-[var(--ink3)]">
        ›
      </span>
    </Link>
  );
}
