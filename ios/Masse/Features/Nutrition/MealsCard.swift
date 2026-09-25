import SwiftUI

/// What she ate today — MealsPanel on the web. Picked from her coach's library,
/// so the macros are counted for her, or typed freely when it is not in there.
struct MealsCard: View {
    @State private var meals: [LoggedMeal] = []
    @State private var library: [LibraryFood] = []
    @State private var food: LibraryFood?
    @State private var name = ""
    @State private var grams = ""
    @State private var slot = ""
    @State private var picking = false
    @State private var saving = false

    private var canAdd: Bool {
        !saving && (food != nil || !name.trimmingCharacters(in: .whitespaces).isEmpty)
    }

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 14) {
                VStack(alignment: .leading, spacing: 6) {
                    SectionHeader(title: L.t("meals.title"), symbol: "fork.knife")
                    if !meals.isEmpty {
                        Text(totalLine)
                            .font(Ty.copySmall)
                            .foregroundStyle(Tk.ink2)
                            .tabular()
                    }
                }

                // Library first; typing is the fallback, not the default.
                VStack(alignment: .leading, spacing: 8) {
                    Text(L.t("meals.pick"))
                        .font(Ty.copySmall)
                        .foregroundStyle(Tk.ink2)
                    Button { picking = true } label: {
                        HStack {
                            Text(food.map(label) ?? "—")
                                .font(Ty.copy)
                                .foregroundStyle(food == nil ? Tk.ink3 : Tk.ink)
                                .lineLimit(1)
                            Spacer()
                            Image(systemName: "chevron.up.chevron.down")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(Tk.ink3)
                        }
                        .padding(.horizontal, 14)
                        .frame(minHeight: 52)
                        .background(Tk.glass2, in: .rect(cornerRadius: Tk.R.r2))
                        .overlay(
                            RoundedRectangle(cornerRadius: Tk.R.r2)
                                .strokeBorder(Tk.edge, lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)
                }

                if food == nil {
                    field(L.t("meals.free"), placeholder: L.t("meals.name"), text: $name)
                }

                HStack(spacing: 8) {
                    field(L.t("meals.quantity"), text: $grams, keyboard: .decimalPad)
                    field(L.t("meals.slot"), text: $slot)
                }

                CTA(title: L.t("meals.add"), enabled: canAdd) {
                    Task { await add() }
                }

                if meals.isEmpty {
                    Text(L.t("meals.none"))
                        .font(Ty.copySmall)
                        .foregroundStyle(Tk.ink2)
                } else {
                    VStack(spacing: 0) {
                        ForEach(meals) { meal in
                            row(meal)
                            if meal.id != meals.last?.id {
                                Divider().overlay(Tk.hair)
                            }
                        }
                    }
                }
            }
        }
        .task { await load() }
        .sheet(isPresented: $picking) {
            FoodPicker(library: library) { chosen in
                food = chosen
                picking = false
            }
        }
    }

    private func row(_ meal: LoggedMeal) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(meal.name)
                    .font(Ty.rowTitle)
                    .foregroundStyle(Tk.ink)
                    .lineLimit(1)
                Text(detail(meal))
                    .font(Ty.copySmall)
                    .foregroundStyle(Tk.ink3)
                    .tabular()
                    .lineLimit(1)
            }
            Spacer(minLength: 8)
            Button {
                Task { await remove(meal) }
            } label: {
                Text(L.t("meals.remove"))
                    .font(Ty.copySmall)
                    .foregroundStyle(Tk.ink3)
                    .frame(minHeight: Tk.tap)
            }
        }
        .frame(minHeight: 54)
    }

    private func field(
        _ title: String,
        placeholder: String = "",
        text: Binding<String>,
        keyboard: UIKeyboardType = .default
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(Ty.copySmall)
                .foregroundStyle(Tk.ink2)
            TextField(placeholder, text: text)
                .font(Ty.copy)
                .foregroundStyle(Tk.ink)
                .keyboardType(keyboard)
                .padding(.horizontal, 14)
                .frame(minHeight: 52)
                .background(Tk.glass2, in: .rect(cornerRadius: Tk.R.r2))
                .overlay(
                    RoundedRectangle(cornerRadius: Tk.R.r2)
                        .strokeBorder(Tk.edge, lineWidth: 1)
                )
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func label(_ food: LibraryFood) -> String {
        food.brand.map { "\(food.name) · \($0)" } ?? food.name
    }

    /// Summed from the rows listed right below it — the same sum the web shows.
    private var totalLine: String {
        func sum(_ value: (LoggedMeal) -> Double?) -> Int {
            Int(meals.compactMap(value).reduce(0, +).rounded())
        }
        return "\(L.t("meals.total")) · \(sum(\.kcal)) kcal · P \(sum(\.proteinG)) · G \(sum(\.carbsG)) · L \(sum(\.fatG))"
    }

    private func detail(_ meal: LoggedMeal) -> String {
        let parts = [
            meal.slot,
            meal.quantityG.map { "\($0.clean) g" },
            meal.kcal.map { "\(Int($0.rounded())) kcal" },
        ].compactMap { $0 }
        return parts.isEmpty ? "—" : parts.joined(separator: " · ")
    }

    private func load() async {
        async let logged = MealsFeed.today()
        async let foods = MealsFeed.library()
        meals = (try? await logged) ?? []
        library = await foods
    }

    private func add() async {
        saving = true
        defer { saving = false }

        let typed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedSlot = slot.trimmingCharacters(in: .whitespacesAndNewlines)
        do {
            try await MealsFeed.log(
                food: food,
                name: food?.name ?? typed,
                grams: Double(grams.replacingOccurrences(of: ",", with: ".")),
                slot: trimmedSlot.isEmpty ? nil : trimmedSlot
            )
            food = nil
            name = ""
            grams = ""
            meals = (try? await MealsFeed.today()) ?? meals
        } catch {
            // Kept in the fields, so nothing she typed is lost; she can try again.
        }
    }

    private func remove(_ meal: LoggedMeal) async {
        try? await MealsFeed.delete(id: meal.id)
        meals.removeAll { $0.id == meal.id }
    }
}

