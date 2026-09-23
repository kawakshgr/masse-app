import SwiftUI

/// The session, being done.
///
/// Built for a hand in a gym: every control is a thumb's width, the numbers
/// carry over from the last set so a working set costs one tap, and nothing
/// waits on the network.
struct TrainView: View {
    let day: PushedWeek.DaySession

    @Environment(\.dismiss) private var dismiss
    @State private var log = TrainingLog()
    @State private var open: String?

    private var exercises: [PushedWeek.Exercise] {
        day.exercises.sorted { $0.position < $1.position }
    }

    var body: some View {
        ZStack {
            Tk.bg.ignoresSafeArea()
            Atmosphere().ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    header

                    ForEach(exercises) { exercise in
                        ExerciseCard(
                            exercise: exercise,
                            logged: log.sets(for: exercise.id),
                            expanded: open == exercise.id,
                            onToggle: {
                                withAnimation(.snappy) {
                                    open = open == exercise.id ? nil : exercise.id
                                }
                            },
                            onLog: { reps, weight, rpe in
                                await log.log(
                                    exerciseId: exercise.id,
                                    reps: reps,
                                    weightKg: weight,
                                    rpe: rpe
                                )
                            },
                            onUndo: { await log.undoLast(exerciseId: exercise.id) }
                        )
                    }
                }
                .padding(.horizontal, 22)
                .padding(.top, 12)
                .padding(.bottom, 40)
            }
        }
        .task {
            await log.start(exerciseIds: exercises.map(\.id))
            // Open the first exercise with nothing logged: where she is.
            open = exercises.first { log.sets(for: $0.id).isEmpty }?.id
                ?? exercises.first?.id
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(L.t("log.title")).kicker()
                Spacer()
                Button(L.t("common.close")) { dismiss() }
                    .font(Ty.copySmall)
                    .foregroundStyle(Tk.ink2)
            }

            Text(day.name ?? L.t("log.title"))
                .font(Ty.screenTitle)
                .tracking(Ty.displayTracking(30))
                .foregroundStyle(Tk.ink)

            // Offline is a state, not an error: it is reported, in the plural
            // the count actually needs, and never as a failure.
            if !log.held.isEmpty {
                Text(L.heldCount(log.held.count))
                    .font(Ty.copySmall)
                    .foregroundStyle(Tk.a3)
                    .tabular()
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.bottom, 4)
    }
}

/// One exercise: what was asked, what has been done, and the next set.
private struct ExerciseCard: View {
    let exercise: PushedWeek.Exercise
    let logged: [SetLog]
    let expanded: Bool
    let onToggle: () -> Void
    let onLog: (Int?, Double?, Int?) async -> Void
    let onUndo: () async -> Void

    @State private var reps: Int = 0
    @State private var weight: Double = 0
    @State private var rpe: Int?

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: expanded ? 16 : 8) {
                Button(action: onToggle) {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(alignment: .firstTextBaseline) {
                            Text(exercise.name)
                                .font(Ty.cardTitle)
                                .tracking(Ty.displayTracking(19))
                                .foregroundStyle(Tk.ink)
                                .multilineTextAlignment(.leading)
                            Spacer(minLength: 10)
                            Text(L.sets(logged.count))
                                .font(Ty.emphasis)
                                .foregroundStyle(logged.isEmpty ? Tk.ink3 : Tk.a1)
                                .tabular()
                        }

                        if let target = targetLine {
                            Text(target)
                                .font(Ty.copySmall)
                                .foregroundStyle(Tk.ink2)
                                .tabular()
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .buttonStyle(.plain)

                if !logged.isEmpty {
                    VStack(spacing: 6) { ForEach(logged) { SetRow(set: $0) } }
                }

                if expanded {
                    entry
                }
            }
        }
    }

    /// What the coach asked for, assembled from the row — nothing invented
    /// when a part of it is missing.
    private var targetLine: String? {
        var parts: [String] = []
        if let sets = exercise.targetSets, let reps = exercise.targetReps {
            parts.append("\(sets) × \(reps)")
        } else if let scheme = exercise.scheme {
            parts.append(scheme)
        }
        if let weight = exercise.targetWeightKg {
            parts.append("\(weight.clean) kg")
        }
        guard !parts.isEmpty else { return nil }
        return L.t("log.target") + " · " + parts.joined(separator: " · ")
    }

    private var entry: some View {
        VStack(spacing: 14) {
            if let cue = exercise.cue {
                Text(cue)
                    .font(Ty.copySmall)
                    .foregroundStyle(Tk.ink3)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            Stepper1(
                label: L.t("log.reps"),
                value: Double(reps),
                step: 1,
                format: { String(Int($0)) },
                onChange: { reps = max(0, Int($0)) }
            )

            Stepper1(
                label: L.t("log.weight"),
                value: weight,
                step: 2.5,
                format: { $0.clean },
                onChange: { weight = max(0, $0) }
            )

            RPEPicker(value: $rpe)

            HStack(spacing: 10) {
                CTA(title: L.t("log.addSet")) {
                    Task {
                        await onLog(reps > 0 ? reps : nil, weight > 0 ? weight : nil, rpe)
                    }
                }

                if !logged.isEmpty {
                    Button {
                        Task { await onUndo() }
                    } label: {
                        Image(systemName: "arrow.uturn.backward")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Tk.ink2)
                            .frame(width: 52, height: 52)
                            .background(Tk.glass2, in: .rect(cornerRadius: Tk.R.pill))
                    }
                    .accessibilityLabel(L.t("common.undo"))
                }
            }
        }
        .onAppear(perform: prefill)
    }

    /// The next set starts where the last one ended, and the first starts at
    /// what the coach asked for. Typing a number should be the exception.
    private func prefill() {
        guard reps == 0, weight == 0 else { return }
        if let last = logged.last {
            reps = last.reps ?? 0
            weight = last.weightKg ?? 0
            rpe = last.rpe
            return
        }
        reps = exercise.targetReps.flatMap { Int($0.prefix(while: \.isNumber)) } ?? 0
        weight = exercise.targetWeightKg ?? 0
    }
}

