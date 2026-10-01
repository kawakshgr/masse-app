import Link from "next/link";
import { SplitPane } from "@/components/SplitPane";
import { LibrarySwitch } from "@/components/LibrarySwitch";
import { PaneEmpty, PaneHead, Tile, rowClass } from "@/components/Pane";
import { PartHead, Tile as BigTile, TileGrid } from "@/components/Tiles";
import { Icon } from "@/components/Icon";
import { LinkSelect } from "@/components/LinkSelect";

/**
 * The frame both nutrition libraries share: the list on the left — switch,
 * title and count, search, category chips, rows, the add action — and the
 * selected entry on the right. One component, so switching from foods to
 * supplements changes the content and never the shape.
 *
 * It is rendered by each page, not by a layout: a layout never receives
 * `searchParams`, so filters and the selected row read there went stale.
 */
export function LibraryPane({
  active,
  title,
  count,
  path,
  query,
  searchLabel,
  keep,
  chips,
  footer,
  detailTop,
  children,
  list,
}: {
  active: "foods" | "supplements";
  title: string;
  count: string;
  /** The page itself: the search form submits here. */
  path: string;
  query: string;
  searchLabel: string;
  /** Filters the search form must carry over, e.g. the category. */
  keep: Record<string, string | undefined>;
  chips: { key: string; label: string; href: string; on: boolean }[];
  footer: React.ReactNode;
  /** A strip above the detail, on the right. */
  detailTop?: React.ReactNode;
  /** The detail pane. */
  children: React.ReactNode;
  /** The rows, or the list's empty state. */
  list: React.ReactNode;
}) {
  const pane = (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex flex-col gap-3 border-b border-[var(--hair)] p-3 pt-4">
        <LibrarySwitch active={active} />
        <PaneHead kicker={count} title={title} />

        <form action={path} className="contents">
          {Object.entries(keep).map(([name, value]) =>
            value ? <input key={name} type="hidden" name={name} value={value} /> : null,
          )}
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={searchLabel}
            aria-label={searchLabel}
            className="h-9 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-3 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink3)]"
          />
        </form>

        <LinkSelect
          label={title}
          value={chips.find((chip) => chip.on)?.key ?? chips[0]?.key ?? ""}
          options={chips.map((chip) => ({ value: chip.key, label: chip.label, href: chip.href }))}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">{list}</div>

      <div className="border-t border-[var(--hair)] p-3">{footer}</div>
    </div>
  );

  return (
    <SplitPane
      storageKey="masse:foods:width"
      listLabel={title}
      initial={300}
      min={240}
      max={460}
      list={pane}
      detail={
        <div className="flex min-w-0 flex-1 flex-col">
          {detailTop && <div className="border-b border-[var(--hair)] p-3">{detailTop}</div>}
          {children}
        </div>
      }
    />
  );
}

/** One row of either list: a tile, the name, a line under it, a figure or badge. */
export function LibraryRow({
  href,
  on,
  name,
  line,
  trailing,
  muted = false,
}: {
  href: string;
  on: boolean;
  name: string;
  line: string;
  trailing: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={on ? "page" : undefined}
        className={`${rowClass(on)} ${muted ? "opacity-55" : ""}`}
      >
        <Tile>{name.trim().charAt(0).toUpperCase()}</Tile>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold">{name}</span>
          <span className="block truncate text-[11.5px] text-[var(--ink2)]">{line}</span>
        </span>
        <span className="shrink-0">{trailing}</span>
      </Link>
    </li>
  );
}

/** The detail pane when nothing is selected. */
export function LibraryEmpty({
  icon = "foods",
  title,
  lede,
  children,
}: {
  icon?: string;
  title: string;
  lede?: string;
  children?: React.ReactNode;
}) {
  return (
    <PaneEmpty icon={icon} title={title} hint={lede}>
      {children}
    </PaneEmpty>
  );
}

/** Keeps the other filters when one of them changes. */
export function libraryHref(
  path: string,
  current: Record<string, string | undefined>,
  next: Record<string, string | undefined>,
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...next })) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return `${path}${qs ? `?${qs}` : ""}`;
}

/**
 * A library's front door on a phone, where the list hides behind a button:
 * a search and the families as big tiles (Kevin, 1 Oct 2026). A family or
 * a search shows its rows right here, with a way back to the tiles.
 */
export function LibraryHome({
  path,
  title,
  kicker,
  searchLabel,
  query,
  keep,
  tiles,
  open,
  rows,
  add,
  backLabel,
}: {
  path: string;
  title: string;
  kicker: string;
  searchLabel: string;
  query: string;
  /** Filters the search must carry over. */
  keep: Record<string, string | undefined>;
  tiles: { key: string; label: string; icon: string; count: number; href: string }[];
  /** The family or search being shown, by name; null shows the tiles. */
  open: string | null;
  rows: React.ReactNode;
  add: React.ReactNode;
  backLabel: string;
}) {
  return (
    <div className="space-y-4 p-4 md:hidden">
      {open ? (
        <PartHead back={path} backLabel={backLabel} kicker={title} title={open} />
      ) : (
        <PaneHead kicker={kicker} title={title} />
      )}

      <form action={path}>
        {Object.entries(keep).map(([name, value]) =>
          value ? <input key={name} type="hidden" name={name} value={value} /> : null,
        )}
        <label className="flex h-12 items-center gap-2.5 rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-3.5 text-[var(--ink3)]">
          <Icon name="search" size={20} />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={searchLabel}
            aria-label={searchLabel}
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent text-[16px] text-[var(--ink)] placeholder:text-[var(--ink3)] focus:outline-none"
          />
        </label>
      </form>

      {open ? (
        rows
      ) : (
        <TileGrid>
          {tiles.map((tile) => (
            <BigTile key={tile.key} href={tile.href} icon={tile.icon} label={tile.label} count={tile.count} />
          ))}
        </TileGrid>
      )}

      {add}
    </div>
  );
}

/** On a phone, the way from an entry back to the family it was picked in. */
export function PhoneBack({ href, label }: { href: string; label: string }) {
  return (
    <div className="px-4 pt-4 md:hidden">
      <Link
        href={href}
        className="glass2 inline-flex h-10 items-center gap-2 rounded-rp px-4 text-[12px] font-bold uppercase tracking-[.12em] text-[var(--ink2)]"
      >
        <span aria-hidden className="text-[18px] leading-none">‹</span>
        {label}
      </Link>
    </div>
  );
}
