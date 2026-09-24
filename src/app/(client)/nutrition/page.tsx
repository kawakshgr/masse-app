import { getTranslations } from "next-intl/server";
import { clientSession } from "@/lib/clientData";
import { SUPPLEMENT_TIMINGS, type FoodRow, type MealRow } from "@/lib/supabase/types";
import { Card, CardTitle, Kicker, ScreenHeader, clean } from "@/components/client/ui";
import { MyWeek } from "@/components/MyWeek";
import { MealsPanel } from "@/components/MealsPanel";

type PlanMeal = {
  id: string;
  at_time: string;
  name: string;
  day_type_id: string | null;
  plan_meal_items: { id: string; name: string; quantity_g: number | null; position: number }[];
};

/**
 * Nutrition — NutritionView.swift: what the coach wrote for her to eat today,
 * read only. Nutrition hangs off the day type, not the weekday, so when she
 * moves a rest day the plan follows it.
 */
export default async function NutritionPage() {
  const { supabase, client, weekday, today } = await clientSession();
  const t = await getTranslations("fuel");
  const tNav = await getTranslations("clientNav");
  const tSupp = await getTranslations("supp");

  const [typesRes, weekRes, targetsRes, mealsRes, suppRes, foodsRes, loggedRes] =
    await Promise.all([
      supabase.from("day_types").select("id, name, is_rest").eq("client_id", client.id).order("position"),
      supabase.from("client_week_days").select("day_index, day_type_id").eq("client_id", client.id),
      supabase
        .from("nutrition_targets")
        .select("kcal, protein_g, carbs_g, fat_g, day_type_id")
        .eq("client_id", client.id),
      supabase
        .from("plan_meals")
        .select("id, at_time, name, day_type_id, plan_meal_items(id, name, quantity_g, position)")
        .eq("client_id", client.id)
        .order("at_time"),
      supabase
        .from("client_supplements")
        .select("id, name, dose, unit, timing, day_type_id")
        .eq("client_id", client.id)
        .order("position"),
      supabase.from("foods").select("id, name, brand").order("name"),
      supabase.from("meals").select("*").eq("day", today).order("logged_at"),
    ]);

  const types = typesRes.data ?? [];
  const weekRows = weekRes.data ?? [];
  const todayTypeId = weekRows.find((row) => row.day_index === weekday)?.day_type_id ?? null;
  const todayType = types.find((type) => type.id === todayTypeId) ?? null;

  // Rows for a null type are the default: what applies when the day has none.
  const targets = targetsRes.data ?? [];
  const target =
    targets.find((row) => row.day_type_id === todayTypeId) ??
    targets.find((row) => row.day_type_id === null) ??
    null;

  const meals = ((mealsRes.data ?? []) as unknown as PlanMeal[]).filter(
    (meal) => meal.day_type_id === todayTypeId,
  );

  // Hers for today plus the everyday ones, in the order the day runs.
  const order = new Map(SUPPLEMENT_TIMINGS.map((key, i) => [key, i] as const));
  const supplements = (suppRes.data ?? [])
    .filter((row) => row.day_type_id === null || row.day_type_id === todayTypeId)
    .sort((a, b) => (order.get(a.timing) ?? 9) - (order.get(b.timing) ?? 9));

  const empty = !target && meals.length === 0 && supplements.length === 0;

  return (
    <>
      <ScreenHeader
        kicker={tNav("fuel")}
        title={todayType?.name ?? tNav("fuel")}
        sub={todayType?.is_rest ? t("restDay") : null}
      />

      {target && (
        <Card className="space-y-3">
          <Kicker>{t("daily")}</Kicker>
          <p className="flex items-baseline gap-1.5">
            <span className="tnum font-display text-[56px] font-extrabold leading-none tracking-[-.04em]">
              {target.kcal}
            </span>
            <span className="text-[15px] text-[var(--ink3)]">kcal</span>
          </p>
          <div className="flex gap-2.5">
            <Macro label={t("protein")} grams={target.protein_g} />
            <Macro label={t("carbs")} grams={target.carbs_g} />
            <Macro label={t("fat")} grams={target.fat_g} />
          </div>
        </Card>
      )}

      {meals.length > 0 && (
        <Card className="space-y-3.5">
          <Kicker>{t("meals")}</Kicker>
          {meals.map((meal) => (
            <div key={meal.id} className="space-y-1.5">
              <p className="flex items-baseline justify-between gap-2">
                <span className="text-[15px] font-semibold">{meal.name}</span>
                <span className="tnum text-[13px] text-[var(--ink3)]">{meal.at_time.slice(0, 5)}</span>
              </p>
              {[...meal.plan_meal_items]
                .sort((a, b) => a.position - b.position)
                .map((item) => (
                  <p key={item.id} className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="text-[var(--ink2)]">{item.name}</span>
                    {item.quantity_g !== null && (
                      <span className="tnum text-[var(--ink3)]">{clean(Number(item.quantity_g))} g</span>
                    )}
                  </p>
                ))}
            </div>
          ))}
        </Card>
      )}

      {supplements.length > 0 && (
        <Card className="space-y-2.5">
          <Kicker>{t("supplements")}</Kicker>
          {supplements.map((row) => (
            <div key={row.id} className="flex items-baseline justify-between gap-2.5">
              <span>
                <span className="block text-[15px] font-semibold">{row.name}</span>
                <span className="block text-[13px] text-[var(--ink3)]">
                  {tSupp(`timing.${row.timing}`)}
                </span>
              </span>
              {row.dose !== null && (
                <span className="tnum shrink-0 text-[15px] font-semibold text-[var(--ink2)]">
                  {clean(Number(row.dose))}{" "}
                  {tSupp(`unit.${row.unit}`, { count: Math.round(Number(row.dose)) })}
                </span>
              )}
            </div>
          ))}
        </Card>
      )}

      {empty && (
        <Card>
          <CardTitle>{t("empty")}</CardTitle>
        </Card>
      )}

      <MyWeek
        clientId={client.id}
        week={[0, 1, 2, 3, 4, 5, 6].map((day) => {
          const id = weekRows.find((row) => row.day_index === day)?.day_type_id;
          return types.find((type) => type.id === id)?.name ?? null;
        })}
        types={types.map((type) => ({ id: type.id, name: type.name, isRest: type.is_rest }))}
      />

      <MealsPanel
        day={today}
        foods={(foodsRes.data ?? []) as Pick<FoodRow, "id" | "name" | "brand">[]}
        meals={(loggedRes.data ?? []) as MealRow[]}
      />
    </>
  );
}

function Macro({ label, grams }: { label: string; grams: number | null }) {
  return (
    <div className="flex-1 rounded-r1 bg-[var(--glass2)] px-3 py-2.5">
      <p className="text-[13px] text-[var(--ink2)]">{label}</p>
      <p className="tnum text-[15px] font-semibold">
        {grams === null ? "—" : `${clean(Number(grams))} g`}
      </p>
    </div>
  );
}
