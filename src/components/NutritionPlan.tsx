"use client";

import { useTranslations } from "next-intl";
import {
  addPlanMeal,
  addPlanMealItem,
  deletePlanMeal,
  deletePlanMealItem,
  saveNutritionTargets,
  setNutritionMode,
  updatePlanMeal,
} from "@/app/(coach)/clients/nutrition-actions";
import type { NutritionMode } from "@/lib/supabase/types";

export type PlanItem = {
  id: string;
  name: string;
  quantityG: number | null;
  kcal: number | null;
};

export type PlanMeal = {
  id: string;
  atTime: string;
  name: string;
  items: PlanItem[];
};

export type Targets = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

// No width here on purpose: each use sets its own, and a w-full baked in
// would collide with every fixed width placed beside it.
const cell =
  "h-8 rounded-r2 border border-[var(--edge)] bg-[var(--glass)] px-2 text-[12px] text-[var(--ink)]";

/** Protein and carbs at 4 kcal a gram, fat at 9 — the usual arithmetic. */
function kcalFromMacros(t: Targets): number {
  return t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9;
}

function Macro({
  label,
  name,
  grams,
  perGram,
  kcal,
  shareLabel,
}: {
  label: string;
  name: string;
  grams: number;
  perGram: number;
  kcal: number;
  shareLabel: (pct: number) => string;
}) {
  // Derived from the same grams the input holds, so the two cannot disagree.
  const pct = kcal > 0 ? Math.round((grams * perGram * 100) / kcal) : 0;

  return (
    <div className="flex items-center justify-between gap-3 rounded-r2 border border-[var(--hair)] px-3 py-2">
      <span className="min-w-0">
        <span className="block text-[12px] font-semibold">{label}</span>
        <span className="tnum block text-[10px] text-[var(--ink3)]">
          {shareLabel(pct)}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <input name={name} inputMode="numeric" defaultValue={grams} className={`tnum w-[74px] text-right ${cell}`} />
        <span className="text-[10px] text-[var(--ink3)]">g</span>
      </span>
    </div>
  );
}

