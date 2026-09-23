import Foundation
import Observation
import Supabase

/// A set, as she logged it.
///
/// The id is made here rather than by the database, and that is the whole
/// design: a flush that half succeeds and runs again upserts the same rows
/// instead of writing them twice. Without a client-side id there is no safe
/// retry, and without a safe retry there is no offline queue.
struct SetLog: Codable, Identifiable, Sendable, Hashable {
    let id: UUID
    let clientId: UUID
    let sessionExerciseId: UUID
    var setIndex: Int
    var reps: Int?
    var weightKg: Double?
    var rpe: Int?
    let loggedAt: Date
    /// Written when the row reaches the server, by whoever got it there.
    var syncedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case clientId = "client_id"
        case sessionExerciseId = "session_exercise_id"
        case setIndex = "set_index"
        case reps
        case weightKg = "weight_kg"
        case rpe
        case loggedAt = "logged_at"
        case syncedAt = "synced_at"
    }
}

/// The queue on disk.
///
/// An actor because two flushes and a save must not interleave over one file,
/// and Application Support rather than Documents because this is the app's own
/// bookkeeping, not something the client would ever want to see in Files.
actor SetQueue {
    static let shared = SetQueue()

    private let url: URL = {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        return base.appendingPathComponent("held-sets.json")
    }()

    private lazy var coder: (JSONEncoder, JSONDecoder) = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return (encoder, decoder)
    }()

    func load() -> [SetLog] {
        guard let data = try? Data(contentsOf: url) else { return [] }
        return (try? coder.1.decode([SetLog].self, from: data)) ?? []
    }

    func save(_ sets: [SetLog]) {
        guard let data = try? coder.0.encode(sets) else { return }
        try? data.write(to: url, options: .atomic)
    }
}

/// Today's sets, and which of them the server has.
///
/// Offline is a state, not an error: a set is written here first and always
/// succeeds. Reaching the server is a separate thing that happens later, and
/// the screen says which sets are still waiting rather than refusing the entry.
@MainActor
@Observable
final class TrainingLog {
    /// Everything logged for this session, sent or not.
    private(set) var sets: [SetLog] = []
    private(set) var flushing = false

    /// The ones the server has not acknowledged.
    var held: [SetLog] { sets.filter { $0.syncedAt == nil } }

    private var clientId: UUID?

    /// Loads what this session already knows: the held sets from disk, and the
    /// ones the server already took.
    ///
    /// Both halves matter. Held alone would show her fewer sets than she has
    /// actually done after a mid-session relaunch, and inviting someone to redo
    /// a set she already did is worse than showing her none at all.
    func start(exerciseIds: [String]) async {
        clientId = Backend.auth.currentUser?.id

        var merged = await SetQueue.shared.load()
        for row in await alreadyOnServer(exerciseIds: exerciseIds)
        where !merged.contains(where: { $0.id == row.id }) {
            merged.append(row)
        }

        sets = merged
        await flush()
    }

    /// What the server already holds for today, for these exercises only.
    private func alreadyOnServer(exerciseIds: [String]) async -> [SetLog] {
        guard !exerciseIds.isEmpty else { return [] }

        let midnight = Calendar.current.startOfDay(for: Date()).formatted(.iso8601)

        let rows: [SetLog]? = try? await Backend.client
            .from("set_logs")
            .select()
            .in("session_exercise_id", values: exerciseIds)
            .gte("logged_at", value: midnight)
            .execute()
            .value

        return rows ?? []
    }

    func sets(for exerciseId: String) -> [SetLog] {
        sets
            .filter { $0.sessionExerciseId.uuidString.lowercased() == exerciseId.lowercased() }
            .sorted { $0.setIndex < $1.setIndex }
    }

    /// Accepts the set unconditionally. Nothing about a gym floor should depend
    /// on a network, so this never fails and never asks.
    func log(exerciseId: String, reps: Int?, weightKg: Double?, rpe: Int?) async {
        guard let clientId, let exercise = UUID(uuidString: exerciseId) else { return }

        let next = (sets(for: exerciseId).last?.setIndex ?? -1) + 1
        sets.append(
            SetLog(
                id: UUID(),
                clientId: clientId,
                sessionExerciseId: exercise,
                setIndex: next,
                reps: reps,
                weightKg: weightKg,
                rpe: rpe,
                loggedAt: Date(),
                syncedAt: nil
            )
        )

        await persist()
        await flush()
    }

    func undoLast(exerciseId: String) async {
        guard let last = sets(for: exerciseId).last else { return }
        sets.removeAll { $0.id == last.id }

        // A set that already reached the server has to be withdrawn from it
        // too, or the coach keeps reading one the client has taken back.
        if last.syncedAt != nil {
            try? await Backend.client
                .from("set_logs")
                .delete()
                .eq("id", value: last.id.uuidString)
                .execute()
        }

        await persist()
    }

    /// Sends what is held. Failure is silent by design — the sets stay held and
    /// the screen already says so; a modal about the network mid-set would be
    /// the app making its problem hers.
    func flush() async {
        let waiting = held
        guard !waiting.isEmpty, !flushing else { return }

        flushing = true
        defer { flushing = false }

        let now = Date()
        let payload = waiting.map { row -> SetLog in
            var copy = row
            copy.syncedAt = now
            return copy
        }

        do {
            try await Backend.client
                .from("set_logs")
                .upsert(payload, onConflict: "id")
                .execute()

            for row in payload {
                if let index = sets.firstIndex(where: { $0.id == row.id }) {
                    sets[index].syncedAt = now
                }
            }
            await persist()
        } catch {
            // Held. The next log, or the next time Train appears, tries again.
        }
    }

    /// The file is an outbox, not an archive. Once the server has a row, the
    /// server is where it lives — otherwise this grows for the life of the app.
    private func persist() async {
        await SetQueue.shared.save(held)
    }
}
