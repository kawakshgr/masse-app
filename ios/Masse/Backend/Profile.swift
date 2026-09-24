import Foundation
import Supabase

/// What she can say about herself, and correct.
///
/// The fields a client may write on her own row. The database enforces the
/// same list (trigger `clients_self_update_guard`): a build that sent anything
/// else would be refused, so this struct is a convenience, not the boundary.
struct ClientDetails: Codable, Sendable, Equatable {
    var firstName: String?
    var name: String
    var phone: String?
    var birthDate: String?
    var heightCm: Double?
    var occupation: String?
    var emergencyContact: String?

    enum CodingKeys: String, CodingKey {
        case name, phone, occupation
        case firstName = "first_name"
        case birthDate = "birth_date"
        case heightCm = "height_cm"
        case emergencyContact = "emergency_contact"
    }

    /// Written out in full, nulls included. The synthesised encoder skips a nil,
    /// which would make emptying a field impossible: the old value would stay.
    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(firstName, forKey: .firstName)
        try c.encode(name, forKey: .name)
        try c.encode(phone, forKey: .phone)
        try c.encode(birthDate, forKey: .birthDate)
        try c.encode(heightCm, forKey: .heightCm)
        try c.encode(occupation, forKey: .occupation)
        try c.encode(emergencyContact, forKey: .emergencyContact)
    }
}

enum ProfileFeed {
    private static let columns =
        "first_name, name, phone, birth_date, height_cm, occupation, emergency_contact"

    static func load() async throws -> ClientDetails? {
        guard let userId = Backend.auth.currentUser?.id else { return nil }
        let rows: [ClientDetails] = try await Backend.client
            .from("clients")
            .select(columns)
            .eq("id", value: userId)
            .limit(1)
            .execute()
            .value
        return rows.first
    }

    static func save(_ details: ClientDetails) async throws {
        guard let userId = Backend.auth.currentUser?.id else { return }
        try await Backend.client
            .from("clients")
            .update(details)
            .eq("id", value: userId)
            .execute()
    }
}
