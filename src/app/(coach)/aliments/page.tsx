import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { addFood, deleteFood, updateFood } from "./actions";

const cell =
  "h-8 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass)] px-2 text-[12px] text-[var(--ink)] placeholder:text-[var(--ink3)]";

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
          <h2 className="font-display text-[20px] font-extrabold tracking-[-.04em]">
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
        <form action={addFood} className="flex flex-wrap items-end gap-2">
          <label className="block min-w-[160px] flex-1">
            <span className="block text-[10px] text-[var(--ink3)]">{t("name")}</span>
            <input name="name" required className={`mt-1 ${cell}`} />
          </label>
          <label className="block w-[120px]">
            <span className="block text-[10px] text-[var(--ink3)]">{t("brand")}</span>
            <input name="brand" className={`mt-1 ${cell}`} />
          </label>
          {(["kcal_100g", "protein_100g", "carbs_100g", "fat_100g"] as const).map(
            (field, i) => (
              <label key={field} className="block w-[78px]">
                <span className="block text-[10px] text-[var(--ink3)]">
                  {[t("kcal"), t("protein"), t("carbs"), t("fat")][i]}
                </span>
                <input name={field} inputMode="decimal" className={`tnum mt-1 ${cell}`} />
              </label>
            ),
          )}
          <button
            type="submit"
            className="h-8 shrink-0 rounded-r2 bg-[var(--a1)] px-4 text-[12px] font-semibold text-[var(--onA)]"
          >
            {t("add")}
          </button>
        </form>
        <p className="mt-2 text-[10px] text-[var(--ink3)]">{t("per100")}</p>
      </section>

      {rows.length === 0 ? (
        <div className="mt-4 p-2">
          <p className="text-[13px] font-semibold">{t("empty")}</p>
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
                {(
                  [
                    ["kcal_100g", food.kcal_100g],
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
