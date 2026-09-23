import Foundation
import Supabase

/// Sleep and steps, one row a day.
///
/// Typed by hand in v1. When Apple Health arrives it fills the same row through
/// the same call — the shape is already the one a Health read would produce,
/// so nothing here has to change shape to accept it.
struct DailyMetric: Codable, Sendable {
    let day: String
    var sleepH: Double?
    var sleepQuality: Int?
    var steps: Int?

    enum CodingKeys: String, CodingKey {
        case day, steps
        case sleepH = "sleep_h"
        case sleepQuality = "sleep_quality"
    }
}

/// A period start and how long the cycle runs. Nothing else, ever.
///
/// GDPR Article 9 data: the table holds two dates and a number. Phase is
/// derived at read time by `client_cycle_state`, never stored, and symptom
/// notes have no table at all — they stay on the device. That promise is kept
/// by absence, not by a policy someone could change.
struct CycleEntry: Codable, Sendable, Identifiable {
    let id: String
    var periodStartDate: String
    var cycleLengthDays: Int

    enum CodingKeys: String, CodingKey {
        case id
        case periodStartDate = "period_start_date"
        case cycleLengthDays = "cycle_length_days"
    }
}

/// What the database says about today, derived and never stored. It returns no
/// row at all when tracking is off or nothing has been logged, which is the
/// difference between "no phase" and "phase unknown".
struct CycleState: Decodable, Sendable {
    let phase: String?
    let intensityCoefficient: Double?
    let volumeCoefficient: Double?
    let dayOfCycle: Int?
    let cycleLengthDays: Int?

    enum CodingKeys: String, CodingKey {
        case phase
        case intensityCoefficient = "intensity_coefficient"
        case volumeCoefficient = "volume_coefficient"
        case dayOfCycle = "day_of_cycle"
        case cycleLengthDays = "cycle_length_days"
    }
}

/// Where one phase starts and ends, for a cycle of a given length.
///
/// Read from the database rather than written here. The boundaries live in
/// cycle_phase_on and a second copy in Swift would be a second answer waiting
/// to disagree with the first.
struct PhaseSpan: Decodable, Sendable, Identifiable {
    let phase: String
    let firstDay: Int
    let lastDay: Int

    var id: String { phase }
    var length: Int { lastDay - firstDay + 1 }

    enum CodingKeys: String, CodingKey {
        case phase
        case firstDay = "first_day"
        case lastDay = "last_day"
    }
}

enum MetricsFeed {

    static var todayIso: String {
        Date().formatted(.iso8601.year().month().day().dateSeparator(.dash))
    }

    /// The last seven days, most recent last. Days with nothing logged are
    /// absent rather than zero — a day she did not record is not a day she
    /// took no steps, and a chart that draws it as zero says the second thing.
    static func week() async throws -> [DailyMetric] {
        let from = Calendar.current.date(byAdding: .day, value: -6, to: Date()) ?? Date()
        let rows: [DailyMetric] = try await Backend.client
            .from("daily_metrics")
            .select("day, sleep_h, sleep_quality, steps")
            .gte("day", value: from.formatted(.iso8601.year().month().day().dateSeparator(.dash)))
            .order("day")
            .execute()
            .value
        return rows
    }

    /// The step target her coach set, or nil when she has not set one.
    static func stepsTarget() async -> Int? {
        struct Row: Decodable { let steps_target: Int? }
        let rows: [Row]? = try? await Backend.client
            .from("clients")
            .select("steps_target")
            .limit(1)
            .execute()
            .value
        return rows?.first?.steps_target
    }

    static func today() async throws -> DailyMetric? {
        let rows: [DailyMetric] = try await Backend.client
            .from("daily_metrics")
            .select("day, sleep_h, sleep_quality, steps")
            .eq("day", value: todayIso)
            .limit(1)
            .execute()
            .value
        return rows.first
    }

    /// One row per day, so saving twice corrects rather than duplicates.
    static func save(_ metric: DailyMetric) async throws {
        guard let clientId = Backend.auth.currentUser?.id else { return }

        struct Row: Encodable {
            let client_id: String
            let day: String
            let sleep_h: Double?
            let sleep_quality: Int?
            let steps: Int?
        }

        try await Backend.client
            .from("daily_metrics")
            .upsert(
                Row(
                    client_id: clientId.uuidString,
                    day: metric.day,
                    sleep_h: metric.sleepH,
                    sleep_quality: metric.sleepQuality,
                    steps: metric.steps
                ),
                onConflict: "client_id,day"
            )
            .execute()
    }
}

enum CycleFeed {

