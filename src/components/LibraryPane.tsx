import Link from "next/link";
import { SplitPane } from "@/components/SplitPane";
import { LibrarySwitch } from "@/components/LibrarySwitch";
import { PaneEmpty, PaneHead, Tile, rowClass } from "@/components/Pane";
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