/// A logged set, read back.
private struct SetRow: View {
    let set: SetLog

    var body: some View {
        HStack(spacing: 10) {
            Text("\(set.setIndex + 1)")
                .font(Ty.emphasis)
                .foregroundStyle(Tk.ink3)
                .frame(width: 18, alignment: .leading)
                .tabular()

            Text(figures)
                .font(Ty.rowTitle)
                .foregroundStyle(Tk.ink)
                .tabular()

            Spacer(minLength: 6)

            // Held, not failed. The dot is the whole message.
            if set.syncedAt == nil {
                Circle()
                    .fill(Tk.a3)
                    .frame(width: 6, height: 6)
                    .accessibilityLabel(L.t("log.held"))
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 9)
        .background(Tk.glass2, in: .rect(cornerRadius: Tk.R.r1))
    }

    private var figures: String {
        var parts: [String] = []
        if let reps = set.reps { parts.append("\(reps)") }
        if let weight = set.weightKg { parts.append("\(weight.clean) kg") }
        if let rpe = set.rpe { parts.append("RPE \(rpe)") }
        return parts.isEmpty ? "—" : parts.joined(separator: " · ")
    }
}

/// A number with a thumb on each side. The figure itself is the size it is
/// because it gets read at arm's length, mid-set.
private struct Stepper1: View {
    let label: String
    let value: Double
    let step: Double
    let format: (Double) -> String
    let onChange: (Double) -> Void

    var body: some View {
        HStack(spacing: 12) {
            Text(label)
                .font(Ty.copySmall)
                .foregroundStyle(Tk.ink2)
                .frame(width: 44, alignment: .leading)

            Button { onChange(value - step) } label: { Glyph("minus") }
                .accessibilityLabel("\(label) −")

            Text(format(value))
                .font(Ty.figure)
                .tracking(Ty.displayTracking(26))
                .foregroundStyle(Tk.ink)
                .tabular()
                .frame(maxWidth: .infinity)
                .contentTransition(.numericText())

            Button { onChange(value + step) } label: { Glyph("plus") }
                .accessibilityLabel("\(label) +")
        }
    }
}

private struct Glyph: View {
    let name: String
    init(_ name: String) { self.name = name }

    var body: some View {
        Image(systemName: name)
            .font(.system(size: 17, weight: .semibold))
            .foregroundStyle(Tk.ink)
            .frame(width: 52, height: 52)
            .background(Tk.glass2, in: .rect(cornerRadius: Tk.R.pill))
    }
}

/// Optional, and it looks optional: nothing is preselected, and tapping the
/// chosen one clears it.
private struct RPEPicker: View {
    @Binding var value: Int?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(L.t("log.rpe"))
                .font(Ty.copySmall)
                .foregroundStyle(Tk.ink2)

            HStack(spacing: 6) {
                ForEach(6...10, id: \.self) { n in
                    Button {
                        value = value == n ? nil : n
                    } label: {
                        Text("\(n)")
                            .font(Ty.action)
                            .foregroundStyle(value == n ? Tk.ink : Tk.ink2)
                            .frame(maxWidth: .infinity, minHeight: 44)
                            .background(Sel.style(value == n), in: .rect(cornerRadius: Tk.R.r1))
                            .tabular()
                    }
                }
            }
        }
    }
}
