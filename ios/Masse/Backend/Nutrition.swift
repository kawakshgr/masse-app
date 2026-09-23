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
                }
        )
    }
}
