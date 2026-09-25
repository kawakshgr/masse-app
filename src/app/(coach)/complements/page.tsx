import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  LibraryEmpty,
  LibraryPane,
  LibraryRow,
  libraryHref,
} from "@/components/LibraryPane";
import { SupplementDetail } from "@/components/SupplementLibrary";
import { doseLabel, type LibraryEntry } from "@/lib/supplementEntry";
import { SupplementForm } from "@/components/SupplementForm";
import { Badge } from "@/components/Pane";
import { unhideSupplement } from "./actions";
import {
  SUPPLEMENT_CATEGORIES,
  type SupplementRow,
  type SupplementUnit,
} from "@/lib/supabase/types";

function entryOf(row: SupplementRow): LibraryEntry {
  const n = (value: number | null) => (value === null ? null : Number(value));
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    doseMin: n(row.dose_min),
    doseMax: n(row.dose_max),
    unit: row.unit,
    timing: row.timing,
    note: row.note,
    proteinPerUnit: n(row.protein_per_unit),
    carbsPerUnit: n(row.carbs_per_unit),
    fatPerUnit: n(row.fat_per_unit),
    usable: row.usable,
    mine: row.coach_id !== null,
  };
}

/**
 * The supplement library. It sits beside the food library rather than inside
 * it — a food is quantified in grams and carries macros, a supplement in doses
 * and mostly carries nothing — but in the same frame, so the switch between
 * them changes the content and not the page.
 */
export default async function SupplementsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; complement?: string; nouveau?: string }>;
}) {
  const t = await getTranslations("supp");
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const cat = (SUPPLEMENT_CATEGORIES as string[]).includes(params.cat ?? "")
    ? params.cat!
    : "all";
  const selected = params.complement;
  const supabase = await createClient();

  const [{ data: rows }, { data: hiddenRows }] = await Promise.all([
    supabase.from("supplements").select("*").order("category").order("name"),
    supabase.from("supplement_hidden").select("supplement_id"),
  ]);

  const hiddenIds = new Set((hiddenRows ?? []).map((row) => row.supplement_id));
  const all = (rows ?? []) as SupplementRow[];
  const hidden = all.filter((row) => hiddenIds.has(row.id));
  const needle = query.toLowerCase();
  const shown = all
    .filter((row) => !hiddenIds.has(row.id))
    .map(entryOf)
    .filter(
      (entry) =>
        (cat === "all" || entry.category === cat) &&
        (!needle ||
          entry.name.toLowerCase().includes(needle) ||
          (entry.note ?? "").toLowerCase().includes(needle)),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  const current = { q: query || undefined, cat: cat === "all" ? undefined : cat };
  const href = (next: Record<string, string | undefined>) =>
    libraryHref("/complements", current, next);
  const unitName = (unit: SupplementUnit, count: number) => t(`unit.${unit}`, { count });

  const picked = selected ? all.find((row) => row.id === selected) : undefined;

  return (
    <LibraryPane
      active="supplements"
      title={t("title")}
      count={t("count", { count: shown.length })}
      path="/complements"
      query={query}
      searchLabel={t("search")}
      keep={{ cat: current.cat }}
      chips={["all", ...SUPPLEMENT_CATEGORIES].map((value) => ({
        key: value,
        label: value === "all" ? t("allGroups") : t(`cat.${value}`),
        href: href({ cat: value === "all" ? undefined : value, complement: selected }),
        on: cat === value,
      }))}
      footer={
        <Link
          href={href({ nouveau: "1" })}
          className="cta block h-10 w-full rounded-r2 text-center text-[13px] font-semibold leading-10 text-[var(--onA)]"
        >
          {t("newOne")}
        </Link>
      }
      list={
        shown.length === 0 ? (
          <p className="p-5 text-center text-[12.5px] leading-[1.5] text-[var(--ink3)]">
            {query ? t("noMatch", { query }) : t("empty")}
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {shown.map((entry) => (
              <LibraryRow
                key={entry.id}
                href={href({ complement: entry.id })}
                on={selected === entry.id}
                muted={!entry.usable}
                name={entry.name}
                line={[doseLabel(entry, unitName), t(`cat.${entry.category}`)]
                  .filter(Boolean)
                  .join(" · ")}
                trailing={
                  <Badge tone={entry.usable ? "plain" : "alert"}>
                    {t(!entry.usable ? "unusable" : entry.mine ? "mine" : "builtIn")}
                  </Badge>
                }
              />
            ))}
          </ul>
        )
      }
    >
      {params.nouveau ? (
        <SupplementForm />
      ) : picked ? (
        <SupplementDetail entry={entryOf(picked)} />
      ) : (
        <LibraryEmpty icon="supplements" title={selected ? t("gone") : t("pick")} lede={selected ? undefined : t("lede")}>
          {!selected && hidden.length > 0 && (
            <div className="mt-5 border-t border-[var(--hair)] pt-4">
              <p className="text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
                {t("hidden", { count: hidden.length })}
              </p>
              <ul className="mt-2 flex flex-wrap justify-center gap-2">
                {hidden.map((row) => (
                  <li key={row.id}>
                    <form action={unhideSupplement}>
                      <input type="hidden" name="supplement_id" value={row.id} />
                      <button
                        type="submit"
                        className="h-8 rounded-rp border border-[var(--edge)] px-3 text-[12px] text-[var(--ink2)] hover:text-[var(--ink)]"
                      >
                        {row.name} · {t("unhide")}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </LibraryEmpty>
      )}
    </LibraryPane>
  );
}
