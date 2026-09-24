import SwiftUI

/// Her details, as she would correct them. Her coach reads the same fields on
/// her file, so the screen says so before she types.
struct ProfileView: View {
    @Environment(Session.self) private var session

    @State private var firstName = ""
    @State private var name = ""
    @State private var phone = ""
    @State private var birthDate: Date?
    @State private var height = ""
    @State private var occupation = ""
    @State private var emergency = ""

    @State private var loaded = false
    @State private var saving = false
    @State private var outcome: Outcome?

    enum Outcome { case saved, failed, nameMissing }

    var body: some View {
        ZStack {
            Tk.bg.ignoresSafeArea()
            Atmosphere().ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text(L.t("settings.profileLede"))
                        .font(Ty.copySmall)
                        .foregroundStyle(Tk.ink2)
                        .fixedSize(horizontal: false, vertical: true)

                    if !loaded {
                        ProgressView().tint(Tk.a1).frame(maxWidth: .infinity)
                    } else {
                        GlassCard {
                            VStack(alignment: .leading, spacing: 16) {
                                Field(label: L.t("settings.firstName"), text: $firstName)
                                Field(label: L.t("settings.fullName"), text: $name)
                                Field(
                                    label: L.t("settings.phone"),
                                    keyboard: .phonePad,
                                    capitalisation: .never,
                                    text: $phone
                                )
                                birthDateField
                                Field(
                                    label: L.t("settings.height"),
                                    keyboard: .decimalPad,
                                    capitalisation: .never,
                                    text: $height
                                )
                                Field(label: L.t("settings.occupation"), text: $occupation)
                                Field(
                                    label: L.t("settings.emergency"),
                                    placeholder: L.t("settings.emergencyHint"),
                                    text: $emergency
                                )
                            }
                        }

                        if let email = Backend.auth.currentUser?.email {
                            GlassCard {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(L.t("settings.email")).kicker()
                                    Text(email)
                                        .font(Ty.rowTitle)
                                        .foregroundStyle(Tk.ink)
                                    Text(L.t("settings.emailFixed"))
                                        .font(Ty.copySmall)
                                        .foregroundStyle(Tk.ink3)
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                            }
                        }

                        if let outcome {
                            Text(L.t(message(outcome)))
                                .font(Ty.copySmall)
                                .foregroundStyle(outcome == .saved ? Tk.a1 : Tk.a3)
                        }

                        CTA(title: L.t("settings.profileSave"), enabled: !saving) {
                            Task { await save() }
                        }
                    }
                }
                .padding(.horizontal, 22)
                .padding(.top, 8)
                .padding(.bottom, 32)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .navigationTitle(L.t("settings.profile"))
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    /// Optional, so it starts as a dash rather than as a date she never gave.
    private var birthDateField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(L.t("settings.birthDate")).kicker()
            HStack {
                if let date = birthDate {
                    DatePicker(
                        "",
                        selection: Binding(get: { date }, set: { birthDate = $0 }),
                        in: ...Date(),
                        displayedComponents: .date
                    )
                    .labelsHidden()
                    .tint(Tk.a1)
                    Spacer()
                    Button { birthDate = nil } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(Tk.ink3)
                            .frame(width: Tk.tap, height: Tk.tap)
                    }
                    .accessibilityLabel(L.t("entry.remove"))
                } else {
                    Button {
                        birthDate = Calendar.current.date(byAdding: .year, value: -30, to: Date())
                    } label: {
                        Text("—")
                            .font(Ty.copy)
                            .foregroundStyle(Tk.ink3)
                            .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
                            .padding(.horizontal, 14)
                            .background(Tk.glass2, in: .rect(cornerRadius: Tk.R.r2))
                            .overlay(
                                RoundedRectangle(cornerRadius: Tk.R.r2)
                                    .strokeBorder(Tk.edge, lineWidth: 1)
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func message(_ outcome: Outcome) -> String {
        switch outcome {
        case .saved: "settings.profileSaved"
        case .failed: "settings.profileError"
        case .nameMissing: "settings.nameRequired"
        }
    }

    private static let isoDay = Date.ISO8601FormatStyle().year().month().day().dateSeparator(.dash)

    private func load() async {
        guard !loaded else { return }
        if let details = try? await ProfileFeed.load() {
            firstName = details.firstName ?? ""
            name = details.name
            phone = details.phone ?? ""
            birthDate = details.birthDate.flatMap { try? Date($0, strategy: Self.isoDay) }
            height = details.heightCm.map { $0.clean } ?? ""
            occupation = details.occupation ?? ""
            emergency = details.emergencyContact ?? ""
        }
        loaded = true
    }

    private func save() async {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else {
            outcome = .nameMissing
            return
        }

        saving = true
        defer { saving = false }

        /// A blank field is nothing said, not an empty string on her file.
        func text(_ value: String) -> String? {
            let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmed.isEmpty ? nil : trimmed
        }

        do {
            try await ProfileFeed.save(ClientDetails(
                firstName: text(firstName),
                name: trimmedName,
                phone: text(phone),
                birthDate: birthDate.map { $0.formatted(Self.isoDay) },
                heightCm: Double(height.replacingOccurrences(of: ",", with: ".")),
                occupation: text(occupation),
                emergencyContact: text(emergency)
            ))
            outcome = .saved
            await session.refreshProfile()
        } catch {
            outcome = .failed
        }
    }
}
