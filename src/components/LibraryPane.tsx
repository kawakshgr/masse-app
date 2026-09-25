import Link from "next/link";
import { SplitPane } from "@/components/SplitPane";
import { LibrarySwitch } from "@/components/LibrarySwitch";

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
      <div className="flex flex-col gap-2.5 border-b border-[var(--hair)] p-3">
        <LibrarySwitch active={active} />
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
            {title}
          </span>
          <div className="flex-1" />
          <span className="tnum text-[12px] text-[var(--ink3)]">{count}</span>
        </div>

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

        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <Link
              key={chip.key}
              href={chip.href}
              aria-current={chip.on ? "page" : undefined}
              className={`rounded-rp border border-[var(--edge)] px-2.5 py-1 text-[11.5px] font-semibold ${
                chip.on ? "sel text-[var(--ink)]" : "bg-[var(--glass2)] text-[var(--ink2)]"
              }`}
            >
              {chip.label}
            </Link>
          ))}
        </div>
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

/** One row of either list: name, a line under it, and a figure or badge. */
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
        className={`flex items-center gap-2.5 rounded-r2 border px-3 py-2.5 ${
          on
            ? "border-[var(--accent-soft)] bg-[var(--glass2)]"
            : "border-transparent hover:bg-[var(--glass)]"
        } ${muted ? "opacity-55" : ""}`}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold">{name}</span>
          <span className="block truncate text-[11.5px] text-[var(--ink2)]">{line}</span>
        </span>
        <span className="shrink-0">{trailing}</span>
      </Link>
    </li>
  );
}

/** The detail pane when nothing is selected. */
export function LibraryEmpty({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid min-w-0 flex-1 place-items-center p-6">
      <div className="max-w-[46ch] text-center">
        <p className="text-[14px] font-semibold">{title}</p>
        {lede && (
          <p className="mt-1.5 text-[13px] leading-[1.5] text-[var(--ink2)]">{lede}</p>
        )}
        {children}
      </div>
    </div>
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
