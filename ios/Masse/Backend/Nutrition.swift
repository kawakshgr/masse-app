import Foundation
import Supabase

/// Monday is 0, the way the database counts and the way the programme editor
/// labels its seven columns.
///
/// Every screen that asks "which day is it" asks here. The two clients once
/// disagreed about exactly this — the web counted days since the week was
/// pushed, which is the same number only when it was pushed on a Monday — and
/// one definition is how that stops happening again.
enum Weekday {
    static var today: Int {
        (Calendar(identifier: .iso8601).component(.weekday, from: Date()) + 5) % 7
    }
}

/// What the coach wrote for this client to eat.
///
/// Nutrition hangs off the day type, not the weekday: when she moves a rest
/// day, the plan follows without anyone recalculating anything.
struct NutritionPlan: Sendable {
    var mode: String
    var dayTypeName: String?
    var isRest: Bool
    var targets: Targets?
    var meals: [PlanMeal]
    var supplements: [Supplement]
    /// Monday first: the name of each day's type, nil for the default. Empty
    /// when her coach has not set any day types — then there is nothing to move.
    var week: [String?]

    struct Targets: Decodable, Sendable {
        let kcal: Int
        let proteinG: Double?
        let carbsG: Double?
        let fatG: Double?
        let dayTypeId: String?

        enum CodingKeys: String, CodingKey {
            case kcal
            case proteinG = "protein_g"
            case carbsG = "carbs_g"
            case fatG = "fat_g"
            case dayTypeId = "day_type_id"
        }
    }

    struct PlanMeal: Decodable, Sendable, Identifiable {
        let id: String
        let atTime: String
        let name: String
        let dayTypeId: String?
        let items: [Item]

        enum CodingKeys: String, CodingKey {
            case id, name
            case atTime = "at_time"
            case dayTypeId = "day_type_id"
            case items = "plan_meal_items"
        }

        struct Item: Decodable, Sendable, Identifiable {
            let id: String
            let name: String
            let quantityG: Double?
            let kcal: Double?
            let position: Int

            enum CodingKeys: String, CodingKey {
                case id, name, kcal, position
                case quantityG = "quantity_g"
            }
        }
    }

    struct Supplement: Decodable, Sendable, Identifiable {
        let id: String
        let name: String
        let dose: Double?
        let unit: String
        let timing: String
        let dayTypeId: String?

        enum CodingKeys: String, CodingKey {
            case id, name, dose, unit, timing
            case dayTypeId = "day_type_id"
        }
    }

    /// The order a day runs in, which is the order a protocol is read in. Must
    /// match SUPPLEMENT_TIMINGS on the web.
    static let timingOrder = [
        "morning", "noon", "snack", "pre", "post", "evening", "meal", "anytime",
    ]
}

private struct DayTypeRow: Decodable {
    let id: String
    let name: String
    let isRest: Bool

    enum CodingKeys: String, CodingKey {
        case id, name
        case isRest = "is_rest"
    }
}

private struct WeekDayRow: Decodable {
    let dayIndex: Int
    let dayTypeId: String?

    enum CodingKeys: String, CodingKey {
        case dayIndex = "day_index"
        case dayTypeId = "day_type_id"
    }
}

private struct ClientMode: Decodable {
    let nutritionMode: String?

    enum CodingKeys: String, CodingKey {
        case nutritionMode = "nutrition_mode"
    }
}

enum NutritionFeed {

    /// Today's plan: the type today is, and everything hanging off it.
    ///
    /// Rows for a null day type are the default — what a client with no day
    /// types at all has always had, and what applies to every day when she
    /// does have them.
    static func today() async throws -> NutritionPlan {
        async let clientRows: [ClientMode] = Backend.client
            .from("clients").select("nutrition_mode").limit(1).execute().value
        async let typeRows: [DayTypeRow] = Backend.client
            .from("day_types").select("id, name, is_rest").order("position").execute().value
        async let weekRows: [WeekDayRow] = Backend.client
            .from("client_week_days").select("day_index, day_type_id").execute().value
        async let targetRows: [NutritionPlan.Targets] = Backend.client
            .from("nutrition_targets")
            .select("kcal, protein_g, carbs_g, fat_g, day_type_id").execute().value
        async let mealRows: [NutritionPlan.PlanMeal] = Backend.client
            .from("plan_meals")
            .select("id, at_time, name, day_type_id, plan_meal_items(id, name, quantity_g, kcal, position)")
            .order("at_time").execute().value
        async let supplementRows: [NutritionPlan.Supplement] = Backend.client
            .from("client_supplements")
            .select("id, name, dose, unit, timing, day_type_id")
            .order("position").execute().value

        let (client, types, week, targets, meals, supplements) =
            try await (clientRows, typeRows, weekRows, targetRows, mealRows, supplementRows)

        let todayTypeId = week.first { $0.dayIndex == Weekday.today }?.dayTypeId
        let todayType = types.first { $0.id == todayTypeId }

        return NutritionPlan(
            mode: client.first?.nutritionMode ?? "macros",
            dayTypeName: todayType?.name,
            isRest: todayType?.isRest ?? false,
            targets: targets.first { $0.dayTypeId == todayTypeId }
                ?? targets.first { $0.dayTypeId == nil },
            meals: meals.filter { $0.dayTypeId == todayTypeId },
            // Hers for today, plus the ones she takes every day.
            supplements: supplements
                .filter { $0.dayTypeId == nil || $0.dayTypeId == todayTypeId }
                .sorted {
                    (NutritionPlan.timingOrder.firstIndex(of: $0.timing) ?? 9)
                        < (NutritionPlan.timingOrder.firstIndex(of: $1.timing) ?? 9)
                },
            week: types.isEmpty ? [] : (0..<7).map { day in
                let id = week.first { $0.dayIndex == day }?.dayTypeId
                return types.first { $0.id == id }?.name
            }
        )
    }
}

