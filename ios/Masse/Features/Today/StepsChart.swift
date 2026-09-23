import SwiftUI

/// Seven days of steps against what her coach asked for.
///
/// A day with nothing logged is drawn as a gap, not as a zero. The difference
/// matters: one says she did not record, the other says she did not walk, and
/// only one of them is something the app knows.
struct StepsChart: View {
    let days: [DailyMetric]
    let target: Int?

    private var counts: [(label: String, steps: Int?)] {
        // Seven slots ending today, so the shape of the week is the same
        // whether she logged every day or two of them.
        let calendar = Calendar(identifier: .iso8601)
        return (0..<7).reversed().compactMap { back in
            guard let date = calendar.date(byAdding: .day, value: -back, to: Date())
            else { return nil }
            let iso = date.formatted(.iso8601.year().month().day().dateSeparator(.dash))
            let weekday = (calendar.component(.weekday, from: date) + 5) % 7
            return (
                label: L.t("days.\(weekday)"),
                steps: days.first { $0.day == iso }?.steps
            )
        }
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

                Text(summary)
                    .font(Ty.copySmall)
                    .foregroundStyle(Tk.ink3)
                    .tabular()
                    .fixedSize(horizontal: false, vertical: true)
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

    private var summary: String {
        guard !logged.isEmpty else { return "" }
        if target == nil { return L.t("stepsChart.noTarget") }
        let average = logged.reduce(0, +) / logged.count
        return L.t("stepsChart.avg", average.formatted(.number.grouping(.automatic)))
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