    static func recent() async throws -> [CycleEntry] {
        try await Backend.client
            .from("cycle_logs")
            .select("id, period_start_date, cycle_length_days")
            .order("period_start_date", ascending: false)
            .limit(12)
            .execute()
            .value
    }

    /// The phase, derived by the database at read time. The client app does not
    /// compute it either — one definition, wherever it is asked for.
    static func state() async throws -> CycleState? {
        guard let clientId = Backend.auth.currentUser?.id else { return nil }

        struct Args: Encodable { let p_client: String }

        let rows: [CycleState] = try await Backend.client
            .rpc("client_cycle_state", params: Args(p_client: clientId.uuidString))
            .execute()
            .value
        return rows.first
    }

    static func spans(cycleLength: Int) async -> [PhaseSpan] {
        struct Args: Encodable { let p_cycle_length: Int }
        let rows: [PhaseSpan]? = try? await Backend.client
            .rpc("cycle_phase_spans", params: Args(p_cycle_length: cycleLength))
            .execute()
            .value
        return rows ?? []
    }

    static func add(start: Date, lengthDays: Int) async throws {
        guard let clientId = Backend.auth.currentUser?.id else { return }

        struct Row: Encodable {
            let client_id: String
            let period_start_date: String
            let cycle_length_days: Int
        }

        try await Backend.client
            .from("cycle_logs")
            .insert(
                Row(
                    client_id: clientId.uuidString,
                    period_start_date: start.formatted(
                        .iso8601.year().month().day().dateSeparator(.dash)
                    ),
                    cycle_length_days: lengthDays
                )
            )
            .execute()
    }

    static func delete(id: String) async throws {
        try await Backend.client.from("cycle_logs").delete().eq("id", value: id).execute()
    }
}

/// Symptom notes. This type is the whole of their storage.
///
/// There is no table for these and there never will be. They are written to
/// UserDefaults on this device and they are not in any request the app makes —
/// which is why the screen can promise it without qualifying the promise.
enum SymptomNotes {
    private static let key = "masse.symptomNotes"

    static func all() -> [String: String] {
        UserDefaults.standard.dictionary(forKey: key) as? [String: String] ?? [:]
    }

    static func note(on day: String) -> String { all()[day] ?? "" }

    static func write(_ note: String, on day: String) {
        var notes = all()
        if note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            notes.removeValue(forKey: day)
        } else {
            notes[day] = note
        }
        UserDefaults.standard.set(notes, forKey: key)
    }
}

/// The weekly check-in, as the client files it.
///
/// `author` has carried 'coach' and 'client' since the first migration; this is
/// the client half arriving. A row her coach wrote is not editable here — RLS
/// decides that, not this struct.
struct CheckIn: Codable, Sendable {
    let weekStartDate: String
    var feel: String?
    var pain: String?
    var adherence: String?
    var bodyweightKg: Double?
    var waistCm: Double?
    var chestCm: Double?
    var hipsCm: Double?
    var thighCm: Double?
    var note: String?
    var author: String
    var reviewedAt: String?

    enum CodingKeys: String, CodingKey {
        case feel, pain, adherence, note, author
        case weekStartDate = "week_start_date"
        case bodyweightKg = "bodyweight_kg"
        case waistCm = "waist_cm"
        case chestCm = "chest_cm"
        case hipsCm = "hips_cm"
        case thighCm = "thigh_cm"
        case reviewedAt = "reviewed_at"
    }

    static let feels = ["Strong", "Steady", "Heavy"]
    static let pains = ["None", "Minor", "Need to talk"]
    static let adherences = ["All of it", "Most", "Struggled"]
}

enum CheckInFeed {

    /// Monday of the week we are in, which is how the row is keyed.
    static var weekStartIso: String {
        let calendar = Calendar(identifier: .iso8601)
        let start = calendar.dateInterval(of: .weekOfYear, for: Date())?.start ?? Date()
        return start.formatted(.iso8601.year().month().day().dateSeparator(.dash))
    }

    static func thisWeek() async throws -> CheckIn? {
        let rows: [CheckIn] = try await Backend.client
            .from("check_ins")
            .select("""
                week_start_date, feel, pain, adherence, bodyweight_kg, \
                waist_cm, chest_cm, hips_cm, thigh_cm, note, author, reviewed_at
                """)
            .eq("week_start_date", value: weekStartIso)
            .limit(1)
            .execute()
            .value
        return rows.first
    }

