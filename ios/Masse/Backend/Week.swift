import Foundation
import Supabase

/// The week a client can actually see.
///
/// `assignments.pushed_at` is the delivery boundary: null means the coach has
/// not sent it, and RLS is what enforces that — this query does not filter on
/// it, because a row that is not pushed never reaches the client at all.
struct PushedWeek: Decodable {
    let startDate: String
    let week: WeekBody?

    enum CodingKeys: String, CodingKey {
        case startDate = "start_date"
        case week = "programme_weeks"
    }

    struct WeekBody: Decodable {
        let weekNumber: Int
        let programme: Programme?
        let sessions: [DaySession]

        enum CodingKeys: String, CodingKey {
            case weekNumber = "week_number"
            case programme = "programmes"
            case sessions
        }
    }

    struct Programme: Decodable { let name: String }

    struct DaySession: Decodable, Identifiable {
        let dayIndex: Int
        let name: String?
        let exercises: [Exercise]

        var id: Int { dayIndex }

        enum CodingKeys: String, CodingKey {
            case dayIndex = "day_index"
            case name
            case exercises = "session_exercises"
        }
    }

    struct Exercise: Decodable, Identifiable {
        let id: String
        let position: Int
        let name: String
        let scheme: String?
        let cue: String?
        let targetSets: Int?
        let targetReps: String?
        let targetWeightKg: Double?

        enum CodingKeys: String, CodingKey {
            case id, position, name, scheme, cue
            case targetSets = "target_sets"
            case targetReps = "target_reps"
            case targetWeightKg = "target_weight_kg"
        }
    }
}

enum WeekFeed {
    /// The most recent week the coach has pushed, if it started within the
    /// last seven days. The web reads exactly this, in the same shape.
    static func current() async throws -> PushedWeek? {
        // A value-typed format style rather than a shared formatter: under
        // Swift 6 a static ISO8601DateFormatter is not Sendable.
        let weekAgo = Date(timeIntervalSinceNow: -7 * 86_400)
            .formatted(.iso8601.year().month().day().dateSeparator(.dash))

        let rows: [PushedWeek] = try await Backend.client
            .from("assignments")
            .select("""
                start_date, \
                programme_weeks(week_number, programmes(name), \
                sessions(day_index, name, \
                session_exercises(id, position, name, scheme, cue, \
                target_sets, target_reps, target_weight_kg)))
                """)
            .gte("start_date", value: weekAgo)
            .order("start_date", ascending: false)
            .limit(1)
            .execute()
            .value

        return rows.first
    }
}
