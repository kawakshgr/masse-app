import Foundation

/// What today's phase changes about the plan, as her coach set it.
///
/// The database decides the phase and returns the levers; this only applies
/// them to the numbers on screen and says so. The programme itself is never
/// rewritten — the coach's 80 kg stays 80 kg in the table, and she is shown
/// 72 kg with the reason beside it.
struct CycleLevers: Sendable {
    let phase: String
    let loadPct: Int
    let rpeCap: Double?
    let setsDelta: Int
    let kcalDelta: Int
    let carbsDelta: Int

    init?(_ state: CycleState?) {
        guard let state, let phase = state.phase else { return nil }
        self.phase = phase
        loadPct = state.loadPct ?? 0
        rpeCap = state.rpeCap
        setsDelta = state.setsDelta ?? 0
        kcalDelta = state.kcalDelta ?? 0
        carbsDelta = state.carbsDelta ?? 0
    }

    /// The phase, derived server-side, with its levers. Nil when she does not
    /// track her cycle — then nothing is adjusted, and nothing says it was.
    static func today() async -> CycleLevers? {
        CycleLevers(try? await CycleFeed.state())
    }

    var changesTraining: Bool { loadPct != 0 || rpeCap != nil || setsDelta != 0 }
    var changesNutrition: Bool { kcalDelta != 0 || carbsDelta != 0 }

    /// To the nearest half kilo: a load nobody can put on a bar is no help.
    func weight(_ kg: Double?) -> Double? {
        guard let kg else { return nil }
        guard loadPct != 0 else { return kg }
        return ((kg * (1 + Double(loadPct) / 100)) * 2).rounded() / 2
    }

    /// Never below one set: a phase trims a session, it does not cancel it.
    func sets(_ n: Int?) -> Int? {
        guard let n else { return nil }
        return max(1, n + setsDelta)
    }

    func kcal(_ n: Int) -> Int { n + kcalDelta }
    func carbs(_ g: Double?) -> Double? { g.map { max(0, $0 + Double(carbsDelta)) } }

    /// "Ajusté pour ta phase lutéale · charge −5 %, séries −1, RPE max 8"
    var trainingLine: String {
        var parts: [String] = []
        if loadPct != 0 { parts.append(L.t("cycleAdjust.load", Self.signed(loadPct))) }
        if setsDelta != 0 { parts.append(L.t("cycleAdjust.sets", Self.signed(setsDelta))) }
        if let rpeCap { parts.append(L.t("cycleAdjust.rpe", rpeCap.clean)) }
        return title + " · " + parts.joined(separator: ", ")
    }

    var nutritionLine: String {
        var parts: [String] = []
        if kcalDelta != 0 { parts.append(L.t("cycleAdjust.kcal", Self.signed(kcalDelta))) }
        if carbsDelta != 0 { parts.append(L.t("cycleAdjust.carbs", Self.signed(carbsDelta))) }
        return title + " · " + parts.joined(separator: ", ")
    }

    private var title: String { L.t("cycleAdjust.title", L.t("phase.\(phase)")) }

    /// A real minus sign, and a plus when it adds: "−10", "+5".
    static func signed(_ n: Int) -> String {
        n > 0 ? "+\(n)" : n < 0 ? "−\(-n)" : "0"
    }
}