/// Her coach's library, searchable — a long list is not a menu.
private struct FoodPicker: View {
    let library: [LibraryFood]
    let onPick: (LibraryFood?) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var query = ""

    private var shown: [LibraryFood] {
        let needle = query.trimmingCharacters(in: .whitespaces).lowercased()
        guard !needle.isEmpty else { return library }
        return library.filter {
            $0.name.lowercased().contains(needle) || ($0.brand ?? "").lowercased().contains(needle)
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Tk.bg.ignoresSafeArea()

                if library.isEmpty {
                    Text(L.t("meals.noFood"))
                        .font(Ty.copy)
                        .foregroundStyle(Tk.ink2)
                        .multilineTextAlignment(.center)
                        .padding(22)
                } else {
                    List {
                        Button { onPick(nil) } label: {
                            Text(L.t("meals.clearPick"))
                                .font(Ty.copy)
                                .foregroundStyle(Tk.a1)
                        }
                        .listRowBackground(Tk.glass)

                        ForEach(shown) { food in
                            Button { onPick(food) } label: {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(food.name)
                                        .font(Ty.rowTitle)
                                        .foregroundStyle(Tk.ink)
                                    if let brand = food.brand {
                                        Text(brand)
                                            .font(Ty.copySmall)
                                            .foregroundStyle(Tk.ink3)
                                    }
                                }
                                .frame(minHeight: 44, alignment: .leading)
                            }
                            .listRowBackground(Tk.glass)
                        }
                    }
                    .scrollContentBackground(.hidden)
                    .searchable(text: $query, prompt: L.t("meals.search"))
                }
            }
            .navigationTitle(L.t("meals.pick"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    // Cancel keeps whatever was picked before.
                    Button(L.t("common.cancel")) { dismiss() }
                        .tint(Tk.a1)
                }
            }
        }
    }
}
