import Link from "next/link";
import { Icon } from "@/components/Icon";

/**
 * Big tiles for picking one of a handful of things — a settings part, a
 * family, a destination. Kevin's call (1 Oct 2026), after the phone's
 * movement picker: large icons, no long list. Lists stay for data.
 * Plain module: server and client components alike may use it.
 */
export function TileGrid({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  /** Three or four abreast where there is room (coach screens). */
  wide?: boolean;
}) {
  return (
    <ul className={`grid grid-cols-2 gap-2.5 ${wide ? "sm:grid-cols-3 lg:grid-cols-4" : ""}`}>
      {children}
    </ul>
  );
}

export function Tile({
  href,
  icon,
  label,
  sub,
  count,
  alert = false,
}: {
  href: string;
  icon: string;
  label: string;
  /** Where it stands, in a few words: "Clair", "4 mentions manquantes". */
  sub?: string | null;
  count?: number | null;
  /** Something to do here: the line turns coral. */
  alert?: boolean;
}) {
  return (
    <li className="min-w-0">
      <Link
        href={href}
        className="glass flex h-full min-h-[112px] flex-col justify-between gap-3 rounded-r3 p-3.5 transition-transform active:scale-[.98]"
      >
        <span className={alert ? "text-[var(--a3)]" : "text-[var(--accent)]"}>
          <Icon name={icon} size={34} />
        </span>
        <span className="block min-w-0">
          <span className="flex items-end justify-between gap-2">
            {/* Two lines rather than "BILAN HEBDOMA…" on a phone. */}
            <span className="line-clamp-2 min-w-0 break-words text-[13px] font-bold uppercase leading-[1.2] tracking-[.1em]">
              {label}
            </span>
            {count != null && (
              <span className="tnum shrink-0 text-[12px] text-[var(--ink3)]">{count}</span>
            )}
          </span>
          {sub && (
            <span
              className={`mt-0.5 block truncate text-[12px] ${
                alert ? "text-[var(--a3)]" : "text-[var(--ink2)]"
              }`}
            >
              {sub}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

/**
 * The head of a part opened from a tile on the coach's screens: a round
 * back button to the tiles, the screen's name as kicker, the part in
 * capitals.
 */
export function PartHead({
  back,
  backLabel,
  kicker,
  title,
  children,
}: {
  back: string;
  backLabel: string;
  kicker: string;
  title: string;
  /** An action on the right, such as "Enregistrer". */
  children?: React.ReactNode;
}) {
  return (
    <header className="flex items-center gap-3 px-1 pb-2">
      <Link
        href={back}
        aria-label={backLabel}
        className="glass2 flex size-11 shrink-0 items-center justify-center rounded-full text-[24px] leading-none text-[var(--ink2)]"
      >
        ‹
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-bold uppercase tracking-[.14em] text-[var(--accent)]">
          {kicker}
        </p>
        <h1 className="mt-1 font-display text-[26px] font-extrabold uppercase leading-[1.02] tracking-[-.01em] [overflow-wrap:anywhere]">
          {title}
        </h1>
      </div>
      {children}
    </header>
  );
}