/// Her week, and the one thing she does to it: move a day.
///
/// Life moves a rest day. Nutrition hangs off the day type rather than the
/// weekday, so trading two days carries the right plan along with each.
enum MyWeekFeed {
    static func swap(_ a: Int, _ b: Int) async throws {
        guard a != b, let clientId = Backend.auth.currentUser?.id else { return }

        let rows: [WeekDayRow] = try await Backend.client
            .from("client_week_days")
            .select("day_index, day_type_id")
            .in("day_index", values: [a, b])
            .execute()
            .value
        let typeOf = { (day: Int) in rows.first { $0.dayIndex == day }?.dayTypeId }

        struct Row: Encodable {
            let client_id: String
            let day_index: Int
            let day_type_id: String?

            // A null has to be sent as null: the day becomes a default day.
            func encode(to encoder: Encoder) throws {
                var c = encoder.container(keyedBy: CodingKeys.self)
                try c.encode(client_id, forKey: .client_id)
                try c.encode(day_index, forKey: .day_index)
                try c.encode(day_type_id, forKey: .day_type_id)
            }
            enum CodingKeys: String, CodingKey { case client_id, day_index, day_type_id }
        }

        try await Backend.client
            .from("client_week_days")
            .upsert(
                [
                    Row(client_id: clientId.uuidString, day_index: a, day_type_id: typeOf(b)),
                    Row(client_id: clientId.uuidString, day_index: b, day_type_id: typeOf(a)),
                ],
                onConflict: "client_id,day_index"
            )
            .execute()
    }
}

/// What she ate today, logged by her. Separate from the plan on purpose: the
/// plan is the coach's instruction, this is her record against it.
struct LoggedMeal: Decodable, Sendable, Identifiable {
    let id: String
    let name: String
    let slot: String?
    let quantityG: Double?
    let kcal: Double?
    let proteinG: Double?
    let carbsG: Double?
    let fatG: Double?

    enum CodingKeys: String, CodingKey {
        case id, name, slot, kcal
        case quantityG = "quantity_g"
        case proteinG = "protein_g"
        case carbsG = "carbs_g"
        case fatG = "fat_g"
    }
}

/// An entry in her coach's food library, readable to her so she can log
/// against it. Values are per 100 g.
struct LibraryFood: Decodable, Sendable, Identifiable, Hashable {
    let id: String
    let name: String
    let brand: String?
    let kcal100g: Double?
    let protein100g: Double?
    let carbs100g: Double?
    let fat100g: Double?

    enum CodingKeys: String, CodingKey {
        case id, name, brand
        case kcal100g = "kcal_100g"
        case protein100g = "protein_100g"
        case carbs100g = "carbs_100g"
        case fat100g = "fat_100g"
    }
}

enum MealsFeed {
    static func today() async throws -> [LoggedMeal] {
        try await Backend.client
            .from("meals")
            .select("id, name, slot, quantity_g, kcal, protein_g, carbs_g, fat_g")
            .eq("day", value: MetricsFeed.todayIso)
            .order("logged_at")
            .execute()
            .value
    }

    static func library() async -> [LibraryFood] {
        let rows: [LibraryFood]? = try? await Backend.client
            .from("foods")
            .select("id, name, brand, kcal_100g, protein_100g, carbs_100g, fat_100g")
            .order("name")
            .execute()
            .value
        return rows ?? []
    }

    /// The name and the scaled macros are snapshotted: deleting the library
    /// entry later must not rewrite what she ate. The web does the same sum.
    static func log(food: LibraryFood?, name: String, grams: Double?, slot: String?) async throws {
        guard let clientId = Backend.auth.currentUser?.id else { return }

        let factor = grams.map { $0 / 100 }
        func scale(_ per100: Double?) -> Double? {
            guard let factor, let per100 else { return nil }
            return (per100 * factor * 100).rounded() / 100
        }

        struct Row: Encodable {
            let client_id: String
            let day: String
            let slot: String?
            let food_id: String?
            let name: String
            let quantity_g: Double?
            let kcal: Double?
            let protein_g: Double?
            let carbs_g: Double?
            let fat_g: Double?
        }

        try await Backend.client
            .from("meals")
            .insert(Row(
                client_id: clientId.uuidString,
                day: MetricsFeed.todayIso,
                slot: slot,
                food_id: food?.id,
                name: name,
                quantity_g: grams,
                kcal: scale(food?.kcal100g),
                protein_g: scale(food?.protein100g),
                carbs_g: scale(food?.carbs100g),
                fat_g: scale(food?.fat100g)
            ))
            .execute()
    }

    static func delete(id: String) async throws {
        try await Backend.client.from("meals").delete().eq("id", value: id).execute()
    }
}
