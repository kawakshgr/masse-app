import Link from "next/link";
import { getTranslations } from "next-intl/server";

/**
 * Foods and supplements are two libraries, not two tabs in the chrome: a
 * seventh top-level entry would bury both. The switch lives where nutrition is
 * already being worked on.
 */
export async function LibrarySwitch({
  active,
}: {
  active: "foods" | "supplements";
}) {
  const t = await getTranslations("supp");

  const items = [
    { key: "foods" as const, href: "/aliments", label: t("switchFoods") },
    { key: "supplements" as const, href: "/complements", label: t("switchSupplements") },
  ];

  return (
    <nav className="inline-flex gap-1 rounded-rp border border-[var(--edge)] bg-[var(--glass2)] p-1">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={active === item.key ? "page" : undefined}
          className={`h-7 rounded-rp px-3 text-[12px] font-semibold leading-7 ${
            active === item.key
              ? "sel text-[var(--ink)]"
              : "text-[var(--ink2)] hover:text-[var(--ink)]"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
