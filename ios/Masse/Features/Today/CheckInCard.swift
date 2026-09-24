import SwiftUI

/// Her weekly check-in, filed by her.
///
/// It shows the week her coach's due day asks for — last week's while its
/// window is open, else this one — and says when it is due. Not open yet, it
/// shows the day and no form; filed, it says so; past the due day, it says
/// until when she can still catch up.
struct CheckInCard: View {
    @State private var state: OpenCheckIn?
    @State private var loaded = false
    @State private var open = false

    private var existing: CheckIn? { state?.existing }

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 10) {
                Text(L.t(state?.late == true ? "bilan.lastWeekTitle" : "bilan.title")).kicker()

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
                } else if let state {
                    Text(prompt(state))
                        .font(Ty.copy)
                        .foregroundStyle(Tk.ink2)
                        .fixedSize(horizontal: false, vertical: true)
                    if state.nudged {
                        Text(L.t("bilan.nudged"))
                            .font(Ty.emphasis)
                            .foregroundStyle(Tk.a2)
                    }
                    if !state.upcoming {
                        CTA(title: L.t("bilan.open")) { open = true }
                    }
                }
            }
        }
        .task { await load() }
        .sheet(isPresented: $open) {
            if let state {
                CheckInSheet(existing: existing, weekStart: state.weekStart) {
                    open = false
                    Task { await load() }
                }
            }
        }
    }

    /// The due day always shows, so she knows when her coach expects it.
    private func prompt(_ state: OpenCheckIn) -> String {
        if state.upcoming {
            return L.t("bilan.upcoming", Self.weekdayDay(state.due))
        }
        if state.late {
            return L.t("bilan.latePrompt", Self.dayMonth(state.weekStart), Self.weekdayDay(state.lastChance))
        }
        return L.t("bilan.prompt") + " " + L.t("bilan.due", Self.weekdayDay(state.due))
    }

    private static var locale: Locale {
        Locale(identifier: Bundle.main.preferredLocalizations.first == "en" ? "en_GB" : "fr_FR")
    }

    private static func date(_ iso: String) -> Date? {
        try? Date(iso, strategy: .iso8601.year().month().day())
    }

    /// "dimanche 28 septembre"
    static func weekdayDay(_ iso: String) -> String {
        date(iso)?.formatted(.dateTime.weekday(.wide).day().month(.wide).locale(locale)) ?? iso
    }

    /// "15 septembre"
    static func dayMonth(_ iso: String) -> String {
        date(iso)?.formatted(.dateTime.day().month(.wide).locale(locale)) ?? iso
    }

    private func load() async {
        state = try? await CheckInFeed.open()
        loaded = true
    }
}

/// The form. Three questions with three answers each, a weight, and a line for
/// what the boxes do not say.
private struct CheckInSheet: View {
    let existing: CheckIn?
    /// The week being filed — last week's while it is being caught up.
    let weekStart: String
    let onDone: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var feel: String?
    @State private var pain: String?
    @State private var adherence: String?
    @State private var weight = ""
    @State private var waist = ""
    @State private var chest = ""
    @State private var hips = ""
    @State private var thigh = ""
    @State private var note = ""
    @State private var saving = false
    @State private var checkInId: String?

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

                    measure(L.t("checkin.bodyweight"), $weight, unit: "kg")

                    // Measurements ride on the check-in, so a delta is one row
                    // apart — which is the whole reason they live here and not
                    // on a screen of their own.
                    HStack(spacing: 8) {
                        measure(L.t("bilan.waist"), $waist, unit: "cm")
                        measure(L.t("bilan.chest"), $chest, unit: "cm")
                    }
                    HStack(spacing: 8) {
                        measure(L.t("bilan.hips"), $hips, unit: "cm")
                        measure(L.t("bilan.thigh"), $thigh, unit: "cm")
                    }

                    if let checkInId {
                        PoseGrid(checkInId: checkInId)
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
        .task {
            // A photo hangs off a check-in row, and she should not have to
            // answer three questions before she is allowed to take one.
            checkInId = await PhotoFeed.checkInId(weekStart: weekStart)
        }
    }

    private func measure(
        _ label: String,
        _ binding: Binding<String>,
        unit: String
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(Ty.copySmall)
                .foregroundStyle(Tk.ink2)
            HStack(spacing: 6) {
                TextField("—", text: binding)
                    .keyboardType(.decimalPad)
                    .font(Ty.rowTitle)
                    .foregroundStyle(Tk.ink)
                    .tabular()
                Text(unit)
                    .font(Ty.copySmall)
                    .foregroundStyle(Tk.ink3)
            }
            .padding(12)
            .background(Tk.glass2, in: .rect(cornerRadius: Tk.R.r1))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    /// A blank field is nothing measured, not zero centimetres.
    private func cm(_ text: String) -> Double? {
        Double(text.replacingOccurrences(of: ",", with: "."))
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
        waist = existing.waistCm.map { $0.clean } ?? ""
        chest = existing.chestCm.map { $0.clean } ?? ""
        hips = existing.hipsCm.map { $0.clean } ?? ""
        thigh = existing.thighCm.map { $0.clean } ?? ""
        note = existing.note ?? ""
    }

    private func submit() async {
        saving = true
        try? await CheckInFeed.submit(
            CheckIn(
                weekStartDate: weekStart,
                feel: feel,
                pain: pain,
                adherence: adherence,
                bodyweightKg: cm(weight),
                waistCm: cm(waist),
                chestCm: cm(chest),
                hipsCm: cm(hips),
                thighCm: cm(thigh),
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
