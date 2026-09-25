import { Icon } from "@/components/Icon";

/**
 * The pieces every coach list pane shares — roster, programmes, the two
 * libraries — so the three read as one app: a coloured kicker over a large
 * uppercase title, rows as soft cards with a square tile, uppercase badges,
 * and an empty detail that shows an icon rather than a lone sentence.
 * Plain module: usable from server and client components alike.
 */

export function PaneHead({
  kicker,
  title,
  children,
}: {
  /** Usually the count, derived by the caller. */
  kicker: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3 px-1">
      <div className="min-w-0">
        <p className="tnum truncate text-[11px] font-bold uppercase tracking-[.14em] text-[var(--accent)]">
          {kicker}
        </p>
        <h1 className="mt-1 truncate font-display text-[24px] font-extrabold uppercase leading-none tracking-[-.01em]">
          {title}
        </h1>
      </div>
      {children}
    </div>
  );
}

/** A list row: one height for all, the current one lifted. */
export function rowClass(active: boolean) {
  return `flex h-[60px] items-center gap-3 rounded-r3 border px-2.5 transition-colors ${
    active
      ? "sel"
      : "border-transparent hover:border-[var(--hair)] hover:bg-[var(--glass)]"
  }`;
}

/** The square at the head of a row: initials, a letter, or an icon. */
export function Tile({
  children,
  accent = false,
}: {
  children: React.ReactNode;
  /** The gradient, for people; glass for things. */
  accent?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`flex size-10 shrink-0 items-center justify-center rounded-r2 text-[12.5px] font-extrabold tracking-[.02em] ${
        accent ? "cta text-[var(--onA)]" : "glass2 text-[var(--ink2)]"
      }`}
    >
      {children}
    </span>
  );
}

export function Badge({
  children,
  tone = "plain",
}: {
  children: React.ReactNode;
  tone?: "plain" | "alert";
}) {
  return (
    <span
      className={`shrink-0 rounded-rp border px-2 py-[3px] text-[10px] font-bold uppercase leading-none tracking-[.12em] ${
        tone === "alert"
          ? "border-transparent text-[var(--a3)]"
          : "border-[var(--edge)] text-[var(--ink2)]"
      }`}
      style={
        tone === "alert"
          ? { background: "color-mix(in oklab, var(--a3) 16%, transparent)" }
          : undefined
      }
    >
      {children}
    </span>
  );
}

/** The detail pane when nothing is selected. */
export function PaneEmpty({
  icon,
  title,
  hint,
  children,
}: {
  icon: string;
  title: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid h-full min-w-0 flex-1 place-items-center p-6">
      <div className="flex max-w-[46ch] flex-col items-center text-center">
        <span className="glass2 flex size-16 items-center justify-center rounded-r4 text-[var(--ink2)]">
          <Icon name={icon} size={30} />
        </span>
        <p className="mt-4 text-[14px] font-semibold">{title}</p>
        {hint && <p className="mt-1.5 text-[13px] leading-[1.5] text-[var(--ink2)]">{hint}</p>}
        {children}
      </div>
    </div>
  );
}

/** A section's title: a large icon in a glass square, the name in capitals,
 *  and an optional aside on the right (a count, a date, an action). */
export const SECTION_TITLE = "text-[12px] font-bold uppercase tracking-[.12em] text-[var(--ink)]";

export function SectionTitle({
  icon,
  children,
  aside,
  as: Tag = "h3",
}: {
  icon?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
  as?: "h2" | "h3";
}) {
  return (
    <div className="flex min-h-9 items-center gap-2.5">
      {icon && (
        <span className="glass2 flex size-9 shrink-0 items-center justify-center rounded-r2 text-[var(--accent)]">
          <Icon name={icon} size={19} />
        </span>
      )}
      <Tag className={`min-w-0 flex-1 truncate ${SECTION_TITLE}`}>{children}</Tag>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}
