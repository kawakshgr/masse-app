import SwiftUI

/// Sleep and steps for today.
///
/// Typed, in v1. The shape is the one an Apple Health read would fill, so the
/// day this connects to a Watch it fills these same fields through the same
/// save — the screen would gain a source, not a rewrite.
struct EntryCard: View {
    @State private var sleepH: Double = 0
    @State private var quality: Int?
    @State private var steps: String = ""
    @State private var saved = false
    @State private var loaded = false
    @State private var importing = false
    @State private var healthEmpty = false
    @State private var week: [DailyMetric] = []
    @State private var stepsTarget: Int?

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 14) {
                SectionHeader(title: L.t("entry.title"), symbol: "moon.zzz")

                HStack(spacing: 12) {
                    Text(L.t("entry.sleep"))
                        .font(Ty.copy)
                        .foregroundStyle(Tk.ink2)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    Button { adjust(-0.5) } label: { StepChip("minus") }
                        .accessibilityLabel("\(L.t("entry.sleep")) −")

                    Text(sleepH.clean)
                        .font(Ty.figure)
                        .tracking(Ty.displayTracking(26))
                        .foregroundStyle(Tk.ink)
                        .tabular()
                        .frame(minWidth: 52)
                        .contentTransition(.numericText())

                    Button { adjust(0.5) } label: { StepChip("plus") }
                        .accessibilityLabel("\(L.t("entry.sleep")) +")
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text(L.t("entry.quality"))
                        .font(Ty.copySmall)
                        .foregroundStyle(Tk.ink2)

                    HStack(spacing: 6) {
                        ForEach(1...3, id: \.self) { level in
                            Button {
                                quality = quality == level ? nil : level
                                saved = false
                            } label: {
                                Text(L.t("entry.q\(level)"))
                                    .font(Ty.action)
                                    .foregroundStyle(quality == level ? Tk.ink : Tk.ink2)
                                    .frame(maxWidth: .infinity, minHeight: 44)
                                    .background(
                                        Sel.style(quality == level),
                                        in: .rect(cornerRadius: Tk.R.r1)
                                    )
                            }
                        }
                    }
                }

                HStack(spacing: 12) {
                    Text(L.t("entry.steps"))
                        .font(Ty.copy)
                        .foregroundStyle(Tk.ink2)
                    Spacer(minLength: 8)
                    TextField("—", text: $steps)
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.trailing)
                        .font(Ty.rowTitle)
                        .foregroundStyle(Tk.ink)
                        .tabular()
                        .frame(width: 110)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .background(Tk.glass2, in: .rect(cornerRadius: Tk.R.r1))
                        .onChange(of: steps) { _, _ in saved = false }
                }

                CTA(title: L.t(saved ? "entry.saved" : "entry.save")) {
                    Task { await save() }
                }

                if !week.isEmpty || stepsTarget != nil {
                    Divider().overlay(Tk.hair)
                    StepsChart(days: week, target: stepsTarget)
                }

                if Health.available {
                    SecondaryButton(
                        title: L.t(Health.connected ? "entry.healthAgain" : "entry.health")
                    ) {
                        Task { await importFromHealth() }
                    }
                    .disabled(importing)

                    Text(L.t(healthEmpty ? "entry.healthNone" : "entry.healthNote"))
                        .font(Ty.copySmall)
                        .foregroundStyle(healthEmpty ? Tk.a3 : Tk.ink3)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .task { await load() }
    }

    private func adjust(_ delta: Double) {
        sleepH = max(0, min(16, sleepH + delta))
        saved = false
    }

    private func load() async {
        guard !loaded else { return }
        loaded = true

        if let metric = try? await MetricsFeed.today() {
            sleepH = metric.sleepH ?? 0
            quality = metric.sleepQuality
            steps = metric.steps.map(String.init) ?? ""
            saved = true
        }

        // Once she has connected, the numbers are already there when she opens
        // the app. Only ever after she asked — the first read is a button.
        if Health.connected { await readHealth() }
        await loadWeek()
    }

    private func loadWeek() async {
        week = (try? await MetricsFeed.week()) ?? []
        stepsTarget = await MetricsFeed.stepsTarget()
    }

    /// Fills the fields; it does not save them. She sees what Health said
    /// before her coach does, and a wrong night is hers to correct first.
    private func importFromHealth() async {
        importing = true
        defer { importing = false }

        if !Health.connected {
            guard await Health.connect() else { return }
        }
        await readHealth()
    }

    private func readHealth() async {
        let reading = await Health.todayReading()

        if let hours = reading.sleepH {
            sleepH = hours
            saved = false
        }
        if let count = reading.steps {
            steps = String(count)
            saved = false
        }

        // Nothing measured is not zero, so nothing is written and the card
        // says so rather than showing a 0 she would have to trust.
        healthEmpty = reading.sleepH == nil && reading.steps == nil
    }

    private func save() async {
        try? await MetricsFeed.save(
            DailyMetric(
                day: MetricsFeed.todayIso,
                sleepH: sleepH > 0 ? sleepH : nil,
                sleepQuality: quality,
                steps: Int(steps.filter(\.isNumber))
            )
        )
        saved = true
        // The chart is about the week this save just changed.
        await loadWeek()
    }
}

private struct StepChip: View {
    let name: String
    init(_ name: String) { self.name = name }

    var body: some View {
        Image(systemName: name)
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(Tk.ink)
            .frame(width: 44, height: 44)
            .background(Tk.glass2, in: .rect(cornerRadius: Tk.R.pill))
    }
}
