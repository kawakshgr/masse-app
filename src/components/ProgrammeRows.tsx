"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge, Tile, rowClass } from "@/components/Pane";
import { Icon } from "@/components/Icon";

export type ProgrammeRow = {
  id: string;
  name: string;
  isTemplate: boolean;
  weekCount: number;
  clientCount: number;
};

/** The programme list. A client component only to know which one is open:
 *  the layout that renders it never receives the route's params. */
export function ProgrammeRows({ rows }: { rows: ProgrammeRow[] }) {
  const t = useTranslations("programmes");
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-1 p-2">
      {rows.map((row) => (
        <li key={row.id}>
          <Link
            href={`/programmes/${row.id}`}
            aria-current={pathname.startsWith(`/programmes/${row.id}`) ? "page" : undefined}
            className={rowClass(pathname.startsWith(`/programmes/${row.id}`))}
          >
            <Tile>
              <Icon name="programmes" size={20} />
            </Tile>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-semibold leading-tight" title={row.name}>
                {row.name}
              </span>
              <span className="tnum block truncate text-[11.5px] leading-tight text-[var(--ink2)]">
                {t("weeks", { count: row.weekCount })} · {t("assigned", { count: row.clientCount })}
              </span>
            </span>
            {row.isTemplate && <Badge>{t("template")}</Badge>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
