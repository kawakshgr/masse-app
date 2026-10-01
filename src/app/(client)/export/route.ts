import { getLocale, getTranslations } from "next-intl/server";
import { intl } from "@/lib/locale";
import type { NextRequest } from "next/server";
import {
  adjustExercise,
  changesNutrition,
  changesTraining,
  clientSession,
  currentWeek,
  cycleLevers,
  targetLine,
  weekPlan,
} from "@/lib/clientData";
import { renderClientPdf, type ClientPdfDayType } from "@/lib/clientPdf";
import { logoUrl } from "@/lib/logo";
import { SUPPLEMENT_TIMINGS, type SupplementUnit } from "@/lib/supabase/types";

/** "62,5" in French, "62.5" in English; "60.0" becomes "60". */
const figure = (v: number, locale: string) =>
  v.toLocaleString(locale, { maximumFractionDigits: 1, useGrouping: false });

/**
 * The client's PDF: `?contenu=programme`, `plan`, or both (the default).
 * Everything is read with the client's own session, so RLS decides what is
 * theirs; the figures are today's, as the app shows them.
 */
export async function GET(request: NextRequest) {
  const want = request.nextUrl.searchParams.get("contenu");
  const withProgramme = want !== "plan";
  const withPlan = want !== "programme";

  const { supabase, client, today } = await clientSession();
  const t = await getTranslations("export");
  const tDays = await getTranslations("days");
  const tFuel = await getTranslations("fuel");
  const tSupp = await getTranslations("supp");
  // The PDF is written in the language the client reads the app in.
  const locale = intl(await getLocale());
  const num = (v: number) => figure(v, locale);

  const [{ data: coach }, week, levers, moves] = await Promise.all([
    supabase.from("coaches").select("name, logo_path").eq("id", client.coach_id).maybeSingle(),
    withProgramme ? currentWeek() : Promise.resolve(null),
    cycleLevers(),
    // The week as the client arranged it, not as it was planned.
    weekPlan(),
  ]);

  let programme = null;
  if (withProgramme) {
    programme = week
      ? {
          title: [week.programmes?.name, t("week", { n: week.week_number })].filter(Boolean).join(" · "),
          note: changesTraining(levers) ? t("phaseTraining") : null,
          days: [0, 1, 2, 3, 4, 5, 6].map((day) => {
            const session = week.sessions.find((s) => s.day_index === moves[day]);
            return {
              day: tDays(String(day)),
              name: session?.name ?? null,
              exercises: [...(session?.session_exercises ?? [])]
                .sort((a, b) => a.position - b.position)
                .map((exercise) => adjustExercise(exercise, levers))
                .map((exercise) => ({
                  // Movement names stay as the coach wrote them — in English.
                  name: exercise.name,
                  target: targetLine(exercise, (time) => t("rest", { time }), locale),
                  // The stand-ins accepted, under the cue.
                  cue:
                    [exercise.cue, exercise.alternatives?.length ? t("standIns", { names: exercise.alternatives.join(", ") }) : null]
                      .filter(Boolean)
                      .join("\n") || null,
                })),
            };
          }),
        }
      : { title: t("noWeek"), note: null, days: [] };
  }

  let plan = null;
  if (withPlan) {
    const [typesRes, targetsRes, mealsRes, suppRes] = await Promise.all([
      supabase.from("day_types").select("id, name").eq("client_id", client.id).order("position"),
      supabase.from("nutrition_targets").select("kcal, protein_g, carbs_g, fat_g, day_type_id").eq("client_id", client.id),
      supabase
        .from("plan_meals")
        .select("name, position, day_type_id, plan_meal_items(name, quantity_g, position)")
        .eq("client_id", client.id)
        .order("position"),
      supabase.from("client_supplements").select("name, dose, unit, timing, day_type_id").eq("client_id", client.id).order("position"),
    ]);

    const nutrition = changesNutrition(levers) ? levers : null;
    const order = new Map(SUPPLEMENT_TIMINGS.map((key, i) => [key, i] as const));
    // Without day types, the plan is one ordinary day: the rows with no type.
    const types: { id: string | null; name: string }[] =
      (typesRes.data ?? []).length > 0 ? (typesRes.data ?? []) : [{ id: null, name: t("everyDay") }];

    const dayTypes: ClientPdfDayType[] = types.map((type) => {
      const target =
        (targetsRes.data ?? []).find((row) => row.day_type_id === type.id) ??
        (targetsRes.data ?? []).find((row) => row.day_type_id === null) ??
        null;
      const meals = (mealsRes.data ?? []).filter((meal) => meal.day_type_id === type.id);
      const supplements = (suppRes.data ?? [])
        .filter((row) => row.day_type_id === null || row.day_type_id === type.id)
        .sort((a, b) => (order.get(a.timing) ?? 9) - (order.get(b.timing) ?? 9));

      return {
        name: type.name,
        targets: target
          ? [
              `${target.kcal + (nutrition?.kcalDelta ?? 0)} kcal`,
              target.protein_g != null && `${tFuel("protein")} ${num(Number(target.protein_g))} g`,
              target.carbs_g != null &&
                `${tFuel("carbs")} ${num(Math.max(0, Number(target.carbs_g) + (nutrition?.carbsDelta ?? 0)))} g`,
              target.fat_g != null && `${tFuel("fat")} ${num(Number(target.fat_g))} g`,
            ]
              .filter(Boolean)
              .join(" · ")
          : null,
        meals: meals.map((meal, index) => ({
          label: [tFuel("mealN", { n: index + 1 }), meal.name || null].filter(Boolean).join(" · "),
          items: [...((meal.plan_meal_items as unknown as { name: string; quantity_g: number | null; position: number }[]) ?? [])]
            .sort((a, b) => a.position - b.position)
            .map((item) => ({
              name: item.name,
              quantity: item.quantity_g == null ? null : `${num(Number(item.quantity_g))} g`,
            })),
        })),
        supplements: supplements.map((row) =>
          [
            row.name,
            row.dose != null && `${num(Number(row.dose))} ${tSupp(`unit.${row.unit as SupplementUnit}`, { count: Number(row.dose) })}`,
            tSupp(`timing.${row.timing}`),
          ]
            .filter(Boolean)
            .join(" · "),
        ),
      };
    });

    plan = { dayTypes, note: nutrition ? t("phaseNutrition") : null };
  }

  const pdf = await renderClientPdf(
    {
      logo: logoUrl(coach?.logo_path),
      coachName: coach?.name ?? "Masse",
      clientName: client.name,
      date: new Date(`${today}T12:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }),
      programme,
      plan,
    },
    {
      programme: t("programme"),
      plan: t("plan"),
      rest: t("restDay"),
      supplements: t("supplements"),
      empty: t("emptyPlan"),
      preparedBy: t("preparedBy"),
    },
  );

  const file = withProgramme && withPlan ? "masse-programme-et-plan" : withPlan ? "masse-plan" : "masse-programme";
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${file}-${today}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
