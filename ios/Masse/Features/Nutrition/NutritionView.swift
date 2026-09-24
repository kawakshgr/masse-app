import SwiftUI

/// What the coach wrote for her to eat today.
///
/// Read only, on purpose: the plan is the coach's. What the client logs against
/// it is a separate thing, and it does not belong on the same screen as the
/// instruction.
struct NutritionView: View {
    @State private var plan: NutritionPlan?
    @State private var loaded = false
    @State private var failed = false
    @State private var levers: CycleLevers?

    var body: some View {
        ZStack {
            Tk.bg.ignoresSafeArea()
            Atmosphere().ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    header

                    if !loaded {
                        ProgressView().tint(Tk.a1).frame(maxWidth: .infinity)
                    } else if let plan {
                        if let targets = plan.targets {
                            targetsCard(targets, mode: plan.mode)
                        }
                        if !plan.meals.isEmpty {
                            mealsCard(plan.meals)
                        }
                        if !plan.supplements.isEmpty {
                            supplementsCard(plan.supplements)
                        }
                        if plan.targets == nil, plan.meals.isEmpty, plan.supplements.isEmpty {
                            emptyCard
                        }
                        // Moving a day changes what today is, so the plan
                        // above is asked again once the swap lands.
                        if !plan.week.isEmpty {
                            MyWeekCard(week: plan.week) { await load() }
                        }
                    } else {
                        emptyCard
                    }

                    if loaded { MealsCard() }
                }
                .padding(.horizontal, 22)
                .padding(.top, 12)
                .padding(.bottom, 32)
            }
        }
        .task { await load() }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(L.t("clientNav.fuel")).kicker()

            // The day type is what today IS, so it is the title. The kcal
            // underneath belong to it, not to the weekday.
            Text(plan?.dayTypeName ?? L.t("clientNav.fuel"))
                .font(Ty.screenTitle)
                .tracking(Ty.displayTracking(30))
                .foregroundStyle(Tk.ink)

            if plan?.isRest == true {
                Text(L.t("fuel.restDay"))
                    .font(Ty.copySmall)
                    .foregroundStyle(Tk.ink2)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func targetsCard(_ targets: NutritionPlan.Targets, mode: String) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 12) {
                Text(L.t("fuel.daily")).kicker()

                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text("\(adjust(targets.kcal))")
                        .font(Ty.hero)
                        .tracking(Ty.displayTracking(56))
                        .foregroundStyle(Tk.ink)
                        .tabular()
                    Text("kcal")
                        .font(Ty.copy)
                        .foregroundStyle(Tk.ink3)
                }

                HStack(spacing: 10) {
                    macro(L.t("fuel.protein"), targets.proteinG)
                    macro(L.t("fuel.carbs"), nutrition?.carbs(targets.carbsG) ?? targets.carbsG)
                    macro(L.t("fuel.fat"), targets.fatG)
                }

                if let nutrition {
                    Text(nutrition.nutritionLine)
                        .font(Ty.copySmall)
                        .foregroundStyle(Tk.a2)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }

    /// The levers, only when they change what she eats today.
    private var nutrition: CycleLevers? {
        levers?.changesNutrition == true ? levers : nil
    }

    private func adjust(_ kcal: Int) -> Int { nutrition?.kcal(kcal) ?? kcal }

    private func macro(_ label: String, _ grams: Double?) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(Ty.copySmall)
                .foregroundStyle(Tk.ink2)
            Text(grams.map { "\($0.clean) g" } ?? "—")
                .font(Ty.rowTitle)
                .foregroundStyle(Tk.ink)
                .tabular()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 10)
        .padding(.horizontal, 12)
        .background(Tk.glass2, in: .rect(cornerRadius: Tk.R.r1))
    }

    private func mealsCard(_ meals: [NutritionPlan.PlanMeal]) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 14) {
                Text(L.t("fuel.meals")).kicker()

                ForEach(meals) { meal in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack(alignment: .firstTextBaseline) {
                            Text(meal.name)
                                .font(Ty.rowTitle)
                                .foregroundStyle(Tk.ink)
                            Spacer(minLength: 8)
                            Text(meal.atTime.prefix(5))
                                .font(Ty.copySmall)
                                .foregroundStyle(Tk.ink3)
                                .tabular()
                        }

                        ForEach(meal.items.sorted { $0.position < $1.position }) { item in
                            HStack(alignment: .firstTextBaseline, spacing: 8) {
                                Text(item.name)
                                    .font(Ty.copySmall)
                                    .foregroundStyle(Tk.ink2)
                                Spacer(minLength: 8)
                                if let grams = item.quantityG {
                                    Text("\(grams.clean) g")
                                        .font(Ty.copySmall)
                                        .foregroundStyle(Tk.ink3)
                                        .tabular()
                                }
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
    }

    private func supplementsCard(_ supplements: [NutritionPlan.Supplement]) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 10) {
                Text(L.t("fuel.supplements")).kicker()

                ForEach(supplements) { supplement in
                    HStack(alignment: .firstTextBaseline, spacing: 10) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(supplement.name)
                                .font(Ty.rowTitle)
                                .foregroundStyle(Tk.ink)
                            Text(L.t("supp.timing.\(supplement.timing)"))
                                .font(Ty.copySmall)
                                .foregroundStyle(Tk.ink3)
                        }
                        Spacer(minLength: 8)
                        if let dose = supplement.dose {
                            Text("\(dose.clean) \(unitLabel(supplement))")
                                .font(Ty.rowTitle)
                                .foregroundStyle(Tk.ink2)
                                .tabular()
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
    }

    /// The unit's own plural, chosen by the dose beside it.
    private func unitLabel(_ supplement: NutritionPlan.Supplement) -> String {
        L.unit(supplement.unit, Int((supplement.dose ?? 1).rounded()))
    }

    private var emptyCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 8) {
                Text(L.t(failed ? "offline.title" : "fuel.empty"))
                    .font(Ty.cardTitle)
                    .tracking(Ty.displayTracking(19))
                    .foregroundStyle(Tk.ink)
                    .fixedSize(horizontal: false, vertical: true)
                if failed {
                    Text(L.t("offline.lede"))
                        .font(Ty.copy)
                        .foregroundStyle(Tk.ink2)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }

    private func load() async {
        levers = await CycleLevers.today()
        do {
            plan = try await NutritionFeed.today()
            failed = false
        } catch {
            failed = true
        }
        loaded = true
    }
}
