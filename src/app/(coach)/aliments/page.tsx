import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { FoodEditor } from "@/components/FoodEditor";
import { FoodSearch } from "@/components/FoodSearch";
import { AddFoodButton } from "@/components/AddFoodButton";
import {
  LibraryEmpty,
  LibraryPane,
  LibraryRow,
  libraryHref,
} from "@/components/LibraryPane";
import { FOOD_CATEGORIES } from "@/lib/supabase/types";

/**
 * The food library: a two-pane editor, like the programme builder — the list
 * stays put while a food is worked on. Where a food is used is counted from
 * the rows that point at it, never estimated.
 */
export default async function FoodsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; aliment?: string }>;
}) {
  const t = await getTranslations("foods");
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const cat = FOOD_CATEGORIES.find((value) => value === params.cat) ?? "all";
  const selected = params.aliment;
  const supabase = await createClient();

  let request = supabase
    .from("foods")
    .select("id, name, brand, category, serving_label, kcal_100g")
    .order("name");
  if (cat !== "all") request = request.eq("category", cat);
  if (query) request = request.ilike("name", `%${query}%`);
  const rows = (await request).data ?? [];

  const current = { q: query || undefined, cat: cat === "all" ? undefined : cat };
  const href = (next: Record<string, string | undefined>) =>
    libraryHref("/aliments", current, next);

  return (
    <LibraryPane
      active="foods"
      title={t("title")}
      count={t("count", { count: rows.length })}
      path="/aliments"
      query={query}
      searchLabel={t("search")}
      keep={{ cat: current.cat }}
      chips={["all", ...FOOD_CATEGORIES].map((value) => ({
        key: value,
        label: t(value === "all" ? "cat.all" : `cat.${value}`),
        href: href({ cat: value === "all" ? undefined : value, aliment: selected }),
        on: cat === value,
      }))}
      footer={<AddFoodButton label={t("newFood")} />}
      detailTop={<FoodSearch />}
      list={
        rows.length === 0 ? (
          <p className="p-5 text-center text-[12.5px] leading-[1.5] text-[var(--ink3)]">
            {query ? t("noMatch", { query }) : t("emptyHint")}
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {rows.map((food) => (
              <LibraryRow
                key={food.id}
                href={href({ aliment: food.id })}
                on={selected === food.id}
                name={food.name}
                line={[food.serving_label, t(`cat.${food.category}`)]
                  .filter(Boolean)
                  .join(" · ")}
                trailing={
                  <span className="tnum text-right text-[13px] font-extrabold leading-none">
                    {Math.round(Number(food.kcal_100g ?? 0))}
                    <span className="block pt-1 text-[9.5px] font-bold uppercase tracking-[.12em] text-[var(--ink3)]">
                      kcal
                    </span>
                  </span>
                }
              />
            ))}
          </ul>
        )
      }
    >
      <FoodDetail id={selected} />
    </LibraryPane>
  );
}

async function FoodDetail({ id }: { id: string | undefined }) {
  const t = await getTranslations("foods");
  if (!id) return <LibraryEmpty title={t("pickFood")} lede={t("lede")} />;

  const supabase = await createClient();
  const { data: food } = await supabase.from("foods").select("*").eq("id", id).maybeSingle();
  if (!food) return <LibraryEmpty title={t("gone")} />;

  // Real counts, from the rows that reference this food. `head: true` means
  // the count comes back without the rows.
  const [plansRes, loggedRes, clientRes] = await Promise.all([
    supabase
      .from("plan_meal_items")
      .select("meal_id", { count: "exact", head: true })
      .eq("food_id", id),
    supabase.from("meals").select("id", { count: "exact", head: true }).eq("food_id", id),
    supabase.from("plan_meal_items").select("plan_meals(client_id)").eq("food_id", id),
  ]);

  const clients = new Set(
    (clientRes.data ?? [])
      .map((row) => {
        const meal = row.plan_meals as unknown as { client_id: string } | null;
        return meal?.client_id;
      })
      .filter(Boolean),
  );

  return (
    <FoodEditor
      food={food}
      usage={{
        plans: plansRes.count ?? 0,
        clients: clients.size,
        logged: loggedRes.count ?? 0,
      }}
    />
  );
}
