import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { FoodEditor } from "@/components/FoodEditor";

/**
 * The selected food, or the designed empty state. Where a food is used is
 * counted from the rows that point at it, never estimated.
 */
export default async function FoodPage({
  searchParams,
}: {
  searchParams: Promise<{ aliment?: string }>;
}) {
  const t = await getTranslations("foods");
  const { aliment } = await searchParams;
  const supabase = await createClient();

  if (!aliment) {
    return (
      <div className="grid min-w-0 flex-1 place-items-center p-6">
        <div className="max-w-[46ch] text-center">
          <p className="text-[14px] font-semibold">{t("pickFood")}</p>
          <p className="mt-1.5 text-[13px] leading-[1.5] text-[var(--ink2)]">
            {t("lede")}
          </p>
        </div>
      </div>
    );
  }

  const { data: food } = await supabase
    .from("foods")
    .select("*")
    .eq("id", aliment)
    .maybeSingle();

  if (!food) {
    return (
      <div className="grid min-w-0 flex-1 place-items-center p-6">
        <p className="text-[13px] text-[var(--ink3)]">{t("gone")}</p>
      </div>
    );
  }

  // Real counts, from the rows that reference this food. `head: true` means
  // the count comes back without the rows.
  const [plansRes, loggedRes, clientRes] = await Promise.all([
    supabase
      .from("plan_meal_items")
      .select("meal_id", { count: "exact", head: true })
      .eq("food_id", aliment),
    supabase
      .from("meals")
      .select("id", { count: "exact", head: true })
      .eq("food_id", aliment),
    supabase.from("plan_meal_items").select("plan_meals(client_id)").eq("food_id", aliment),
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
