"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { addPlanMealItem } from "@/app/(coach)/clients/nutrition-actions";
import { FOOD_CATEGORIES, type FoodCategory } from "@/lib/supabase/types";

export type PickableFood = {
  id: string;
  name: string;
  brand: string | null;
  category: FoodCategory;
  serving_label: string | null;
  serving_g: number | null;
  kcal_100g: number | null;
};

const cell =
  "h-9 rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2.5 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink3)]";

/**
 * Choosing a food out of a library of fifty. A dropdown listing all of them is
 * a scroll, not a choice — so this is what the prototype has: a search, the
 * categories beside it, and the serving offered as one tap when the food has
 * one.
 */
export function FoodPicker({
  mealId,
  clientId,
  foods,
}: {
  mealId: string;
  clientId: string;
  foods: PickableFood[];
}) {
  const t = useTranslations("nut");
  const tFoods = useTranslations("foods");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<FoodCategory | "all">("all");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return foods
      .filter((f) => cat === "all" || f.category === cat)
      .filter((f) => !q || f.name.toLowerCase().includes(q))
      .slice(0, 40);
  }, [foods, query, cat]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass2 mt-1 h-9 w-full rounded-r2 text-[12.5px] font-semibold text-[var(--ink2)]"
      >
        {t("addFood")}
      </button>
    );
  }

  return (
    <div className="glass2 mt-1 flex flex-col gap-2 rounded-r2 p-2.5">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tFoods("search")}
          aria-label={tFoods("search")}
          autoFocus
          className={`${cell} min-w-0 flex-1`}
        />
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t("close")}
          className="h-9 shrink-0 rounded-r2 px-2.5 text-[13px] text-[var(--ink3)]"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {(["all", ...FOOD_CATEGORIES] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={cat === value}
            onClick={() => setCat(value)}
            className={`rounded-rp border border-[var(--edge)] px-2.5 py-1 text-[11.5px] font-semibold ${
              cat === value
                ? "sel text-[var(--ink)]"
                : "bg-[var(--glass2)] text-[var(--ink2)]"
            }`}
          >
            {tFoods(`cat.${value}`)}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="px-1 py-3 text-center text-[12px] text-[var(--ink3)]">
          {tFoods("noMatch", { query })}
        </p>
      ) : (
        <ul className="max-h-[220px] overflow-y-auto">
          {shown.map((food) => (
            <li key={food.id} className="border-t border-[var(--hair)] first:border-t-0">
              <form action={addPlanMealItem} className="flex items-center gap-2 py-1.5">
                <input type="hidden" name="meal_id" value={mealId} />
                <input type="hidden" name="client_id" value={clientId} />
                <input type="hidden" name="food_id" value={food.id} />

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold">
                    {food.name}
                  </span>
                  <span className="tnum block truncate text-[11px] text-[var(--ink3)]">
                    {Math.round(Number(food.kcal_100g ?? 0))} kcal / 100 g
                    {food.serving_label ? ` · ${food.serving_label}` : ""}
                  </span>
                </span>

                {/* The serving, when it has a weight: one tap instead of
                    remembering that a scoop is thirty grams. */}
                {food.serving_g != null && (
                  <button
                    type="submit"
                    name="quantity_g"
                    value={String(food.serving_g)}
                    className="tnum h-8 shrink-0 rounded-r2 border border-[var(--edge)] px-2 text-[11.5px] font-semibold text-[var(--ink2)]"
                  >
                    {food.serving_label ?? `${food.serving_g} g`}
                  </button>
                )}

                <input
                  name="quantity_g"
                  inputMode="decimal"
                  placeholder="g"
                  aria-label={t("grams")}
                  className={`tnum ${cell} w-[58px] shrink-0`}
                />
                <button
                  type="submit"
                  aria-label={t("add")}
                  className="cta h-8 shrink-0 rounded-r2 px-2.5 text-[13px] font-semibold text-[var(--onA)]"
                >
                  +
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {/* Something that is not in the library yet, written straight in. */}
      <form action={addPlanMealItem} className="flex gap-2 border-t border-[var(--hair)] pt-2">
        <input type="hidden" name="meal_id" value={mealId} />
        <input type="hidden" name="client_id" value={clientId} />
        <input
          name="name"
          placeholder={t("freeItem")}
          aria-label={t("freeItem")}
          className={`${cell} min-w-0 flex-1`}
        />
        <button
          type="submit"
          className="glass h-9 shrink-0 rounded-r2 border border-[var(--edge)] px-3 text-[12.5px] font-semibold text-[var(--ink2)]"
        >
          {t("add")}
        </button>
      </form>
    </div>
  );
}
