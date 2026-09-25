"use client";

import { SectionTitle } from "@/components/Pane";
import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  deleteFood,
  duplicateFood,
  updateFood,
} from "@/app/(coach)/aliments/actions";
import { FOOD_CATEGORIES, type FoodCategory, type FoodRow } from "@/lib/supabase/types";

const micro = "text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]";
// No width here: each use sets its own, and a w-full baked in would
// collide with every flex sibling placed beside it.
const cell =
  "h-10 rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-3 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink3)]";

/** Protein and carbs at 4 kcal a gram, fat at 9 — the same arithmetic the
 *  database does, so the screen never waits for a round trip to agree. */
function kcalOf(p: number, c: number, f: number) {
  return Math.round(p * 4 + c * 4 + f * 9);
}

export type FoodUsage = {
  plans: number;
  clients: number;
  logged: number;
};

/**
 * One food, edited in place. Macros are typed and calories are derived — never
 * both, so there is no second number to keep in step.
 */
export function FoodEditor({
  food,
  usage,
}: {
  food: FoodRow;
  usage: FoodUsage;
}) {
  const t = useTranslations("foods");
  const [, startTransition] = useTransition();

  const [name, setName] = useState(food.name);
  const [brand, setBrand] = useState(food.brand ?? "");
  const [servingLabel, setServingLabel] = useState(food.serving_label ?? "");
  const [servingG, setServingG] = useState(
    food.serving_g == null ? "" : String(food.serving_g),
  );
  const [cat, setCat] = useState<FoodCategory>(food.category);
  const [protein, setProtein] = useState(Number(food.protein_100g ?? 0));
  const [carbs, setCarbs] = useState(Number(food.carbs_100g ?? 0));
  const [fat, setFat] = useState(Number(food.fat_100g ?? 0));
  const [confirming, setConfirming] = useState(false);

  // A different food was picked: adopt its values rather than keeping the last.
  const shown = useRef(food.id);
  useEffect(() => {
    if (shown.current === food.id) return;
    shown.current = food.id;
    setName(food.name);
    setBrand(food.brand ?? "");
    setServingLabel(food.serving_label ?? "");
    setServingG(food.serving_g == null ? "" : String(food.serving_g));
    setCat(food.category);
    setProtein(Number(food.protein_100g ?? 0));
    setCarbs(Number(food.carbs_100g ?? 0));
    setFat(Number(food.fat_100g ?? 0));
    setConfirming(false);
  }, [food]);

  const kcal = kcalOf(protein, carbs, fat);
  const total = kcal || 1;

  function save(next?: Partial<Record<string, string | number>>) {
    const body = new FormData();
    body.set("food_id", food.id);
    body.set("name", String(next?.name ?? name));
    body.set("brand", String(next?.brand ?? brand));
    body.set("serving_label", String(next?.serving_label ?? servingLabel));
    body.set("serving_g", String(next?.serving_g ?? servingG));
    body.set("category", String(next?.category ?? cat));
    body.set("protein_100g", String(next?.protein_100g ?? protein));
    body.set("carbs_100g", String(next?.carbs_100g ?? carbs));
    body.set("fat_100g", String(next?.fat_100g ?? fat));
    startTransition(() => {
      void updateFood(body);
    });
  }

  const macros: {
    key: string;
    label: string;
    value: number;
    perGram: number;
    tone: string;
    set: (n: number) => void;
  }[] = [
    { key: "p", label: t("protein"), value: protein, perGram: 4, tone: "var(--a1)", set: setProtein },
    { key: "c", label: t("carbs"), value: carbs, perGram: 4, tone: "var(--a2)", set: setCarbs },
    { key: "f", label: t("fat"), value: fat, perGram: 9, tone: "var(--a3)", set: setFat },
  ];

  /** What one serving comes to, when the serving has a weight. */
  const perServing =
    food.serving_g && Number(servingG) > 0
      ? Math.round((kcal * Number(servingG)) / 100)
      : null;

  return (
    <div className="min-w-0 flex-1 overflow-y-auto p-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => save()}
            aria-label={t("name")}
            className="-ml-2 w-full min-w-0 rounded-r2 border border-transparent bg-transparent px-2 py-1 font-display text-[23px] font-extrabold tracking-[-.03em] text-[var(--ink)] hover:border-[var(--edge)] focus:border-[var(--accent-soft)] focus:bg-[var(--glass2)] focus:outline-none"
          />
          <p className="tnum mt-1 pl-0.5 text-[13px] text-[var(--ink2)]">
            {t("perHundred", { kcal })}
            {perServing != null
              ? ` · ${t("perServing", { kcal: perServing, serving: servingLabel || `${servingG} g` })}`
              : ""}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <form action={duplicateFood}>
            <input type="hidden" name="food_id" value={food.id} />
            <button type="submit" className="glass2 h-10 rounded-r2 px-3.5 text-[13px] font-semibold text-[var(--ink2)]">
              {t("duplicate")}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="glass2 h-10 rounded-r2 px-3.5 text-[13px] font-semibold text-[var(--ink2)] hover:text-[var(--a3)]"
          >
            {t("remove")}
          </button>
        </div>
      </header>

      {confirming && (
        <div role="alertdialog" className="mt-3 rounded-r2 border border-[var(--a3)] p-3">
          <p className="text-[13px] font-semibold text-[var(--a3)]">
            {t("confirmRemove", { name: food.name })}
          </p>
          <p className="mt-1 text-[13px] leading-[1.5] text-[var(--ink2)]">
            {t("confirmRemoveBody")}
          </p>
          <div className="mt-3 flex gap-2">
            <form action={deleteFood}>
              <input type="hidden" name="food_id" value={food.id} />
              <button type="submit" className="h-9 rounded-r2 border border-[var(--a3)] px-3 text-[13px] font-semibold text-[var(--a3)]">
                {t("remove")}
              </button>
            </form>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="h-9 rounded-r2 px-3 text-[13px] text-[var(--ink3)]"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(268px,1fr))] items-start gap-3">
        <section className="glass flex flex-col gap-3 rounded-r3 p-4">
          <SectionTitle icon="scale">{t("serving")}</SectionTitle>
          <div className="flex gap-2">
            <input
              value={servingLabel}
              onChange={(e) => setServingLabel(e.target.value)}
              onBlur={() => save()}
              placeholder={t("servingPlaceholder")}
              aria-label={t("serving")}
              className={`${cell} min-w-0 flex-1`}
            />
            <input
              value={servingG}
              onChange={(e) => setServingG(e.target.value)}
              onBlur={() => save()}
              inputMode="decimal"
              placeholder="g"
              aria-label={t("servingGrams")}
              className={`tnum ${cell} w-[84px] shrink-0`}
            />
          </div>
          <p className="text-[12px] leading-[1.45] text-[var(--ink3)]">
            {t("servingNote")}
          </p>

          <span className={micro}>{t("category")}</span>
          <div className="flex flex-wrap gap-1.5">
            {FOOD_CATEGORIES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={cat === value}
                onClick={() => {
                  setCat(value);
                  save({ category: value });
                }}
                className={`rounded-rp border border-[var(--edge)] px-3 py-1.5 text-[12px] font-semibold ${
                  cat === value ? "sel text-[var(--ink)]" : "bg-[var(--glass2)] text-[var(--ink2)]"
                }`}
              >
                {t(`cat.${value}`)}
              </button>
            ))}
          </div>

          <div
            className="flex items-center gap-3 rounded-r3 border border-[var(--edge)] p-3.5"
            style={{ background: "var(--wash1)" }}
          >
            <div className="min-w-0 flex-1">
              <span className={micro}>{t("calculated")}</span>
              <p className="tnum mt-1 font-display text-[26px] font-extrabold leading-none tracking-[-.03em]">
                {kcal} kcal
              </p>
            </div>
            <p className="max-w-[140px] shrink-0 text-right text-[12px] leading-[1.4] text-[var(--ink2)]">
              {t("calculatedNote")}
            </p>
          </div>
        </section>

        <section className="glass flex flex-col gap-2.5 rounded-r3 p-4">
          <SectionTitle icon="chart">{t("macrosPer100")}</SectionTitle>

          {macros.map((macro) => (
            <div
              key={macro.key}
              className="glass2 flex items-center gap-2.5 rounded-r2 p-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">{macro.label}</p>
                <p className="tnum text-[11.5px] text-[var(--ink3)]">
                  {t("shareOfCalories", {
                    pct: Math.round(((macro.value * macro.perGram) / total) * 100),
                  })}
                </p>
              </div>
              <button
                type="button"
                aria-label={t("less", { macro: macro.label })}
                onClick={() => {
                  const next = Math.max(0, macro.value - 1);
                  macro.set(next);
                  save({ [`${macro.key === "p" ? "protein" : macro.key === "c" ? "carbs" : "fat"}_100g`]: next });
                }}
                className="glass flex size-8 shrink-0 items-center justify-center rounded-r2 text-[14px] active:scale-[.9]"
              >
                −
              </button>
              <input
                value={macro.value}
                onChange={(e) => {
                  const next = Math.max(0, Math.min(400, Number(e.target.value.replace(/[^0-9.]/g, "")) || 0));
                  macro.set(next);
                }}
                onBlur={() => save()}
                inputMode="decimal"
                aria-label={macro.label}
                className="tnum glass h-8 w-[58px] shrink-0 rounded-r2 border border-[var(--edge)] text-center text-[13px] font-bold text-[var(--ink)]"
              />
              <button
                type="button"
                aria-label={t("more", { macro: macro.label })}
                onClick={() => {
                  const next = Math.min(400, macro.value + 1);
                  macro.set(next);
                  save({ [`${macro.key === "p" ? "protein" : macro.key === "c" ? "carbs" : "fat"}_100g`]: next });
                }}
                className="glass flex size-8 shrink-0 items-center justify-center rounded-r2 text-[14px] active:scale-[.9]"
              >
                +
              </button>
            </div>
          ))}

          {/* The calorie split, not the gram split: nine kcal a gram of fat is
              why those two pictures differ. */}
          <div className="mt-1 flex h-2.5 overflow-hidden rounded-rp bg-[var(--hair)]">
            {macros.map((macro) => (
              <div
                key={macro.key}
                style={{
                  width: `${((macro.value * macro.perGram) / total) * 100}%`,
                  background: macro.tone,
                  transition: "width .4s",
                }}
              />
            ))}
          </div>
          <p className="text-[12px] leading-[1.45] text-[var(--ink3)]">
            {t("splitNote")}
          </p>
        </section>

        <section className="glass flex flex-col gap-2.5 rounded-r3 p-4">
          <SectionTitle icon="clients">{t("usage")}</SectionTitle>
          {[
            { glyph: "◍", label: t("usagePlans"), count: usage.plans },
            { glyph: "◉", label: t("usageClients"), count: usage.clients },
            { glyph: "✎", label: t("usageLogged"), count: usage.logged },
          ].map((row) => (
            <div key={row.label} className="glass2 flex items-center gap-2.5 rounded-r2 p-2.5">
              <span
                aria-hidden
                className="glass flex size-7 shrink-0 items-center justify-center rounded-r2 text-[12px] text-[var(--ink2)]"
              >
                {row.glyph}
              </span>
              <span className="min-w-0 flex-1 text-[12.5px] leading-[1.35] text-[var(--ink2)]">
                {row.label}
              </span>
              <span className="tnum shrink-0 text-[13px] font-bold">{row.count}</span>
            </div>
          ))}
          <p className="text-[12px] leading-[1.45] text-[var(--ink3)]">
            {t("usageNote")}
          </p>
        </section>
      </div>
    </div>
  );
}
