import SwiftUI

/// Today. The week the coach pushed, and the session standing in it.
///
/// A day with nothing in it is a designed state, not a blank one: it says so,
/// and says what the week holds instead.
struct TodayView: View {
    let firstName: String?

    @Environment(Session.self) private var session
    @State private var week: PushedWeek?
    @State private var loaded = false
    @State private var failed = false
    @State private var training: PushedWeek.DaySession?

    /// Monday is 0, the way the database counts.
    private var todayIndex: Int {
        (Calendar(identifier: .iso8601).component(.weekday, from: Date()) + 5) % 7
    }

    private var todaySession: PushedWeek.DaySession? {
        week?.week?.sessions.first { $0.dayIndex == todayIndex }
    }

    var body: some View {
        ZStack {
            Tk.bg.ignoresSafeArea()
            Atmosphere().ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    header

                    if !loaded {
                        ProgressView().tint(Tk.a1).frame(maxWidth: .infinity)
                    } else if let todaySession, !todaySession.exercises.isEmpty {
                        sessionCard(todaySession)
                    } else if week != nil {
                        restCard
                    } else {
                        emptyCard
                    }
                }
                .padding(.horizontal, 22)
                .padding(.top, 12)
                .padding(.bottom, 32)
            }
        }
        .task { await load() }
        .fullScreenCover(item: $training) { TrainView(day: $0) }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(L.t("today.title")).kicker()
            Text(greeting)
                .font(Ty.screenTitle)
                .tracking(Ty.displayTracking(30))
                .foregroundStyle(Tk.ink)
            if let body = week?.week {
                Text(weekLine(body))
                    .font(Ty.copySmall)
                    .foregroundStyle(Tk.ink2)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var greeting: String {
        firstName.map { "\(L.t("today.title")), \($0)" } ?? L.t("today.title")
    }

    /// Derived from the row beside it: the programme's own name and its own
    /// week number, never a count made up here.
    private func weekLine(_ body: PushedWeek.WeekBody) -> String {
        let programme = body.programme?.name
        let week = L.t("today.week") + " \(body.weekNumber)"
        return [programme, week].compactMap { $0 }.joined(separator: " · ")
    }

    private func sessionCard(_ day: PushedWeek.DaySession) -> some View {
        VStack(spacing: 14) {
            GlassCard {
                VStack(alignment: .leading, spacing: 14) {
                    if let name = day.name {
                        Text(name)
                            .font(Ty.cardTitle)
                            .tracking(Ty.displayTracking(19))
                            .foregroundStyle(Tk.ink)
                    }

                    ForEach(day.exercises.sorted { $0.position < $1.position }) { exercise in
                        VStack(alignment: .leading, spacing: 3) {
                            Text(exercise.name)
                                .font(Ty.rowTitle)
                                .foregroundStyle(Tk.ink)
                            if let detail = target(exercise) {
                                Text(detail)
                                    .font(Ty.copySmall)
                                    .foregroundStyle(Tk.ink2)
                                    .tabular()
                            }
                            if let cue = exercise.cue {
                                Text(cue)
                                    .font(Ty.copySmall)
                                    .foregroundStyle(Tk.ink3)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }

            // The whole point of the screen. Nothing above it moves to make room.
            CTA(title: L.t("log.title")) { training = day }
        }
    }

    /// Sets, reps and load as the coach wrote them — assembled from the row,
    /// with nothing invented when a part of it is missing.
    private func target(_ exercise: PushedWeek.Exercise) -> String? {
        var parts: [String] = []
        if let sets = exercise.targetSets, let reps = exercise.targetReps {
            parts.append("\(sets) × \(reps)")
        } else if let scheme = exercise.scheme {
            parts.append(scheme)
        }
        if let weight = exercise.targetWeightKg {
            parts.append("\(weight.clean) kg")
        }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }

    private var restCard: some View {
        GlassCard {
            Text(L.t("today.rest"))
                .font(Ty.cardTitle)
                .tracking(Ty.displayTracking(19))
                .foregroundStyle(Tk.ink)
        }
    }

    private var emptyCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 8) {
                Text(L.t(failed ? "offline.title" : "today.none"))
                    .font(Ty.cardTitle)
                    .tracking(Ty.displayTracking(19))
                    .foregroundStyle(Tk.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Text(L.t(failed ? "offline.lede" : "today.noneHint"))
                    .font(Ty.copy)
                    .foregroundStyle(Tk.ink2)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func load() async {
        do {
            week = try await WeekFeed.current()
            failed = false
        } catch {
            failed = true
        }
        loaded = true
    }
}

extension Double {
    /// 60 rather than 60.0, but 62.5 keeps its half.
    var clean: String {
        self == rounded() ? String(Int(self)) : String(self)
    }
}
