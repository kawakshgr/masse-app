import SwiftUI

/// Her weekly check-in, filed by her.
///
/// It shows one of three things and never two: her coach already filed this
/// week, she already filed it, or it is waiting. The form only opens in the
/// third case — a check-in her coach has written is his assessment, and she
/// does not edit it.
struct CheckInCard: View {
    @State private var existing: CheckIn?
    @State private var loaded = false
    @State private var open = false

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 10) {
                Text(L.t("bilan.title")).kicker()

                if !loaded {
                    ProgressView().tint(Tk.a1)
                } else if let existing, existing.author == "coach" {
                    Text(L.t("bilan.byCoach"))
                        .font(Ty.copy)
                        .foregroundStyle(Tk.ink2)
                        .fixedSize(horizontal: false, vertical: true)
                } else if let existing {
                    Text(L.t("bilan.done"))
                        .font(Ty.cardTitle)
                        .tracking(Ty.displayTracking(19))
                        .foregroundStyle(Tk.ink)
                    Text(L.t(existing.reviewedAt == nil ? "bilan.waiting" : "bilan.reviewed"))
                        .font(Ty.copySmall)
                        .foregroundStyle(existing.reviewedAt == nil ? Tk.ink3 : Tk.a1)

                    // Still hers to correct, until her coach has read it.
                    if existing.reviewedAt == nil {
                        SecondaryButton(title: L.t("common.save")) { open = true }
                    }
                } else {
                    Text(L.t("bilan.prompt"))
                        .font(Ty.copy)
                        .foregroundStyle(Tk.ink2)
                        .fixedSize(horizontal: false, vertical: true)
                    CTA(title: L.t("bilan.open")) { open = true }
                }
            }
        }
        .task { await load() }
        .sheet(isPresented: $open) {
            CheckInSheet(existing: existing) {
                open = false
                Task { await load() }
            }
        }
    }

    private func load() async {
        existing = try? await CheckInFeed.thisWeek()
        loaded = true
    }
}

/// The form. Three questions with three answers each, a weight, and a line for
/// what the boxes do not say.
private struct CheckInSheet: View {
    let existing: CheckIn?
    let onDone: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var feel: String?
    @State private var pain: String?
    @State private var adherence: String?
    @State private var weight = ""
    @State private var note = ""
    @State private var saving = false

    var body: some View {
        ZStack {
            Tk.bg.ignoresSafeArea()
            Atmosphere().ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(L.t("bilan.title"))
                            .font(Ty.screenTitle)
                            .tracking(Ty.displayTracking(30))
                            .foregroundStyle(Tk.ink)
                        Text(L.t("bilan.lede"))
                            .font(Ty.copySmall)
                            .foregroundStyle(Tk.ink2)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    choice(L.t("checkin.feel"), CheckIn.feels, "feel", $feel)
                    choice(L.t("checkin.pain"), CheckIn.pains, "pain", $pain)
                    choice(L.t("checkin.adherence"), CheckIn.adherences, "adherence", $adherence)

                    VStack(alignment: .leading, spacing: 8) {
                        Text(L.t("checkin.bodyweight"))
                            .font(Ty.copySmall)
                            .foregroundStyle(Tk.ink2)
                        TextField("—", text: $weight)
                            .keyboardType(.decimalPad)
                            .font(Ty.rowTitle)
                            .foregroundStyle(Tk.ink)
                            .tabular()
                            .padding(12)
                            .background(Tk.glass2, in: .rect(cornerRadius: Tk.R.r1))
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text(L.t("checkin.note"))
                            .font(Ty.copySmall)
                            .foregroundStyle(Tk.ink2)
                        TextEditor(text: $note)
                            .font(Ty.copy)
                            .foregroundStyle(Tk.ink)
                            .scrollContentBackground(.hidden)
                            .frame(minHeight: 96)
                            .padding(10)
                            .background(Tk.glass2, in: .rect(cornerRadius: Tk.R.r1))
                    }

                    CTA(title: L.t("checkin.save"), enabled: !saving) {
                        Task { await submit() }
                    }
                    SecondaryButton(title: L.t("common.cancel")) { dismiss() }
                }
                .padding(22)
            }
        }
        .onAppear(perform: prefill)
    }

    private func choice(
        _ label: String,
        _ options: [String],
        _ namespace: String,
        _ binding: Binding<String?>
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(Ty.copySmall)
                .foregroundStyle(Tk.ink2)

            HStack(spacing: 6) {
                ForEach(options, id: \.self) { option in
                    Button {
                        binding.wrappedValue = binding.wrappedValue == option ? nil : option
                    } label: {
                        // The enum value is the key: the database stores English
                        // and the dictionary turns it into her language.
                        Text(L.t("\(namespace).\(option)"))
                            .font(Ty.action)
                            .foregroundStyle(binding.wrappedValue == option ? Tk.ink : Tk.ink2)
                            .frame(maxWidth: .infinity, minHeight: 48)
                            .multilineTextAlignment(.center)
                            .background(
                                Sel.style(binding.wrappedValue == option),
                                in: .rect(cornerRadius: Tk.R.r1)
                            )
                    }
                }
            }
        }
    }

    private func prefill() {
        guard let existing, existing.author == "client" else { return }
        feel = existing.feel
        pain = existing.pain
        adherence = existing.adherence
        weight = existing.bodyweightKg.map { $0.clean } ?? ""
        note = existing.note ?? ""
    }

    private func submit() async {
        saving = true
        try? await CheckInFeed.submit(
            CheckIn(
                weekStartDate: CheckInFeed.weekStartIso,
                feel: feel,
                pain: pain,
                adherence: adherence,
                bodyweightKg: Double(weight.replacingOccurrences(of: ",", with: ".")),
                note: note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : note,
                author: "client",
                reviewedAt: nil
            )
        )
        saving = false
        onDone()
        dismiss()
    }
}
