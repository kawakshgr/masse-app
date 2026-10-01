"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { Card, Kicker } from "./ui";

export type EquivalentFood = {
  id: string;
  name: string;
  category: "protein" | "carb" | "fat" | "fruit" | "veg" | "other";
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  kcal: number | null;
};

const FAMILIES = [
  { key: "protein", icon: "egg", macro: "protein" },
  { key: "carb", icon: "bread", macro: "carbs" },
  { key: "fat", icon: "drop", macro: "fat" },
  { key: "fruit", icon: "foods", macro: "carbs" },
] as const;

/**
 * "What can I eat instead?" for a client on macros, not on fixed meals
 * (Kevin, 1 Oct 2026): a family, a food and a quantity, and the quantity of
 * every other food of the family that brings as much of the family's macro
 * — protein for proteins, carbs for carbs and fruit, fat for fats — from
 * the coach's own library. Rounded to 5 g; the calories show the rest.
 */
export function Equivalents({ foods }: { foods: EquivalentFood[] }) {
  const t = useTranslations("equivalents");
  const tCat = useTranslations("foods.cat");
  const locale = useLocale();
  const families = FAMILIES.filter((f) => foods.filter((food) => food.category === f.key).length >= 2);
  const [family, setFamily] = useState<(typeof FAMILIES)[number]["key"] | null>(families[0]?.key ?? null);
  const inFamily = useMemo(() => foods.filter((food) => food.category === family), [foods, family]);
  const [foodId, setFoodId] = useState<string | null>(null);
  const [grams, setGrams] = useState(100);

  if (families.length === 0) return null;
  const source = inFamily.find((food) => food.id === foodId) ?? inFamily[0];
  const macro = FAMILIES.find((f) => f.key === family)?.macro ?? "carbs";
  const per = (food: EquivalentFood) => Number(food[macro] ?? 0);
  const amount = source ? (per(source) * grams) / 100 : 0;

  const rows = source
    ? inFamily
        .filter((food) => food.id !== source.id && per(food) > 0)
        .map((food) => {
          const g = Math.max(5, Math.round((amount / per(food)) * 100 / 5) * 5);
          return { food, g, kcal: Math.round((Number(food.kcal ?? 0) * g) / 100) };
        })
        .sort((a, b) => a.food.name.localeCompare(b.food.name))
    : [];

  const step = (delta: number) => setGrams((g) => Math.min(1000, Math.max(10, g + delta)));
  const round =
    "flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--glass2)] text-[20px] leading-none text-[var(--ink)]";

  return (
    <Card className="space-y-3.5">
      <Kicker icon="recomp">{t("title")}</Kicker>
      <p className="text-[13px] leading-[1.45] text-[var(--ink2)]">{t("lede")}</p>

      <div className={`grid gap-2 ${families.length >= 4 ? "grid-cols-4" : families.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {families.map((f) => {
          const on = f.key === family;
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setFamily(f.key);
                setFoodId(null);
              }}
              className={`flex h-[76px] flex-col items-center justify-center gap-1.5 rounded-r3 border text-[11px] font-bold uppercase tracking-[.08em] ${
                on
                  ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_18%,var(--deep))]"
                  : "border-[var(--edge)] bg-[var(--glass2)] text-[var(--ink2)]"
              }`}
            >
              <span className={on ? "text-[var(--accent)]" : ""}>
                <Icon name={f.icon} size={24} />
              </span>
              {tCat(f.key)}
            </button>
          );
        })}
      </div>

      {source && (
        <>
          <select
            aria-label={t("food")}
            value={source.id}
            onChange={(e) => setFoodId(e.target.value)}
            className="h-12 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-3 text-[16px] font-semibold text-[var(--ink)]"
          >
            {inFamily.map((food) => (
              <option key={food.id} value={food.id}>
                {food.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-3">
            <button type="button" aria-label="− 10 g" onClick={() => step(-10)} className={round}>
              −
            </button>
            <span className="tnum flex-1 text-center font-display text-[28px] font-extrabold tracking-[-.03em]">
              {grams} g
            </span>
            <button type="button" aria-label="+ 10 g" onClick={() => step(10)} className={round}>
              +
            </button>
          </div>

          <p className="tnum text-center text-[12.5px] text-[var(--ink3)]">
            {t("brings", {
              grams: (Math.round(amount * 10) / 10).toLocaleString(locale),
              macro: t(`macro.${macro}`),
            })}
          </p>

          {rows.length > 0 ? (
            <ul className="space-y-1.5">
              <li className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--ink2)]">{t("same")}</li>
              {rows.map(({ food, g, kcal }) => (
                <li key={food.id} className="flex h-12 items-center justify-between gap-3 rounded-r2 bg-[var(--glass2)] px-3.5">
                  <span className="min-w-0 truncate text-[14px] font-semibold">{food.name}</span>
                  <span className="tnum shrink-0 text-right">
                    <span className="block text-[15px] font-bold">{g.toLocaleString(locale)} g</span>
                    <span className="block text-[11px] text-[var(--ink3)]">{kcal} kcal</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-[var(--ink3)]">{t("none")}</p>
          )}
        </>
      )}
    </Card>
  );
}
