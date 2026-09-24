import SwiftUI
import UserNotifications

/// The app's own settings, behind the gear on Today.
///
/// Only what the app actually does is here. There is no toggle for a thing
/// that does not exist yet, and nothing that belongs to the coach.
struct SettingsView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @Environment(\.scenePhase) private var scenePhase

    @AppStorage(Appearance.key) private var appearance = Appearance.auto.rawValue
    @AppStorage(Reminders.Key.daily) private var daily = false
    @AppStorage(Reminders.Key.dailyMinutes) private var dailyMinutes = Reminders.defaultDailyMinutes
    @AppStorage(Reminders.Key.weekly) private var weekly = false

    @State private var denied = false
    /// The day her coach set the check-in due; the weekly reminder follows it.
    @State private var dueOffset = CheckInFeed.defaultDueOffset
    @State private var healthConnected = Health.connected
    @State private var confirmingClear = false
    @State private var cleared = false

    var body: some View {
        NavigationStack {
            ZStack {
                Tk.bg.ignoresSafeArea()
                Atmosphere().ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        account
                        billing
                        notifications
                        if Health.available { health }
                        appearanceCard
                        language
                        privacy
                        about
                    }
                    .padding(.horizontal, 22)
                    .padding(.top, 8)
                    .padding(.bottom, 32)
                }
            }
            .navigationTitle(L.t("settings.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(L.t("settings.done")) { dismiss() }
                        .font(Ty.action)
                        .tint(Tk.a1)
                }
            }
        }
        .task {
            await refreshPermission()
            dueOffset = await CheckInFeed.dueOffset()
        }
        // Back from the iPhone's Settings, the answer may have changed.
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await refreshPermission() } }
        }
    }

    // MARK: - Sections

    private var account: some View {
        section(L.t("settings.account")) {
            if let email = Backend.auth.currentUser?.email {
                VStack(alignment: .leading, spacing: 2) {
                    Text(L.t("settings.email"))
                        .font(Ty.copySmall)
                        .foregroundStyle(Tk.ink2)
                    Text(email)
                        .font(Ty.rowTitle)
                        .foregroundStyle(Tk.ink)
                        .textSelection(.enabled)
                }
            }

            navRow(L.t("settings.editProfile")) { ProfileView() }

            SecondaryButton(title: L.t("settings.signOut")) {
                Task {
                    dismiss()
                    await session.signOut()
                }
            }
        }
    }

    private var billing: some View {
        section(L.t("settings.billing")) {
            navRow(L.t("settings.billingOpen")) { BillingView() }
        }
    }

    private var notifications: some View {
        section(L.t("settings.notifications")) {
            toggleRow(
                L.t("settings.daily"),
                hint: L.t("settings.dailyHint"),
                isOn: Binding(get: { daily }, set: { on in Task { await setDaily(on) } })
            )

            if daily {
                DatePicker(
                    L.t("settings.time"),
                    selection: Binding(get: { dailyTime }, set: { setDailyTime($0) }),
                    displayedComponents: .hourAndMinute
                )
                .font(Ty.copy)
                .foregroundStyle(Tk.ink2)
                .tint(Tk.a1)
            }

            Divider().overlay(Tk.hair)

            toggleRow(
                L.t("settings.weekly"),
                hint: L.t("settings.weeklyHint", Reminders.weekdayName(dueOffset)),
                isOn: Binding(get: { weekly }, set: { on in Task { await setWeekly(on) } })
            )

            if denied {
                Text(L.t("settings.denied"))
                    .font(Ty.copySmall)
                    .foregroundStyle(Tk.a3)
                    .fixedSize(horizontal: false, vertical: true)
                SecondaryButton(title: L.t("settings.openSystem"), action: openSystemSettings)
            }
        }
    }

    private var health: some View {
        section(L.t("settings.health")) {
            HStack(spacing: 10) {
                Circle()
                    .fill(healthConnected ? Tk.a1 : Tk.ink3)
                    .frame(width: 8, height: 8)
                Text(L.t(healthConnected ? "settings.healthOn" : "settings.healthOff"))
                    .font(Ty.copy)
                    .foregroundStyle(Tk.ink)
            }

            if !healthConnected {
                SecondaryButton(title: L.t("settings.healthConnect")) {
                    Task { healthConnected = await Health.connect() }
                }
            }

            // Apple hides whether read access was granted, so the app cannot
            // show a switch that tells the truth. It says where the real one is.
            Text(L.t("settings.healthManage"))
                .font(Ty.copySmall)
                .foregroundStyle(Tk.ink3)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var appearanceCard: some View {
        section(L.t("settings.appearance")) {
            HStack(spacing: 6) {
                ForEach(Appearance.allCases) { option in
                    Button {
                        appearance = option.rawValue
                    } label: {
                        Text(L.t("theme.\(option.rawValue)"))
                            .font(Ty.action)
                            .foregroundStyle(appearance == option.rawValue ? Tk.ink : Tk.ink2)
                            .frame(maxWidth: .infinity, minHeight: 44)
                            .background(
                                Sel.style(appearance == option.rawValue),
                                in: .rect(cornerRadius: Tk.R.r1)
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var language: some View {
        section(L.t("settings.language")) {
            HStack {
                Text(currentLanguage)
                    .font(Ty.rowTitle)
                    .foregroundStyle(Tk.ink)
                Spacer()
            }
            // iOS owns a per-app language, in the app's page of Settings. A
            // second switch here would disagree with it.
            Text(L.t("settings.languageHint"))
                .font(Ty.copySmall)
                .foregroundStyle(Tk.ink3)
                .fixedSize(horizontal: false, vertical: true)
            SecondaryButton(title: L.t("settings.openSystem"), action: openSystemSettings)
        }
    }

    private var privacy: some View {
        section(L.t("settings.privacy")) {
            Text(L.t("settings.privacyCoach"))
                .font(Ty.copySmall)
                .foregroundStyle(Tk.ink2)
                .fixedSize(horizontal: false, vertical: true)
            Text(L.t("settings.privacyNotes"))
                .font(Ty.copySmall)
                .foregroundStyle(Tk.ink2)
                .fixedSize(horizontal: false, vertical: true)

            if cleared {
                Text(L.t("settings.cleared"))
                    .font(Ty.copySmall)
                    .foregroundStyle(Tk.a1)
            } else {
                SecondaryButton(title: L.t("settings.clearNotes")) { confirmingClear = true }
            }
        }
        .confirmationDialog(
            L.t("settings.clearConfirm"),
            isPresented: $confirmingClear,
            titleVisibility: .visible
        ) {
            Button(L.t("settings.clearDo"), role: .destructive) {
                SymptomNotes.clearAll()
                cleared = true
            }
            Button(L.t("common.cancel"), role: .cancel) {}
        }
    }

    private var about: some View {
        section(L.t("settings.about")) {
            navRow(L.t("settings.releases")) { ReleaseNotesView() }

            Text(L.t("settings.build", AppVersion.version, AppVersion.build))
                .font(Ty.copySmall)
                .foregroundStyle(Tk.ink3)
                .tabular()
        }
    }

    // MARK: - Pieces

    private func section<Content: View>(
        _ title: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 14) {
                Text(title).kicker()
                content()
            }
        }
    }

    /// A row that opens a screen of its own, chevron and all.
    private func navRow<Destination: View>(
        _ title: String,
        @ViewBuilder destination: () -> Destination
    ) -> some View {
        NavigationLink {
            destination()
        } label: {
            HStack {
                Text(title)
                    .font(Ty.rowTitle)
                    .foregroundStyle(Tk.ink)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Tk.ink3)
            }
            .frame(minHeight: Tk.tap)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
    }

    private func toggleRow(_ title: String, hint: String, isOn: Binding<Bool>) -> some View {
        Toggle(isOn: isOn) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(Ty.rowTitle)
                    .foregroundStyle(Tk.ink)
                Text(hint)
                    .font(Ty.copySmall)
                    .foregroundStyle(Tk.ink3)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .tint(Tk.a1)
    }

    private var currentLanguage: String {
        L.t(Bundle.main.preferredLocalizations.first == "en" ? "settings.en" : "settings.fr")
    }

    private var dailyTime: Date {
        Calendar.current.date(
            bySettingHour: dailyMinutes / 60, minute: dailyMinutes % 60, second: 0, of: Date()
        ) ?? Date()
    }

    // MARK: - Actions

    /// Turning a reminder on is the moment to ask — not at launch, when she has
    /// no idea yet what the app would want to tell her.
    private func permitted() async -> Bool {
        switch await Reminders.status() {
        case .authorized, .provisional, .ephemeral:
            denied = false
            return true
        case .notDetermined:
            let granted = await Reminders.request()
            denied = !granted
            return granted
        default:
            denied = true
            return false
        }
    }

    private func setDaily(_ on: Bool) async {
        guard on else {
            daily = false
            Reminders.cancel(Reminders.dailyId)
            return
        }
        guard await permitted() else { return }
        daily = true
        await Reminders.scheduleDaily(minutes: dailyMinutes)
    }

    private func setDailyTime(_ date: Date) {
        let parts = Calendar.current.dateComponents([.hour, .minute], from: date)
        dailyMinutes = (parts.hour ?? 21) * 60 + (parts.minute ?? 0)
        Task { await Reminders.scheduleDaily(minutes: dailyMinutes) }
    }

    private func setWeekly(_ on: Bool) async {
        guard on else {
            weekly = false
            Reminders.cancel(Reminders.weeklyId)
            return
        }
        guard await permitted() else { return }
        weekly = true
        await Reminders.scheduleWeekly(dueOffset: dueOffset)
    }

    /// A switch that says "on" while the system has silenced it would be a lie,
    /// so a revoked permission turns both off here too.
    private func refreshPermission() async {
        let status = await Reminders.status()
        denied = status == .denied
        if denied {
            daily = false
            weekly = false
        }
        healthConnected = Health.connected
    }

    private func openSystemSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            openURL(url)
        }
    }
}

/// Every version, newest first, in the app's language.
struct ReleaseNotesView: View {
    var body: some View {
        ZStack {
            Tk.bg.ignoresSafeArea()
            Atmosphere().ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    ForEach(Release.all) { release in
                        GlassCard {
                            VStack(alignment: .leading, spacing: 10) {
                                HStack(alignment: .firstTextBaseline) {
                                    Text(L.t("settings.version", release.version))
                                        .font(Ty.cardTitle)
                                        .tracking(Ty.displayTracking(19))
                                        .foregroundStyle(Tk.ink)
                                    Spacer()
                                    Text(release.displayDate)
                                        .font(Ty.copySmall)
                                        .foregroundStyle(Tk.ink3)
                                }
                                ForEach(release.notes, id: \.self) { note in
                                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                                        Text("·").foregroundStyle(Tk.a1)
                                        Text(note)
                                            .font(Ty.copy)
                                            .foregroundStyle(Tk.ink2)
                                            .fixedSize(horizontal: false, vertical: true)
                                    }
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, 22)
                .padding(.top, 8)
                .padding(.bottom, 32)
            }
        }
        .navigationTitle(L.t("settings.releases"))
        .navigationBarTitleDisplayMode(.inline)
    }
}

/// Light, dark, or whatever the phone is doing. The same three the web offers,
/// under the same words.
enum Appearance: String, CaseIterable, Identifiable {
    case auto, light, dark

    static let key = "masse.appearance"

    var id: String { rawValue }

    var scheme: ColorScheme? {
        switch self {
        case .auto: nil
        case .light: .light
        case .dark: .dark
        }
    }
}