export function NutritionPlan({
  clientId,
  firstName,
  mode,
  targets,
  meals,
  foods,
  offPlan,
}: {
  clientId: string;
  firstName: string;
  mode: NutritionMode;
  targets: Targets;
  meals: PlanMeal[];
  foods: { id: string; name: string }[];
  offPlan: { id: string; name: string; day: string; kcal: number | null }[];
}) {
  const t = useTranslations("nut");

  const fromMacros = kcalFromMacros(targets);
  const gap = fromMacros - targets.kcal;
  // The prototype's own threshold: past 120 kcal the mismatch is worth saying.
  const drifting = Math.abs(gap) > 120;

  const planTotal = meals.reduce(
    (sum, meal) =>
      sum + meal.items.reduce((s, item) => s + Number(item.kcal ?? 0), 0),
    0,
  );

  return (
    <div className="flex flex-wrap gap-4">
      <section className="glass min-w-[300px] flex-1 rounded-r3 p-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
          {t("fed", { first: firstName })}
        </h3>

        <div className="mt-3 flex gap-2">
          {(["macros", "plan"] as const).map((value) => (
            <form key={value} action={setNutritionMode} className="min-w-0 flex-1">
              <input type="hidden" name="client_id" value={clientId} />
              <input type="hidden" name="mode" value={value} />
              <button
                type="submit"
                aria-pressed={mode === value}
                className={`h-9 w-full rounded-r2 text-[12px] font-semibold ${
                  mode === value
                    ? "text-[var(--onA)]"
                    : "border border-[var(--edge)] text-[var(--ink2)]"
                }`}
                style={
                  mode === value
                    ? { background: "linear-gradient(140deg, var(--a1), var(--a2))" }
                    : undefined
                }
              >
                {t(value === "macros" ? "modeMacros" : "modePlan")}
              </button>
            </form>
          ))}
        </div>

        <p className="mt-2 text-[11px] leading-relaxed text-[var(--ink2)]">
          {t(mode === "macros" ? "noteMacros" : "notePlan", { first: firstName })}
        </p>

        <form action={saveNutritionTargets} className="mt-4">
          <input type="hidden" name="client_id" value={clientId} />

          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
            {t("daily")}
          </p>
          <input
            name="kcal"
            inputMode="numeric"
            defaultValue={targets.kcal}
            aria-label={t("daily")}
            className="tnum mt-1 h-12 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass)] px-3 text-center font-display text-[24px] font-extrabold tracking-[-.04em] text-[var(--ink)]"
          />

          {/* The cross-check. It turns coral when the macros stop adding up. */}
          <p
            className={`tnum mt-1 text-[10px] ${
              drifting ? "text-[var(--a3)]" : "text-[var(--ink3)]"
            }`}
          >
            {t("fromMacros", { kcal: fromMacros.toLocaleString("fr-FR") })}
            {drifting && ` · ${t("drift", { gap: Math.abs(gap) })}`}
          </p>

          <div className="mt-3 space-y-2">
            <Macro label={t("protein")} name="protein_g" grams={targets.proteinG} perGram={4} kcal={targets.kcal} shareLabel={(pct) => t("share", { pct })} />
            <Macro label={t("carbs")} name="carbs_g" grams={targets.carbsG} perGram={4} kcal={targets.kcal} shareLabel={(pct) => t("share", { pct })} />
            <Macro label={t("fat")} name="fat_g" grams={targets.fatG} perGram={9} kcal={targets.kcal} shareLabel={(pct) => t("share", { pct })} />
          </div>

          <button
            type="submit"
            className="mt-3 h-9 w-full rounded-rp bg-[var(--accent)] text-[12px] font-semibold text-[var(--on-accent)]"
          >
            {t("apply")}
          </button>
        </form>
      </section>

      <div className="min-w-[300px] flex-1 space-y-4">
        <section className="glass rounded-r3 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
              {t(mode === "plan" ? "fixedPlan" : "mealTimes")}
            </h3>
            <span className="tnum text-[10px] text-[var(--ink3)]">
              {t("mealsCount", { count: meals.length })}
            </span>
          </div>

          {meals.length === 0 ? (
            <p className="mt-2 text-[11px] text-[var(--ink2)]">{t("noMeals")}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {meals.map((meal) => {
                const mealKcal = meal.items.reduce(
                  (s, i) => s + Number(i.kcal ?? 0),
                  0,
                );

                return (
                  <li key={meal.id} className="rounded-r2 border border-[var(--hair)] p-2">
                    <form action={updatePlanMeal} className="flex items-center gap-2">
                      <input type="hidden" name="meal_id" value={meal.id} />
                      <input type="hidden" name="client_id" value={clientId} />
                      <input
                        type="time"
                        name="at_time"
                        defaultValue={meal.atTime.slice(0, 5)}
                        aria-label={t("mealTime")}
                        className={`tnum w-[88px] shrink-0 ${cell}`}
                      />
                      <input
                        name="name"
                        defaultValue={meal.name}
                        aria-label={t("mealName")}
                        className={`w-full min-w-0 flex-1 ${cell}`}
                      />
                      {mode === "plan" && mealKcal > 0 && (
                        <span className="tnum shrink-0 text-[11px] text-[var(--ink3)]">
                          {Math.round(mealKcal)} kcal
                        </span>
                      )}
                      <button
                        type="submit"
                        className="shrink-0 rounded-r1 border border-[var(--edge)] px-2 py-1 text-[10px] text-[var(--ink2)]"
                      >
                        {t("apply")}
                      </button>
                    </form>

                    {/* Items only matter when she is being given exact meals. */}
                    {mode === "plan" && (
                      <>
                        {meal.items.length > 0 && (
                          <ul className="mt-1">
                            {meal.items.map((item) => (
                              <li
                                key={item.id}
                                className="flex items-center gap-2 border-b border-[var(--hair)] py-1 last:border-0"
                              >
                                <span className="min-w-0 flex-1 truncate text-[11px]">
                                  {item.name}
                                </span>
                                <span className="tnum shrink-0 text-[10px] text-[var(--ink3)]">
                                  {item.quantityG ? `${item.quantityG} g` : "—"}
                                  {item.kcal ? ` · ${Math.round(item.kcal)} kcal` : ""}
                                </span>
                                <form action={deletePlanMealItem} className="shrink-0">
                                  <input type="hidden" name="item_id" value={item.id} />
                                  <input type="hidden" name="client_id" value={clientId} />
                                  <button
                                    type="submit"
                                    aria-label={t("remove")}
                                    className="px-1 text-[10px] text-[var(--ink3)] hover:text-[var(--a3)]"
                                  >
                                    ×
                                  </button>
                                </form>
                              </li>
                            ))}
                          </ul>
                        )}

                        <form action={addPlanMealItem} className="mt-1 flex flex-wrap items-center gap-1">
                          <input type="hidden" name="meal_id" value={meal.id} />
                          <input type="hidden" name="client_id" value={clientId} />
                          <select name="food_id" defaultValue="" className={`w-full min-w-0 flex-1 ${cell}`} aria-label={t("pickFood")}>
                            <option value="">{t("pickFood")}</option>
                            {foods.map((food) => (
                              <option key={food.id} value={food.id}>
                                {food.name}
                              </option>
                            ))}
                          </select>
                          <input name="name" placeholder={t("freeItem")} aria-label={t("freeItem")} className={`w-[110px] shrink-0 ${cell}`} />
                          <input name="quantity_g" inputMode="decimal" placeholder={t("grams")} aria-label={t("grams")} className={`tnum w-[60px] shrink-0 ${cell}`} />
                          <button
                            type="submit"
                            className="shrink-0 rounded-r1 border border-[var(--edge)] px-2 py-1 text-[10px] text-[var(--accent)]"
                          >
                            +
                          </button>
                        </form>
                      </>
                    )}

                    <form action={deletePlanMeal} className="mt-1 flex justify-end">
                      <input type="hidden" name="meal_id" value={meal.id} />
                      <input type="hidden" name="client_id" value={clientId} />
                      <button
                        type="submit"
                        className="px-1 text-[10px] text-[var(--ink3)] hover:text-[var(--a3)]"
                      >
                        {t("remove")}
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}

          <form action={addPlanMeal} className="mt-2 flex items-center gap-2">
            <input type="hidden" name="client_id" value={clientId} />
            <input type="time" name="at_time" defaultValue="07:30" aria-label={t("mealTime")} className={`tnum w-[88px] shrink-0 ${cell}`} />
            <input name="name" placeholder={t("mealName")} aria-label={t("mealName")} className={`w-full min-w-0 flex-1 ${cell}`} />
            <button
              type="submit"
              className="shrink-0 rounded-rp border border-[var(--edge)] px-3 py-1.5 text-[11px] font-semibold text-[var(--ink2)]"
            >
              {t("addMeal")}
            </button>
          </form>

          {mode === "plan" && planTotal > 0 && (
            <p className="tnum mt-2 text-[10px] text-[var(--ink3)]">
              {t("planTotal")} {Math.round(planTotal).toLocaleString("fr-FR")} kcal ·{" "}
              {planTotal <= targets.kcal
                ? t("targetGap", { gap: Math.round(targets.kcal - planTotal) })
                : t("targetOver", { gap: Math.round(planTotal - targets.kcal) })}
            </p>
          )}
        </section>

        <section className="glass rounded-r3 p-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
            {t("offPlan")}
          </h3>
          {offPlan.length === 0 ? (
            <p className="mt-2 text-[11px] text-[var(--ink2)]">{t("noOffPlan")}</p>
          ) : (
            <>
              <ul className="mt-2">
                {offPlan.map((meal) => (
                  <li
                    key={meal.id}
                    className="flex items-center gap-3 border-b border-[var(--hair)] py-1.5 last:border-0"
                  >
                    <span className="tnum shrink-0 text-[10px] text-[var(--ink3)]">
                      {meal.day}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px]">{meal.name}</span>
                    <span className="tnum shrink-0 text-[10px] text-[var(--ink3)]">
                      {meal.kcal ? `${Math.round(meal.kcal)} kcal` : "—"}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] leading-relaxed text-[var(--ink3)]">
                {t("offPlanNote")}
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
