import ActivityKit
import Foundation
import Observation
import UserNotifications

/// The rest between two sets, and the session on the Lock Screen.
///
/// The timer is two dates, not a counter: the phone goes back in a pocket the
/// moment a set is logged, and a counter would stop with the app. The Live
/// Activity draws its countdown from the same two dates, and a local
/// notification fires at the end — so the rest is kept on time whether she
/// looks at the app, the Lock Screen, or nothing.
@MainActor
@Observable
final class RestTimer {
    private(set) var startedAt: Date?
    private(set) var endsAt: Date?

    /// The length she last settled on. The coach's programme has no rest
    /// column, so her own habit is the best default there is.
    var duration: TimeInterval {
        get {
            let stored = UserDefaults.standard.double(forKey: Self.durationKey)
            return stored > 0 ? stored : 120
        }
        set { UserDefaults.standard.set(min(max(newValue, 15), 600), forKey: Self.durationKey) }
    }

    var resting: Bool { (endsAt ?? .distantPast) > .now }

    private static let durationKey = "masse.rest.seconds"
    private static let notificationId = "masse.rest"

    /// The activity is found again by id each time rather than held: Activity
    /// is not Sendable, and every call on it leaves the main actor.
    private var activityId: String?
    private var sessionName = ""
    private var exercise = ""
    private var nextSet = 1

    /// A set was just logged: rest starts, and the Lock Screen follows.
    func start(sessionName: String, exercise: String, nextSet: Int) {
        self.sessionName = sessionName
        self.exercise = exercise
        self.nextSet = nextSet

        let now = Date()
        startedAt = now
        endsAt = now.addingTimeInterval(duration)
        publish()
        Task { await scheduleNotification() }
    }

    /// ±15 s, remembered as her new default: if she keeps adding time, the
    /// next rest should not make her add it again.
    func adjust(by seconds: TimeInterval) {
        guard let start = startedAt, let end = endsAt else { return }
        let newEnd = max(end.addingTimeInterval(seconds), Date().addingTimeInterval(1))
        endsAt = newEnd
        duration = newEnd.timeIntervalSince(start)
        publish()
        Task { await scheduleNotification() }
    }

    func skip() {
        startedAt = nil
        endsAt = nil
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [Self.notificationId])
        publish()
    }

    /// The session is over: the Lock Screen is cleared at once, not left
    /// holding a workout she has finished.
    func finish() {
        skip()
        guard let id = activityId else { return }
        activityId = nil
        Task { await Self.end(id) }
    }

    // Off the main actor: Activity is not Sendable, so it is looked up and used
    // on the same side of the boundary.
    nonisolated private static func end(_ id: String) async {
        for activity in Activity<SessionActivityAttributes>.activities where activity.id == id {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
    }

    nonisolated private static func update(
        _ id: String,
        _ content: ActivityContent<SessionActivityAttributes.ContentState>
    ) async {
        for activity in Activity<SessionActivityAttributes>.activities where activity.id == id {
            await activity.update(content)
        }
    }

    nonisolated private static func exists(_ id: String) -> Bool {
        Activity<SessionActivityAttributes>.activities.contains { $0.id == id }
    }

    /// Activities left by an earlier launch — a session never finished, an app
    /// killed mid-rest — are ended rather than left on the Lock Screen.
    static func endStale() {
        Task {
            for activity in Activity<SessionActivityAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
        }
    }

    // MARK: - Live Activity

    private var state: SessionActivityAttributes.ContentState {
        .init(
            exercise: exercise,
            detail: L.t("log.nextSet", String(nextSet)),
            restStartedAt: resting ? startedAt : nil,
            restEndsAt: resting ? endsAt : nil,
            restLabel: L.t("log.rest"),
            readyLabel: L.t("log.ready")
        )
    }

    private func publish() {
        guard ActivityAuthorizationInfo().areActivitiesEnabled, !exercise.isEmpty else { return }

        // Stale after the rest, or after an hour of nothing: a session left
        // open should fade rather than claim to be running all day.
        let content = ActivityContent(
            state: state,
            staleDate: endsAt ?? Date().addingTimeInterval(3600)
        )

        if let id = activityId, Self.exists(id) {
            Task { await Self.update(id, content) }
        } else {
            activityId = (try? Activity.request(
                attributes: SessionActivityAttributes(sessionName: sessionName),
                content: content
            ))?.id
        }
    }

    // MARK: - Notification

    /// Asked for the first time a rest starts — the moment it is obviously
    /// useful — and never at launch.
    private func scheduleNotification() async {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [Self.notificationId])
        guard let endsAt else { return }

        let settings = await center.notificationSettings()
        if settings.authorizationStatus == .notDetermined {
            _ = try? await center.requestAuthorization(options: [.alert, .sound])
        }

        let content = UNMutableNotificationContent()
        content.title = L.t("log.restNotifTitle")
        content.body = L.t("log.restNotifBody", exercise, String(nextSet))
        content.sound = .default

        let interval = max(endsAt.timeIntervalSinceNow, 1)
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
        try? await center.add(UNNotificationRequest(identifier: Self.notificationId, content: content, trigger: trigger))
    }
}
