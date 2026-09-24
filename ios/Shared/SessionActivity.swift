import ActivityKit
import Foundation

/// The running session, as the Lock Screen and the Dynamic Island show it.
///
/// Compiled into both the app and the widget extension — it is the contract
/// between them. Every word arrives already in her language: the extension
/// carries no string catalog, so it is told what to say rather than asked.
struct SessionActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        /// The exercise she is on.
        var exercise: String
        /// "Série 3" — what comes next, or what is done.
        var detail: String
        /// Both set while resting, both nil otherwise. The countdown is drawn
        /// by the system from these dates, so it keeps time with the app asleep.
        var restStartedAt: Date?
        var restEndsAt: Date?
        var restLabel: String
        var readyLabel: String
    }

    var sessionName: String
}
