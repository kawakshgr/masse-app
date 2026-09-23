"use client";

import { useState } from "react";
import { MacroDonut } from "@/components/MacroDonut";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { FoodPicker, type PickableFood } from "@/components/FoodPicker";
import {
  addPlanMeal,
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
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
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
  "h-8 rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2 text-[13px] text-[var(--ink)]";

/** Protein and carbs at 4 kcal a gram, fat at 9 — the usual arithmetic. */
function kcalFromMacros(t: Targets): number {
  return t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9;
}

function Step({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-7 shrink-0 items-center justify-center rounded-rp border border-[var(--edge)] bg-[var(--glass2)] text-[14px] leading-none text-[var(--ink2)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
    >
      {label}
    </button>
  );
}

function Macro({
  label,
  grams,
  perGram,
  kcal,
  shareLabel,
  onChange,
}: {
  label: string;
  grams: number;
  perGram: number;
  kcal: number;
  shareLabel: (pct: number) => string;
  onChange: (next: number) => void;
}) {
  // Derived from the grams held in state, so it moves as she types or steps.
  const pct = kcal > 0 ? Math.round((grams * perGram * 100) / kcal) : 0;

  return (
    <div className="flex items-center justify-between gap-2 rounded-r2 border border-[var(--hair)] px-3 py-2">
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold">{label}</span>
        <span className="tnum block text-[11px] text-[var(--ink2)]">
          {shareLabel(pct)}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <Step label="−" onClick={() => onChange(Math.max(0, grams - 5))} />
        <input
          inputMode="numeric"
          value={grams}
          onChange={(event) => {
            const n = Number(event.target.value.replace(/[^0-9]/g, ""));
            onChange(Number.isFinite(n) ? n : 0);
          }}
          className={`tnum w-[62px] text-center ${cell}`}
        />
        <span className="text-[11px] text-[var(--ink3)]">g</span>
        <Step label="+" onClick={() => onChange(grams + 5)} />
      </span>
    </div>
  );
}

/**
 * Held in state so every derived figure moves while she works. Remounted by
 * key when a save returns new values, which resyncs without an effect.
 */
function TargetsEditor({
  clientId,
  targets,
}: {
  clientId: string;
  targets: Targets;
}) {
  const t = useTranslations("nut");
  const [draft, setDraft] = useState(targets);

  const fromMacros = kcalFromMacros(draft);
  const gap = fromMacros - draft.kcal;
  // The prototype's own threshold: past 120 kcal the mismatch is worth saying.
  const drifting = Math.abs(gap) > 120;

  return (
    <form action={saveNutritionTargets} className="mt-4">
      <input type="hidden" name="client_id" value={clientId} />
      <input type="hidden" name="kcal" value={draft.kcal} />
      <input type="hidden" name="protein_g" value={draft.proteinG} />
      <input type="hidden" name="carbs_g" value={draft.carbsG} />
      <input type="hidden" name="fat_g" value={draft.fatG} />

      <p className="text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
        {t("daily")}
      </p>

      <div className="mt-1 flex items-center gap-2">
        <Step
          label="−"
          onClick={() =>
            setDraft((d) => ({ ...d, kcal: Math.max(1200, d.kcal - 50) }))
          }
        />
        <input
          inputMode="numeric"
          value={draft.kcal}
          aria-label={t("daily")}
          onChange={(event) => {
            const n = Number(event.target.value.replace(/[^0-9]/g, ""));
            setDraft((d) => ({ ...d, kcal: Number.isFinite(n) ? n : 0 }));
          }}
          className="tnum h-12 min-w-0 flex-1 rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-3 text-center font-display text-[24px] font-extrabold tracking-[-.03em] text-[var(--ink)]"
        />
        <Step label="+" onClick={() => setDraft((d) => ({ ...d, kcal: d.kcal + 50 }))} />
      </div>

      {/* The cross-check. It turns coral when the macros stop adding up. */}
      <p
        className={`tnum mt-1 text-[11px] ${
          drifting ? "text-[var(--a3)]" : "text-[var(--ink3)]"
        }`}
      >
        {t("fromMacros", { kcal: fromMacros.toLocaleString("fr-FR") })}
        {drifting && ` · ${t("drift", { gap: Math.abs(gap) })}`}
      </p>

      <div className="mt-3">
        <MacroDonut
          proteinG={draft.proteinG}
          carbsG={draft.carbsG}
          fatG={draft.fatG}
          centre={`${draft.kcal.toLocaleString("fr-FR")}`}
          caption="kcal"
          labels={{ protein: t("protein"), carbs: t("carbs"), fat: t("fat") }}
        />
      </div>

      <div className="mt-3 space-y-2">
        <Macro
          label={t("protein")}
          grams={draft.proteinG}
          perGram={4}
          kcal={draft.kcal}
          shareLabel={(pct) => t("share", { pct })}
          onChange={(proteinG) => setDraft((d) => ({ ...d, proteinG }))}
        />
        <Macro
          label={t("carbs")}
          grams={draft.carbsG}
          perGram={4}
          kcal={draft.kcal}
          shareLabel={(pct) => t("share", { pct })}
          onChange={(carbsG) => setDraft((d) => ({ ...d, carbsG }))}
        />
        <Macro
          label={t("fat")}
          grams={draft.fatG}
          perGram={9}
          kcal={draft.kcal}
          shareLabel={(pct) => t("share", { pct })}
          onChange={(fatG) => setDraft((d) => ({ ...d, fatG }))}
        />
      </div>

      <button
        type="submit"
        className="mt-3 h-9 w-full rounded-r2 cta text-[13px] font-semibold text-[var(--on-accent)]"
      >
        {t("apply")}
      </button>
    </form>
  );
}

/**
 * In plan mode the coach builds the day out of foods, so the calories and the
 * split are read off the plan rather than typed. The only thing still hers to
 * set is what she is aiming at, which is what makes "under target" mean
 * anything.
 */
function PlanTotals({
  clientId,
  targets,
  meals,
}: {
  clientId: string;
  targets: Targets;
  meals: PlanMeal[];
}) {
  const t = useTranslations("nut");

  const items = meals.flatMap((meal) => meal.items);
  const total = items.reduce(
    (acc, item) => ({
      kcal: acc.kcal + Number(item.kcal ?? 0),
      proteinG: acc.proteinG + Number(item.proteinG ?? 0),
      carbsG: acc.carbsG + Number(item.carbsG ?? 0),
      fatG: acc.fatG + Number(item.fatG ?? 0),
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );

  const gap = Math.round(total.kcal - targets.kcal);
  const empty = items.length === 0;

  return (
    <div className="mt-4">
      <p className="text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
        {t("daily")}
      </p>

      {empty ? (
        <p className="mt-2 text-[12px] text-[var(--ink2)]">{t("planEmpty")}</p>
      ) : (
        <>
          <p className="tnum mt-1 font-display text-[28px] font-extrabold leading-none tracking-[-.03em]">
            {Math.round(total.kcal).toLocaleString("fr-FR")}
            <span className="ml-1 text-[13px] font-normal text-[var(--ink3)]">kcal</span>
          </p>
          <p className="mt-1 text-[11px] text-[var(--ink3)]">{t("planDerived")}</p>

          <div className="mt-3">
            <MacroDonut
              proteinG={Math.round(total.proteinG)}
              carbsG={Math.round(total.carbsG)}
              fatG={Math.round(total.fatG)}
              centre={`${Math.round(total.proteinG)} / ${Math.round(total.carbsG)} / ${Math.round(total.fatG)}`}
              caption="g"
              labels={{ protein: t("protein"), carbs: t("carbs"), fat: t("fat") }}
            />
          </div>
        </>
      )}

      {/* Still hers to set: it is what "under target" is measured against. */}
      <form action={saveNutritionTargets} className="mt-4 flex items-end gap-2">
        <input type="hidden" name="client_id" value={clientId} />
        <input type="hidden" name="protein_g" value={targets.proteinG} />
        <input type="hidden" name="carbs_g" value={targets.carbsG} />
        <input type="hidden" name="fat_g" value={targets.fatG} />
        <label className="block min-w-0 flex-1">
          <span className="block text-[11px] text-[var(--ink2)]">{t("aimFor")}</span>
          <input
            name="kcal"
            inputMode="numeric"
            defaultValue={targets.kcal}
            className={`tnum mt-1 w-full ${cell}`}
          />
        </label>
        <button
          type="submit"
          className="h-8 shrink-0 rounded-rp border border-[var(--edge)] bg-[var(--glass2)] px-3 text-[12px] font-semibold text-[var(--ink2)]"
        >
          {t("apply")}
        </button>
      </form>

      {!empty && (
        <p
          className={`tnum mt-2 text-[11px] ${
            Math.abs(gap) > 300 ? "text-[var(--a3)]" : "text-[var(--ink3)]"
          }`}
        >
          {gap <= 0
            ? t("targetGap", { gap: Math.abs(gap) })
            : t("targetOver", { gap })}
        </p>
      )}
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
  foodAsks,
}: {
  clientId: string;
  firstName: string;
  mode: NutritionMode;
  targets: Targets;
  meals: PlanMeal[];
  foods: PickableFood[];
  offPlan: { id: string; name: string; day: string; kcal: number | null }[];
  /** Names the client typed because the library had nothing to match. */
  foodAsks: string[];
}) {
  const t = useTranslations("nut");

  const planTotal = meals.reduce(
    (sum, meal) =>
      sum + meal.items.reduce((s, item) => s + Number(item.kcal ?? 0), 0),
    0,
  );

  return (
    <div className="flex flex-wrap gap-4">
      <section className="glass min-w-[300px] flex-1 rounded-r3 p-4">
        <h3 className="text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
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
                className={`h-9 w-full rounded-r2 text-[13px] font-semibold ${
                  mode === value
                    ? "text-[var(--onA)]"
                    : "border border-[var(--edge)] bg-[var(--glass2)] text-[var(--ink2)]"
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

        <p className="mt-2 text-[12px] leading-[1.5] text-[var(--ink2)]">
          {t(mode === "macros" ? "noteMacros" : "notePlan", { first: firstName })}
        </p>

        {mode === "macros" ? (
          <TargetsEditor
            key={`${targets.kcal}-${targets.proteinG}-${targets.carbsG}-${targets.fatG}`}
            clientId={clientId}
            targets={targets}
          />
        ) : (
          <PlanTotals clientId={clientId} targets={targets} meals={meals} />
        )}
      </section>

      <div className="min-w-[300px] flex-1 space-y-4">
        <section className="glass rounded-r3 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
              {t(mode === "plan" ? "fixedPlan" : "mealTimes")}
            </h3>
            <span className="tnum text-[11px] text-[var(--ink3)]">
              {t("mealsCount", { count: meals.length })}
            </span>
          </div>

          {meals.length === 0 ? (
            <p className="mt-2 text-[12px] text-[var(--ink2)]">{t("noMeals")}</p>
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
                        <span className="tnum shrink-0 text-[12px] text-[var(--ink3)]">
                          {Math.round(mealKcal)} kcal
                        </span>
                      )}
                      <button
                        type="submit"
                        className="shrink-0 rounded-r1 border border-[var(--edge)] px-2 py-1 text-[11px] text-[var(--ink2)]"
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
                                <span className="min-w-0 flex-1 truncate text-[12px]">
                                  {item.name}
                                </span>
                                <span className="tnum shrink-0 text-[11px] text-[var(--ink3)]">
                                  {item.quantityG ? `${item.quantityG} g` : "—"}
                                  {item.kcal ? ` · ${Math.round(item.kcal)} kcal` : ""}
                                </span>
                                <form action={deletePlanMealItem} className="shrink-0">
                                  <input type="hidden" name="item_id" value={item.id} />
                                  <input type="hidden" name="client_id" value={clientId} />
                                  <button
                                    type="submit"
                                    aria-label={t("remove")}
                                    className="px-1 text-[11px] text-[var(--ink3)] hover:text-[var(--a3)]"
                                  >
                                    ×
                                  </button>
                                </form>
                              </li>
                            ))}
                          </ul>
                        )}

                        <FoodPicker
                          mealId={meal.id}
                          clientId={clientId}
                          foods={foods}
                        />
                      </>
                    )}

                    <form action={deletePlanMeal} className="mt-1 flex justify-end">
                      <input type="hidden" name="meal_id" value={meal.id} />
                      <input type="hidden" name="client_id" value={clientId} />
                      <button
                        type="submit"
                        className="px-1 text-[11px] text-[var(--ink3)] hover:text-[var(--a3)]"
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
              className="shrink-0 rounded-rp border border-[var(--edge)] bg-[var(--glass2)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink2)]"
            >
              {t("addMeal")}
            </button>
          </form>

          {mode === "plan" && planTotal > 0 && (
            <p className="tnum mt-2 text-[11px] text-[var(--ink3)]">
              {t("planTotal")} {Math.round(planTotal).toLocaleString("fr-FR")} kcal ·{" "}
              {planTotal <= targets.kcal
                ? t("targetGap", { gap: Math.round(targets.kcal - planTotal) })
                : t("targetOver", { gap: Math.round(planTotal - targets.kcal) })}
            </p>
          )}
        </section>

        {foodAsks.length > 0 && (
          <section className="glass rounded-r3 p-4">
            <h3 className="text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
              {t("foodAsks")}
            </h3>
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {foodAsks.map((name) => (
                <li key={name}>
                  {/* Straight into the library with the name already searched:
                      the next log uses her numbers instead of a guess. */}
                  <Link
                    href={`/aliments?q=${encodeURIComponent(name)}`}
                    className="glass2 flex items-center gap-2 rounded-r2 px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                      {name}
                    </span>
                    <span className="shrink-0 text-[11.5px] font-semibold text-[var(--accent-soft)]">
                      {t("addToLibrary")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-2.5 text-[12px] leading-[1.5] text-[var(--ink2)]">
              {t("foodAsksNote")}
            </p>
          </section>
        )}

        <section className="glass rounded-r3 p-4">
          <h3 className="text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
            {t("offPlan")}
          </h3>
          {offPlan.length === 0 ? (
            <p className="mt-2 text-[12px] text-[var(--ink2)]">{t("noOffPlan")}</p>
          ) : (
            <>
              <ul className="mt-2">
                {offPlan.map((meal) => (
                  <li
                    key={meal.id}
                    className="flex items-center gap-3 border-b border-[var(--hair)] py-1.5 last:border-0"
                  >
                    <span className="tnum shrink-0 text-[11px] text-[var(--ink3)]">
                      {meal.day}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12px]">{meal.name}</span>
                    <span className="tnum shrink-0 text-[11px] text-[var(--ink3)]">
                      {meal.kcal ? `${Math.round(meal.kcal)} kcal` : "—"}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] leading-[1.5] text-[var(--ink3)]">
                {t("offPlanNote")}
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
