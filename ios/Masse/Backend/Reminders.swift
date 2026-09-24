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

    /// 18:00 on the day her coach set the check-in due.
    static func scheduleWeekly(dueOffset: Int) async {
        var when = DateComponents()
        when.weekday = calendarWeekday(dueOffset)
        when.hour = 18
        await schedule(id: weeklyId, body: L.t("settings.weeklyBody"), when: when)
    }

    /// Her coach may change the day at any time; each launch puts the reminder
    /// back on the current one.
    static func refreshWeekly() async {
        guard UserDefaults.standard.bool(forKey: Key.weekly) else { return }
        await scheduleWeekly(dueOffset: await CheckInFeed.dueOffset())
    }

    /// An offset from a Monday (7 is the next Monday) as Calendar counts
    /// weekdays: Sunday is 1, Monday 2.
    static func calendarWeekday(_ dueOffset: Int) -> Int {
        let mondayBased = dueOffset % 7
        return mondayBased == 6 ? 1 : mondayBased + 2
    }

    /// "dimanche", in the app's language.
    static func weekdayName(_ dueOffset: Int) -> String {
        let locale = Locale(identifier: Bundle.main.preferredLocalizations.first == "en" ? "en_GB" : "fr_FR")
        var calendar = Calendar(identifier: .gregorian)
        calendar.locale = locale
        return calendar.weekdaySymbols[calendarWeekday(dueOffset) - 1]
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
