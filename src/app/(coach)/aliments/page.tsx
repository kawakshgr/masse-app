import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { deleteFood, updateFood } from "./actions";
import { FoodSearch } from "@/components/FoodSearch";
import { FoodForm } from "@/components/FoodForm";

const cell =
  "h-8 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2 text-[12px] text-[var(--ink)] placeholder:text-[var(--ink3)]";

export default async function FoodsPage() {
  const t = await getTranslations("foods");
  const supabase = await createClient();

  const { data: foods } = await supabase
    .from("foods")
    .select("*")
    .order("name");

  const rows = foods ?? [];

  return (
    <div className="min-w-0 flex-1 overflow-y-auto p-5">
      <header className="mb-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-[20px] font-extrabold tracking-[-.03em]">
            {t("title")}
          </h2>
          <span className="tnum text-[11px] text-[var(--ink3)]">
            {t("count", { count: rows.length })}
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--ink2)]">
          {t("lede")}
        </p>
      </header>

      <section className="glass rounded-r3 p-4">
        <FoodForm />

        <p className="mt-2 text-[10px] text-[var(--ink3)]">{t("per100")}</p>
      </section>

      <div className="mt-4">
        <FoodSearch />
      </div>

      {rows.length === 0 ? (
        <div className="mt-4 p-2">
          <p className="text-[13px] font-bold">{t("empty")}</p>
          <p className="mt-1 text-[12px] text-[var(--ink2)]">{t("emptyHint")}</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((food) => (
            <li key={food.id} className="glass rounded-r2 p-2">
              <form
                action={updateFood}
                className="flex flex-wrap items-end gap-2"
                id={`food-${food.id}`}
              >
                <input type="hidden" name="food_id" value={food.id} />
                <label className="block min-w-[160px] flex-1">
                  <span className="sr-only">{t("name")}</span>
                  <input name="name" defaultValue={food.name} className={cell} />
                </label>
                <label className="block w-[120px]">
                  <span className="sr-only">{t("brand")}</span>
                  <input
                    name="brand"
                    defaultValue={food.brand ?? ""}
                    placeholder={t("brand")}
                    className={cell}
                  />
                </label>
                <span className="tnum flex h-8 w-[78px] shrink-0 items-center justify-center rounded-r2 border border-dashed border-[var(--edge)] text-[11px] text-[var(--ink3)]">
                  {food.kcal_100g ?? "—"}
                </span>
                {(
                  [
                    ["protein_100g", food.protein_100g],
                    ["carbs_100g", food.carbs_100g],
                    ["fat_100g", food.fat_100g],
                  ] as const
                ).map(([field, value]) => (
                  <label key={field} className="block w-[78px]">
                    <span className="sr-only">{field}</span>
                    <input
                      name={field}
                      inputMode="decimal"
                      defaultValue={value ?? ""}
                      className={`tnum ${cell}`}
                    />
                  </label>
                ))}
                <button
                  type="submit"
                  className="h-8 shrink-0 rounded-r2 border border-[var(--edge)] px-3 text-[11px] text-[var(--ink2)]"
                >
                  {t("save")}
                </button>
              </form>

              <form action={deleteFood} className="mt-1 flex justify-end">
                <input type="hidden" name="food_id" value={food.id} />
                <button
                  type="submit"
                  className="rounded-r1 px-2 py-0.5 text-[10px] text-[var(--ink3)] hover:text-[var(--a3)]"
                >
                  {t("remove")}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
