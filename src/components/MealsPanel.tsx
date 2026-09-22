"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { deleteMeal, logMeal } from "@/app/aujourdhui/actions";
import type { FoodRow, MealRow } from "@/lib/supabase/types";

const cell =
  "h-9 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink3)]";

export function MealsPanel({
  day,
  foods,
  meals,
}: {
  day: string;
  foods: Pick<FoodRow, "id" | "name" | "brand">[];
  meals: MealRow[];
}) {
  const t = useTranslations("meals");
  const [foodId, setFoodId] = useState("");

  // Totals are summed from the rows shown right below them.
  const total = meals.reduce(
    (acc, meal) => ({
      kcal: acc.kcal + Number(meal.kcal ?? 0),
      protein: acc.protein + Number(meal.protein_g ?? 0),
      carbs: acc.carbs + Number(meal.carbs_g ?? 0),
      fat: acc.fat + Number(meal.fat_g ?? 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <section className="glass rounded-r3 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[10px] uppercase tracking-[.14em] text-[var(--ink2)]">
          {t("title")}
        </h2>
        {meals.length > 0 && (
          <span className="tnum text-[11px] text-[var(--ink2)]">
            {t("total")} · {Math.round(total.kcal)} kcal · P {Math.round(total.protein)} ·
            G {Math.round(total.carbs)} · L {Math.round(total.fat)}
          </span>
        )}
      </div>

      <form action={logMeal} className="mt-3 flex flex-wrap items-end gap-2">
        <input type="hidden" name="day" value={day} />

        <label className="block min-w-[150px] flex-1">
          <span className="block text-[10px] text-[var(--ink2)]">{t("pick")}</span>
          <select
            name="food_id"
            value={foodId}
            onChange={(event) => setFoodId(event.target.value)}
            className={`mt-1 ${cell}`}
          >
            <option value="">—</option>
            {foods.map((food) => (
              <option key={food.id} value={food.id}>
                {food.name}
                {food.brand ? ` · ${food.brand}` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="block min-w-[140px] flex-1">
          <span className="block text-[10px] text-[var(--ink2)]">{t("free")}</span>
          <input
            name="name"
            required={foodId === ""}
            placeholder={t("name")}
            className={`mt-1 ${cell}`}
          />
        </label>

        <label className="block w-[110px]">
          <span className="block text-[10px] text-[var(--ink2)]">{t("quantity")}</span>
          <input name="quantity_g" inputMode="decimal" className={`tnum mt-1 ${cell}`} />
        </label>

        <label className="block w-[110px]">
          <span className="block text-[10px] text-[var(--ink2)]">{t("slot")}</span>
          <input name="slot" className={`mt-1 ${cell}`} />
        </label>

        <button
          type="submit"
          className="h-9 shrink-0 rounded-rp cta px-4 text-[12px] font-bold text-[var(--on-accent)]"
        >
          {t("add")}
        </button>
      </form>

      {meals.length === 0 ? (
        <p className="mt-3 text-[11px] text-[var(--ink2)]">{t("none")}</p>
      ) : (
        <ul className="mt-3">
          {meals.map((meal) => (
            <li
              key={meal.id}
              className="flex items-center gap-3 border-b border-[var(--hair)] py-2 last:border-0"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-bold">
                  {meal.name}
                </span>
                <span className="tnum block truncate text-[11px] text-[var(--ink3)]">
                  {[
                    meal.slot,
                    meal.quantity_g ? `${meal.quantity_g} g` : null,
                    meal.kcal ? `${Math.round(Number(meal.kcal))} kcal` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </span>
              </span>
              <form action={deleteMeal} className="shrink-0">
                <input type="hidden" name="meal_id" value={meal.id} />
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
    </section>
  );
}
