import Foundation
import Observation

/// What the nine steps know between them. The view renders it; it decides
/// nothing itself.
@MainActor
@Observable
final class OnboardingModel {
    var answers = Answers()
    var step = 1
    var busy = false
    var codeRejected = false
    var message: String?
    var messageIsError = false

    private static let titles = [
        1: "codeTitle", 2: "goalTitle", 3: "bodyTitle", 4: "injuriesTitle",
        5: "equipmentTitle", 6: "daysTitle", 7: "cycleTitle", 8: "sleepTitle",
        9: "summaryTitle",
    ]

    var titleKey: String { "onboarding.\(Self.titles[step] ?? "summaryTitle")" }
    var ledeKey: String {
        "onboarding." + (Self.titles[step] ?? "summaryTitle")
            .replacingOccurrences(of: "Title", with: "Lede")
    }

    /// Step 7 is not shown at all unless the coach asked for it — an absent
    /// question is a stronger promise than a question answered "no".
    private var skipsCycle: Bool { !answers.askCycle }

    var canAdvance: Bool {
        switch step {
        case 1: return !answers.code.trimmingCharacters(in: .whitespaces).isEmpty
        case 2: return answers.goal != nil
        case 3: return !answers.name.trimmingCharacters(in: .whitespaces).isEmpty
        case 9: return !answers.email.trimmingCharacters(in: .whitespaces).isEmpty
        default: return true
        }
    }

    var summary: [(String, String)] {
        var rows: [(String, String)] = []
        if let goal = answers.goal { rows.append((L.t("onboarding.goalTitle"), L.t("goal.\(goal)"))) }
        if !answers.name.isEmpty { rows.append((L.t("onboarding.nameLabel"), answers.name)) }
        if !answers.heightCm.isEmpty { rows.append((L.t("onboarding.height"), answers.heightCm)) }
        if !answers.weightKg.isEmpty { rows.append((L.t("onboarding.weight"), answers.weightKg)) }
        if !answers.equipment.isEmpty {
            rows.append((L.t("onboarding.equipmentTitle"),
                         answers.equipment.map { L.t("equipment.\($0)") }.joined(separator: ", ")))
        }
        if !answers.sessionDays.isEmpty {
            rows.append((L.t("onboarding.daysTitle"),
                         answers.sessionDays.sorted().map { L.t("days.\($0)") }.joined(separator: ", ")))
        }
        if answers.askCycle {
            rows.append((L.t("onboarding.cycleTitle"),
                         L.t(answers.cycleTracking ? "onboarding.cycleOn" : "onboarding.cycleOff")))
        }
        if !answers.sleepTargetH.isEmpty { rows.append((L.t("onboarding.sleepTitle"), answers.sleepTargetH)) }
        return rows
    }

    func restore() {
        if let saved = AnswerStore.load() { answers = saved }
    }

    func toggleEquipment(_ item: String) {
        if let index = answers.equipment.firstIndex(of: item) {
            answers.equipment.remove(at: index)
        } else {
            answers.equipment.append(item)
        }
    }

    func toggleDay(_ day: Int) {
        if let index = answers.sessionDays.firstIndex(of: day) {
            answers.sessionDays.remove(at: index)
        } else {
            answers.sessionDays.append(day)
        }
    }

    func back() {
        message = nil
        var next = step - 1
        if next == 7, skipsCycle { next = 6 }
        step = max(1, next)
    }

    func advance() async {
        message = nil
        busy = true
        defer { busy = false }

        if step == 1 {
            // The code is checked against the database before anyone answers
            // eight more questions for nothing.
            codeRejected = false
            do {
                guard let preview = try await InviteFlow.preview(code: answers.code),
                      preview.valid
                else {
                    codeRejected = true
                    return
                }
                answers.coachName = preview.coachName
                answers.askCycle = preview.askCycle
            } catch {
                codeRejected = true
                return
            }
        }

        if step == 9 {
            await finish()
            return
        }

        var next = step + 1
        if next == 7, skipsCycle { next = 8 }
        step = min(9, next)
        AnswerStore.save(answers)
    }

    /// Sends the link and stops. The code is spent only once the link comes
    /// back and there is a session to attach the row to.
    private func finish() async {
        do {
            AnswerStore.save(answers)
            try await InviteFlow.sendMagicLink(to: answers.email)
            message = L.t("onboarding.sent")
            messageIsError = false
        } catch {
            message = L.t("onboarding.failed")
            messageIsError = true
        }
    }
}
