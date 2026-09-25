import Link from "next/link";

export type SubNavItem = {
  key: string;
  href: string;
  label: string;
  /** Shown as "LABEL · 8" when there is a count worth giving. */
  count?: number;
  active: boolean;
};

/**
 * Every sub-menu in the coach app — a client's tabs, the two libraries, the
 * billing filters, a programme's weeks — is this one capsule: short uppercase
 * labels, the current one lifted. One shape, so moving between screens never
 * means relearning where the choices are.
 */
export function SubNav({
  items,
  label,
  className = "",
  children,
}: {
  items: SubNavItem[];
  label?: string;
  className?: string;
  /** A trailing action inside the capsule, e.g. "+ week". */
  children?: React.ReactNode;
}) {
  return (
    <nav
      aria-label={label}
      className={`glass2 inline-flex max-w-full flex-wrap items-center gap-1 self-start rounded-rp p-1 ${className}`}
      style={{ boxShadow: "var(--spec)" }}
    >
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={`h-8 whitespace-nowrap rounded-rp border px-3.5 text-[11.5px] font-bold uppercase leading-[30px] tracking-[.1em] transition-colors ${
            item.active
              ? "sel text-[var(--ink)]"
              : "border-transparent text-[var(--ink2)] hover:text-[var(--ink)]"
          }`}
          style={item.active ? { boxShadow: "var(--spec)" } : undefined}
        >
          {item.label}
          {item.count != null && (
            <span className="tnum text-[var(--ink3)]"> · {item.count}</span>
          )}
        </Link>
      ))}
      {children}
    </nav>
  );
}