    /// Files hers, or corrects the one she filed. Upsert on the week, because
    /// the table already holds one row per client per week and a second attempt
    /// is a correction rather than a new entry.
    static func submit(_ checkIn: CheckIn) async throws {
        guard let clientId = Backend.auth.currentUser?.id else { return }

        struct Row: Encodable {
            let client_id: String
            let week_start_date: String
            let feel: String?
            let pain: String?
            let adherence: String?
            let bodyweight_kg: Double?
            let waist_cm: Double?
            let chest_cm: Double?
            let hips_cm: Double?
            let thigh_cm: Double?
            let note: String?
            let author: String
        }

        try await Backend.client
            .from("check_ins")
            .upsert(
                Row(
                    client_id: clientId.uuidString,
                    week_start_date: checkIn.weekStartDate,
                    feel: checkIn.feel,
                    pain: checkIn.pain,
                    adherence: checkIn.adherence,
                    bodyweight_kg: checkIn.bodyweightKg,
                    waist_cm: checkIn.waistCm,
                    chest_cm: checkIn.chestCm,
                    hips_cm: checkIn.hipsCm,
                    thigh_cm: checkIn.thighCm,
                    note: checkIn.note,
                    // Never 'coach'. The policy checks it too, so a client
                    // build that lied here would simply be refused.
                    author: "client"
                ),
                onConflict: "client_id,week_start_date"
            )
            .execute()
    }
}


/// Progress photos on a check-in: three poses, one slot each.
///
/// The bucket is private and every read goes through a signed URL — a body
/// photograph is as sensitive as anything else here. The path's first segment
/// is the client id, which is what the storage policies filter on, so a path
/// built any other way is refused rather than merely wrong.
struct CheckInPhoto: Decodable, Sendable, Identifiable {
    let id: String
    let storagePath: String
    let pose: String

    enum CodingKeys: String, CodingKey {
        case id, pose
        case storagePath = "storage_path"
    }
}

enum PhotoFeed {
    static let bucket = "check-in-photos"
    static let poses = ["front", "side", "back"]

    /// The check-in row for this week, made if it is not there yet. A photo has
    /// to hang off one, and she should not have to answer three questions
    /// before she is allowed to take a picture.
    static func checkInId(weekStart: String) async -> String? {
        guard let clientId = Backend.auth.currentUser?.id else { return nil }

        struct Row: Decodable { let id: String }

        let existing: [Row]? = try? await Backend.client
            .from("check_ins")
            .select("id")
            .eq("week_start_date", value: weekStart)
            .limit(1)
            .execute()
            .value

        if let id = existing?.first?.id { return id }

        struct New: Encodable {
            let client_id: String
            let week_start_date: String
            let author: String
        }

        let created: [Row]? = try? await Backend.client
            .from("check_ins")
            .insert(New(
                client_id: clientId.uuidString,
                week_start_date: weekStart,
                author: "client"
            ))
            .select("id")
            .execute()
            .value

        return created?.first?.id
    }

    static func forCheckIn(_ checkInId: String) async -> [CheckInPhoto] {
        let rows: [CheckInPhoto]? = try? await Backend.client
            .from("check_in_photos")
            .select("id, storage_path, pose")
            .eq("check_in_id", value: checkInId)
            .execute()
            .value
        return rows ?? []
    }

    /// A signed URL, because the bucket is private. Short-lived on purpose:
    /// a link that outlives the screen is a link that can be forwarded.
    static func signedURL(_ path: String) async -> URL? {
        try? await Backend.client.storage
            .from(bucket)
            .createSignedURL(path: path, expiresIn: 600)
    }

    /// Uploads and takes the pose's slot, replacing what was there.
    ///
    /// The old file is removed as well as its row: a dangling object is still a
    /// stored photograph of somebody, and deleting only the row would leave it.
    static func upload(_ data: Data, pose: String, checkInId: String) async -> Bool {
        guard let clientId = Backend.auth.currentUser?.id else { return false }

        let path = "\(clientId.uuidString)/\(checkInId)/\(UUID().uuidString).jpg"

        do {
            try await Backend.client.storage
                .from(bucket)
                .upload(path, data: data, options: FileOptions(contentType: "image/jpeg"))
        } catch {
            return false
        }

        let previous = await forCheckIn(checkInId).filter { $0.pose == pose }
        for old in previous {
            try? await Backend.client
                .from("check_in_photos").delete().eq("id", value: old.id).execute()
            try? await Backend.client.storage.from(bucket).remove(paths: [old.storagePath])
        }

        struct Row: Encodable {
            let check_in_id: String
            let client_id: String
            let storage_path: String
            let pose: String
        }

        do {
            try await Backend.client
                .from("check_in_photos")
                .insert(Row(
                    check_in_id: checkInId,
                    client_id: clientId.uuidString,
                    storage_path: path,
                    pose: pose
                ))
                .execute()
            return true
        } catch {
            // The row is what makes the file a photo of anything. Without it
            // the object is orphaned, so it goes.
            try? await Backend.client.storage.from(bucket).remove(paths: [path])
            return false
        }
    }
}
