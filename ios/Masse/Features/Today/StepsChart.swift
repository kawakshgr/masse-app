import SwiftUI

/// Seven days of steps against what her coach asked for.
///
/// A day with nothing logged is drawn as a gap, not as a zero. The difference
/// matters: one says she did not record, the other says she did not walk, and
/// only one of them is something the app knows.
struct StepsChart: View {
    let days: [DailyMetric]
    let target: Int?

    /// Monday to Sunday, always — the week she is in, not a rolling seven days
    /// that start on whatever day she opened the app. Her coach reads the same
    /// week on his side, so they are looking at one thing.
    private var counts: [(label: String, steps: Int?)] {
        let calendar = Calendar(identifier: .iso8601)
        let monday = calendar.date(
            byAdding: .day, value: -Weekday.today, to: Date()
        ) ?? Date()

        return (0..<7).compactMap { offset in
            guard let date = calendar.date(byAdding: .day, value: offset, to: monday)
            else { return nil }
            let iso = date.formatted(.iso8601.year().month().day().dateSeparator(.dash))
            return (
                label: L.t("days.\(offset)"),
                steps: days.first { $0.day == iso }?.steps
            )
        }
    }

    /// Days that cleared the target. Only days she logged are counted, so a
    /// week half entered does not read as a week half failed.
    private var hit: Int {
        guard let target else { return 0 }
        return logged.filter { $0 >= target }.count
    }

    private var average: Int? {
        logged.isEmpty ? nil : logged.reduce(0, +) / logged.count
    }

    private var logged: [Int] { counts.compactMap(\.steps) }

    /// The tallest bar is the biggest of what she walked and what was asked,
    /// so the target line never sits off the top of its own chart.
    private var ceiling: Int {
        max(logged.max() ?? 0, target ?? 0, 1)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text(L.t("stepsChart.title")).kicker()
                Spacer()
                if let target {
                    Text(L.t("stepsChart.target", target.formatted(.number.grouping(.automatic))))
                        .font(Ty.copySmall)
                        .foregroundStyle(Tk.ink2)
                        .tabular()
                }
            }

            if logged.isEmpty {
                Text(L.t("stepsChart.none"))
                    .font(Ty.copySmall)
                    .foregroundStyle(Tk.ink3)
            } else {
                // Where she is, before the bars: the two figures she would
                // otherwise have to work out by reading them.
                HStack(spacing: 8) {
                    stat(
                        L.t("stepsChart.avgBox"),
                        average.map { $0.formatted(.number.grouping(.automatic)) } ?? "—"
                    )
                    if target != nil {
                        stat(
                            L.t("stepsChart.hitBox"),
                            L.t("stepsChart.hitOf", String(hit), String(logged.count)),
                            lit: hit > 0
                        )
                    }
                }

                GeometryReader { proxy in
                    let height = proxy.size.height

                    ZStack(alignment: .bottom) {
                        HStack(alignment: .bottom, spacing: 6) {
                            ForEach(Array(counts.enumerated()), id: \.offset) { _, day in
                                bar(day.steps, height: height)
                            }
                        }

                        // The target, across the bars rather than beside them:
                        // the question is which days cleared it.
                        if let target {
                            let y = height * CGFloat(target) / CGFloat(ceiling)
                            Rectangle()
                                .fill(Tk.a1.opacity(0.55))
                                .frame(height: 1)
                                .offset(y: -y)
                        }
                    }
                }
                .frame(height: 104)

                HStack(spacing: 6) {
                    ForEach(Array(counts.enumerated()), id: \.offset) { _, day in
                        Text(day.label.prefix(1))
                            .font(Ty.copySmall)
                            .foregroundStyle(Tk.ink3)
                            .frame(maxWidth: .infinity)
                    }
                }

                if target == nil {
                    Text(L.t("stepsChart.noTarget"))
                        .font(Ty.copySmall)
                        .foregroundStyle(Tk.ink3)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(spoken)
    }

    @ViewBuilder
    private func bar(_ steps: Int?, height: CGFloat) -> some View {
        if let steps {
            let met = target.map { steps >= $0 } ?? false
            // The chart bar radius, the one the handoff fixes: 5 5 2 2.
            UnevenRoundedRectangle(
                topLeadingRadius: 5, bottomLeadingRadius: 2,
                bottomTrailingRadius: 2, topTrailingRadius: 5
            )
            .fill(met ? AnyShapeStyle(Tk.a1) : AnyShapeStyle(Tk.glass2))
            .frame(height: max(height * CGFloat(steps) / CGFloat(ceiling), 3))
            .frame(maxWidth: .infinity)
        } else {
            // A day with nothing in it, said as nothing.
            RoundedRectangle(cornerRadius: 2)
                .fill(Tk.hair)
                .frame(height: 3)
                .frame(maxWidth: .infinity)
        }
    }

    private func stat(_ label: String, _ value: String, lit: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(Ty.copySmall)
                .foregroundStyle(Tk.ink2)
            Text(value)
                .font(Ty.figure)
                .tracking(Ty.displayTracking(26))
                .foregroundStyle(lit ? Tk.a1 : Tk.ink)
                .tabular()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 10)
        .padding(.horizontal, 12)
        .background(Tk.glass2, in: .rect(cornerRadius: Tk.R.r1))
    }

    private var spoken: String {
        counts
            .compactMap { day in
                day.steps.map {
                    L.t("stepsChart.spoken", day.label, $0.formatted(.number.grouping(.automatic)))
                }
            }
            .joined(separator: " ")
    }
}
