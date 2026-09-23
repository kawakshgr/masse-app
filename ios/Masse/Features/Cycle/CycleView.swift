import SwiftUI

/// Her cycle: two dates and a length, and nothing else leaves the phone.
///
/// The promise on screen is kept by the schema, not by this view. There is no
/// table for a symptom note, so the note below cannot be sent anywhere even by
/// accident — which is why the copy can say so without hedging.
struct CycleView: View {
    @State private var entries: [CycleEntry] = []
    @State private var state: CycleState?
    @State private var spans: [PhaseSpan] = []
    @State private var start = Date()
    @State private var length = 28
    @State private var note = ""
    @State private var loaded = false
    @State private var saving = false

    private var todayIso: String { MetricsFeed.todayIso }

    var body: some View {
        ZStack {
            Tk.bg.ignoresSafeArea()
            Atmosphere().ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    header
                    if !spans.isEmpty { chartCard }
                    entryCard
                    noteCard
                    if !entries.isEmpty { historyCard }
                }
                .padding(.horizontal, 22)
                .padding(.top, 12)
                .padding(.bottom, 32)
            }
        }
        .task { await load() }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(L.t("clientNav.cycle")).kicker()
            Text(L.t("entry.cycleTitle"))
                .font(Ty.screenTitle)
                .tracking(Ty.displayTracking(30))
                .foregroundStyle(Tk.ink)

            // Derived by the database at read time, so the app never has a
            // second opinion about which phase she is in.
            if let phase = state?.phase {
                Text(L.t("phase.\(phase)").capitalized)
                    .font(Ty.copySmall)
                    .foregroundStyle(Tk.a1)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var chartCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .firstTextBaseline) {
                    Text(L.t("cycleChart.title")).kicker()
                    Spacer()
                    if let day = state?.dayOfCycle, let length = state?.cycleLengthDays {
                        Text(L.t("cycleChart.day", String(day), String(length)))
                            .font(Ty.copySmall)
                            .foregroundStyle(Tk.ink2)
                            .tabular()
                    }
                }

                PhaseBar(
                    spans: spans,
                    currentPhase: state?.phase,
                    dayOfCycle: state?.dayOfCycle,
                    cycleLength: state?.cycleLengthDays ?? 28
                )
            }
        }
    }

    private var entryCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 14) {
                DatePicker(
                    L.t("entry.periodStart"),
                    selection: $start,
                    in: ...Date(),
                    displayedComponents: .date
                )
                .datePickerStyle(.compact)
                .tint(Tk.a1)
                .font(Ty.copy)
                .foregroundStyle(Tk.ink2)

                HStack(spacing: 12) {
                    Text(L.t("entry.cycleLength"))
                        .font(Ty.copy)
                        .foregroundStyle(Tk.ink2)
                    Spacer(minLength: 8)
                    Stepper(value: $length, in: 15...60) {
                        Text("\(length)")
                            .font(Ty.rowTitle)
                            .foregroundStyle(Tk.ink)
                            .tabular()
                    }
                    .tint(Tk.a1)
                    .fixedSize()
                }

                CTA(title: L.t("entry.save"), enabled: !saving) {
                    Task { await save() }
                }

                Text(L.t("entry.cyclePromise"))
                    .font(Ty.copySmall)
                    .foregroundStyle(Tk.ink3)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private var noteCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 10) {
                Text(L.t("entry.symptomNote")).kicker()

                TextEditor(text: $note)
                    .font(Ty.copy)
                    .foregroundStyle(Tk.ink)
                    .scrollContentBackground(.hidden)
                    .frame(minHeight: 88)
                    .padding(10)
                    .background(Tk.glass2, in: .rect(cornerRadius: Tk.R.r1))
                    .onChange(of: note) { _, new in
                        SymptomNotes.write(new, on: todayIso)
                    }

                Text(L.t("entry.symptomHint"))
                    .font(Ty.copySmall)
                    .foregroundStyle(Tk.ink3)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private var historyCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 10) {
                Text(L.t("entry.history")).kicker()

                ForEach(entries) { entry in
                    HStack {
                        Text(entry.periodStartDate)
                            .font(Ty.rowTitle)
                            .foregroundStyle(Tk.ink)
                            .tabular()
                        Spacer(minLength: 8)
                        Text("\(entry.cycleLengthDays) j")
                            .font(Ty.copySmall)
                            .foregroundStyle(Tk.ink3)
                            .tabular()
                        Button {
                            Task { await remove(entry) }
                        } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(Tk.ink3)
                                .frame(width: 32, height: 32)
                        }
                        .accessibilityLabel(L.t("entry.remove"))
                    }
                }
            }
        }
    }

    private func load() async {
        note = SymptomNotes.note(on: todayIso)
        entries = (try? await CycleFeed.recent()) ?? []
        state = try? await CycleFeed.state()
        // The phase widths belong to her cycle's length, not to a textbook's.
        if let length = state?.cycleLengthDays {
            spans = await CycleFeed.spans(cycleLength: length)
        } else {
            spans = []
        }
        loaded = true
    }

    private func save() async {
        saving = true
        try? await CycleFeed.add(start: start, lengthDays: length)
        await load()
        saving = false
    }

    private func remove(_ entry: CycleEntry) async {
        try? await CycleFeed.delete(id: entry.id)
        await load()
    }
}
