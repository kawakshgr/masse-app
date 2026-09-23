import Foundation
import Supabase

/// The nine answers, and the two calls that turn them into an account.
///
/// The shape mirrors the web's `src/lib/onboarding.ts` on purpose: both clients
/// call the same two functions with the same arguments, so neither can drift
/// into writing a client row the other would not recognise.
struct Answers: Codable, Equatable {
    var code = ""
    var coachName: String?
    var askCycle = false
    var name = ""
    var firstName = ""
    var goal: String?
    var heightCm = ""
    var weightKg = ""
    var birthYear = ""
    var injuries = ""
    var equipment: [String] = []
    var sessionDays: [Int] = []
    var cycleTracking = false
    var sleepTargetH = ""
    var email = ""

    static let goals = ["Get stronger", "Build muscle", "Lean out", "Move better"]
    static let equipmentOptions = ["gym", "rack", "bands", "bodyweight"]
}

/// What the coach's code says about itself before anyone types anything else.
struct InvitePreview: Decodable {
    let valid: Bool
    let coachName: String?
    let askCycle: Bool

    enum CodingKeys: String, CodingKey {
        case valid
        case coachName = "coach_name"
        case askCycle = "ask_cycle"
    }
}

/// The arguments `claim_invite` expects. Numbers are sent as numbers, and a
/// blank field is null rather than zero — an unanswered height is not 0 cm.
private struct ClaimArgs: Encodable {
    let p_code: String
    let p_name: String
    let p_first_name: String?
    let p_goal: String?
    let p_height_cm: Double?
    let p_weight_kg: Double?
    let p_birth_year: Int?
    let p_injuries: [String]
    let p_equipment: [String]
    let p_session_days: [Int]
    let p_sleep_target: Double?
    let p_cycle_tracking: Bool
}

enum InviteFlow {

    /// Validates a code before the client has an account. Runs unauthenticated,
    /// which is the whole point: there is no session yet.
    static func preview(code: String) async throws -> InvitePreview? {
        let rows: [InvitePreview] = try await Backend.client
            .rpc("invite_preview", params: ["p_code": code.trimmed])
            .execute()
            .value
        return rows.first
    }

    /// Sends the magic link. The answers stay on the device until it comes
    /// back — there is no account to attach them to yet.
    static func sendMagicLink(to email: String) async throws {
        try await Backend.auth.signInWithOTP(
            email: email.trimmed,
            redirectTo: URL(string: "masse://auth-callback")
        )
    }

    /// Spends the code and writes the client row. Called once, after the link
    /// has been followed and a session exists.
    static func claim(_ a: Answers) async throws {
        try await Backend.client
            .rpc("claim_invite", params: ClaimArgs(
                p_code: a.code.trimmed,
                p_name: a.name.trimmed,
                p_first_name: a.firstName.trimmed.nilIfEmpty,
                p_goal: a.goal,
                p_height_cm: a.heightCm.asDouble,
                p_weight_kg: a.weightKg.asDouble,
                p_birth_year: a.birthYear.trimmed.nilIfEmpty.flatMap(Int.init),
                p_injuries: a.injuries
                    .split(separator: "\n")
                    .map { $0.trimmingCharacters(in: .whitespaces) }
                    .filter { !$0.isEmpty },
                p_equipment: a.equipment,
                p_session_days: a.sessionDays,
                p_sleep_target: a.sleepTargetH.asDouble,
                p_cycle_tracking: a.cycleTracking
            ))
            .execute()
    }
}

/// Half-finished onboarding survives the app being closed. It is this device's
/// own business, so it never leaves it — the same promise the web makes with
/// localStorage.
enum AnswerStore {
    private static let key = "masse.onboarding"

    static func load() -> Answers? {
        guard let data = UserDefaults.standard.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(Answers.self, from: data)
    }

    static func save(_ answers: Answers) {
        guard let data = try? JSONEncoder().encode(answers) else { return }
        UserDefaults.standard.set(data, forKey: key)
    }

    static func clear() {
        UserDefaults.standard.removeObject(forKey: key)
    }
}

private extension String {
    var trimmed: String { trimmingCharacters(in: .whitespacesAndNewlines) }
    var nilIfEmpty: String? { isEmpty ? nil : self }
    /// Accepts a comma: a French keyboard offers one, and 74,5 is a weight.
    var asDouble: Double? {
        let cleaned = replacingOccurrences(of: ",", with: ".").trimmed
        return cleaned.isEmpty ? nil : Double(cleaned)
    }
}
