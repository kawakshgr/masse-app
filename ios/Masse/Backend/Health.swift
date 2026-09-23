import Foundation
import HealthKit

/// Apple Health, for two numbers and no more.
///
/// Sleep and steps are read; nothing is written back. The cycle is never read
/// at all — Health exposes menstrual data, and taking it would pull in exactly
/// what "dates only, never symptoms" was written to keep out. That the app does
/// not ask is the guarantee; a toggle would not be one.
///
/// Sleep quality stays typed. Health does not know whether a night was rough,
/// and inventing a score from time asleep would put a number in the coach's
/// hands that nobody measured.
enum Health {

    /// Whether she has connected at all. Read authorisation cannot be queried —
    /// Apple deliberately hides it, so that an app cannot learn a person has no
    /// data — so this records the asking, never the answer.
    private static let connectedKey = "masse.health.connected"

    static var available: Bool { HKHealthStore.isHealthDataAvailable() }

    static var connected: Bool {
        get { UserDefaults.standard.bool(forKey: connectedKey) }
        set { UserDefaults.standard.set(newValue, forKey: connectedKey) }
    }

    private static let store = HKHealthStore()

    private static var readTypes: Set<HKObjectType> {
        [
            HKQuantityType(.stepCount),
            HKCategoryType(.sleepAnalysis),
        ]
    }

    /// Returns once she has answered the sheet, whichever way. A refusal is
    /// indistinguishable from a grant by design, so this cannot report which.
    static func connect() async -> Bool {
        guard available else { return false }
        do {
            try await store.requestAuthorization(toShare: [], read: readTypes)
            connected = true
            return true
        } catch {
            return false
        }
    }

    /// What Health has for today. Either value may be nil, which means "not
    /// measured" and not "zero" — a day with no watch on the wrist has no step
    /// count, and writing 0 would be a claim nobody made.
    static func todayReading() async -> (sleepH: Double?, steps: Int?) {
        guard available else { return (nil, nil) }
        async let sleep = sleptHours()
        async let steps = stepCount()
        return await (sleep, steps)
    }

    /// Steps since midnight.
    ///
    /// A statistics query rather than a sum over raw samples: an iPhone in a
    /// pocket and a Watch on a wrist both record walking, and adding the
    /// samples up would count the same steps twice. HealthKit already knows
    /// which source to prefer, and this is the call that asks it.
    private static func stepCount() async -> Int? {
        let start = Calendar.current.startOfDay(for: Date())
        let predicate = HKQuery.predicateForSamples(withStart: start, end: Date())

        return await withCheckedContinuation { continuation in
            let query = HKStatisticsQuery(
                quantityType: HKQuantityType(.stepCount),
                quantitySamplePredicate: predicate,
                options: .cumulativeSum
            ) { _, statistics, _ in
                guard let sum = statistics?.sumQuantity() else {
                    continuation.resume(returning: nil)
                    return
                }
                continuation.resume(returning: Int(sum.doubleValue(for: .count())))
            }
            store.execute(query)
        }
    }

    /// Last night's sleep, in hours.
    ///
    /// The window runs from midday yesterday to midday today, because the night
    /// that belongs to today started before it. Only the asleep stages count:
    /// time in bed is not time asleep, and the difference is the part a coach
    /// would read as a bad night.
    ///
    /// Overlapping samples are merged rather than added. A Watch writes core,
    /// deep and REM as separate rows and an iPhone may write its own estimate
    /// over the same hours; summing the durations would invent sleep.
    private static func sleptHours() async -> Double? {
        let calendar = Calendar.current
        let noonToday = calendar.date(
            bySettingHour: 12, minute: 0, second: 0, of: Date()
        ) ?? Date()
        let start = calendar.date(byAdding: .day, value: -1, to: noonToday) ?? noonToday
        let predicate = HKQuery.predicateForSamples(withStart: start, end: Date())

        let samples: [HKCategorySample] = await withCheckedContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: HKCategoryType(.sleepAnalysis),
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, results, _ in
                continuation.resume(returning: (results as? [HKCategorySample]) ?? [])
            }
            store.execute(query)
        }

        let asleep: Set<Int> = [
            HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue,
            HKCategoryValueSleepAnalysis.asleepCore.rawValue,
            HKCategoryValueSleepAnalysis.asleepDeep.rawValue,
            HKCategoryValueSleepAnalysis.asleepREM.rawValue,
        ]

        let intervals = samples
            .filter { asleep.contains($0.value) }
            .map { ($0.startDate, $0.endDate) }
            .sorted { $0.0 < $1.0 }

        guard !intervals.isEmpty else { return nil }

        var total: TimeInterval = 0
        var (spanStart, spanEnd) = intervals[0]

        for (from, to) in intervals.dropFirst() {
            if from <= spanEnd {
                spanEnd = max(spanEnd, to)
            } else {
                total += spanEnd.timeIntervalSince(spanStart)
                (spanStart, spanEnd) = (from, to)
            }
        }
        total += spanEnd.timeIntervalSince(spanStart)

        // To the nearest quarter hour. Health knows the seconds; nobody reads a
        // night's sleep to the second, and the entry card steps in halves.
        return (total / 3600 * 4).rounded() / 4
    }
}
