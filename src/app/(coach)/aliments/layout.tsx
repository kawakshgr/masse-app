import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { SplitPane } from "@/components/SplitPane";
import { FoodSearch } from "@/components/FoodSearch";
import { AddFoodButton } from "@/components/AddFoodButton";
import { FOOD_CATEGORIES } from "@/lib/supabase/types";

/**
 * The library is a two-pane editor, like the programme builder: the list on the
 * left stays put while a food is worked on. Search and category live with the
 * list, because that is what they filter.
 */
export default async function FoodsLayout({
  children,
  searchParams,
}: {
  children: React.ReactNode;
  searchParams?: Promise<{ q?: string; cat?: string; aliment?: string }>;
}) {
  const t = await getTranslations("foods");
  const params = (await searchParams) ?? {};
  const query = (params.q ?? "").trim();
  const cat = params.cat ?? "all";

  const supabase = await createClient();
  let request = supabase
    .from("foods")
    .select("id, name, brand, category, serving_label, kcal_100g")
    .order("name");

  if (cat !== "all") request = request.eq("cat" + "egory", cat);
  if (query) request = request.ilike("name", `%${query}%`);

  const rows = (await request).data ?? [];
  const selected = params.aliment;

  /** Keeps the other filters when one of them changes. */
  const href = (next: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    const merged = { q: query || undefined, cat: cat === "all" ? undefined : cat, ...next };
    for (const [key, value] of Object.entries(merged)) {
      if (value) search.set(key, value);
    }
    const qs = search.toString();
    return `/aliments${qs ? `?${qs}` : ""}`;
  };

  const list = (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex flex-col gap-2.5 border-b border-[var(--hair)] p-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
            {t("title")}
          </span>
          <div className="flex-1" />
          <span className="tnum text-[12px] text-[var(--ink3)]">
            {t("count", { count: rows.length })}
          </span>
        </div>

        <form action="/aliments" className="contents">
          {cat !== "all" && <input type="hidden" name="cat" value={cat} />}
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={t("search")}
            aria-label={t("search")}
            className="h-9 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-3 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink3)]"
          />
        </form>

        <div className="flex flex-wrap gap-1.5">
          {["all", ...FOOD_CATEGORIES].map((value) => (
            <Link
              key={value}
              href={href({ cat: value === "all" ? undefined : value })}
              aria-current={cat === value ? "page" : undefined}
              className={`rounded-rp border border-[var(--edge)] px-2.5 py-1 text-[11.5px] font-semibold ${
                cat === value
                  ? "sel text-[var(--ink)]"
                  : "bg-[var(--glass2)] text-[var(--ink2)]"
              }`}
            >
              {t(value === "all" ? "cat.all" : `cat.${value}`)}
            </Link>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {rows.length === 0 ? (
          <p className="p-5 text-center text-[12.5px] leading-[1.5] text-[var(--ink3)]">
            {query ? t("noMatch", { query }) : t("emptyHint")}
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {rows.map((food) => {
              const active = selected === food.id;
              return (
                <li key={food.id}>
                  <Link
                    href={href({ aliment: food.id })}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-r2 border px-3 py-2.5 ${
                      active
                        ? "border-[var(--accent-soft)] bg-[var(--glass2)]"
                        : "border-transparent hover:bg-[var(--glass)]"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">
                        {food.name}
                      </span>
                      <span className="block truncate text-[11.5px] text-[var(--ink2)]">
                        {[food.serving_label, t(`cat.${food.category}`)]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="tnum shrink-0 text-[12px] font-bold text-[var(--ink2)]">
                      {Math.round(Number(food.kcal_100g ?? 0))}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-[var(--hair)] p-3">
        <AddFoodButton label={t("newFood")} />
      </div>
    </div>
  );

  return (
    <SplitPane
      storageKey="masse:foods:width"
      initial={300}
      min={240}
      max={460}
      list={list}
      detail={
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-[var(--hair)] p-3">
            <FoodSearch />
          </div>
          {children}
        </div>
      }
    />
  );
}
