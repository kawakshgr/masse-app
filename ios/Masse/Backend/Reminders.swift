import Foundation
import UserNotifications

/// Two local reminders, and nothing that needs a server.
///
/// Both are scheduled on the phone by the phone. No push token leaves it, so
/// there is no list anywhere of who asked to be nudged, or when.
enum Reminders {
    static let dailyId = "masse.reminder.daily"
    static let weeklyId = "masse.reminder.weekly"

    /// The preferences, keyed where `@AppStorage` reads them.
    enum Key {
        static let daily = "masse.reminder.daily"
        static let dailyMinutes = "masse.reminder.dailyMinutes"
        static let weekly = "masse.reminder.weekly"
    }

    /// 21:00 — late enough that the day's steps are in, early enough that the
    /// night before is still remembered.
    static let defaultDailyMinutes = 21 * 60

    private static var center: UNUserNotificationCenter { .current() }

    static func status() async -> UNAuthorizationStatus {
        await center.notificationSettings().authorizationStatus
    }

    /// Asks once; afterwards the system answers from memory without a sheet.
    static func request() async -> Bool {
        (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
    }

    static func scheduleDaily(minutes: Int) async {
        var when = DateComponents()
        when.hour = minutes / 60
        when.minute = minutes % 60
        await schedule(id: dailyId, body: L.t("settings.dailyBody"), when: when)
    }

    /// Sunday, 18:00. The check-in is keyed on the week that starts Monday, so
    /// Sunday evening is the last moment it is still this week's.
    static func scheduleWeekly() async {
        var when = DateComponents()
        when.weekday = 1
        when.hour = 18
        await schedule(id: weeklyId, body: L.t("settings.weeklyBody"), when: when)
    }

    static func cancel(_ id: String) {
        center.removePendingNotificationRequests(withIdentifiers: [id])
    }

    private static func schedule(id: String, body: String, when: DateComponents) async {
        cancel(id)
        let content = UNMutableNotificationContent()
        content.title = L.t("app.name")
        content.body = body
        content.sound = .default
        let trigger = UNCalendarNotificationTrigger(dateMatching: when, repeats: true)
        try? await center.add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
    }
}
