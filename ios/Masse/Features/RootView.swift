import SwiftUI

/// Which of the app's states is on screen. `loading` is its own case on
/// purpose: treating "not yet known" as "signed out" would flash onboarding at
/// someone who is already a client.
struct RootView: View {
    @Environment(Session.self) private var session

    var body: some View {
        switch session.state {
        case .loading:
            Splash()
        case .signedOut:
            OnboardingView()
        case .claiming:
            Splash(note: L.t("onboarding.finalising"))
        case .signedIn(let name):
            TodayView(firstName: name)
        case .claimFailed:
            ClaimFailedView()
        }
    }
}

/// The background, and nothing else. Whatever comes next is being decided.
struct Splash: View {
    var note: String?

    var body: some View {
        ZStack {
            Tk.bg.ignoresSafeArea()
            Atmosphere().ignoresSafeArea()
            if let note {
                VStack(spacing: 14) {
                    ProgressView().tint(Tk.a1)
                    Text(note)
                        .font(Ty.copy)
                        .foregroundStyle(Tk.ink2)
                }
            }
        }
    }
}

/// Signed in, but the invite could not be spent. Says why, and offers the only
/// two moves that help.
struct ClaimFailedView: View {
    @Environment(Session.self) private var session

    var body: some View {
        ZStack {
            Tk.bg.ignoresSafeArea()
            Atmosphere().ignoresSafeArea()

            VStack(alignment: .leading, spacing: 16) {
                Text(L.t("onboarding.failed"))
                    .font(Ty.cardTitle)
                    .tracking(Ty.displayTracking(19))
                    .foregroundStyle(Tk.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Text(L.t("onboarding.failedBody"))
                    .font(Ty.copy)
                    .foregroundStyle(Tk.ink2)
                    .fixedSize(horizontal: false, vertical: true)
                CTA(title: L.t("onboarding.restart")) {
                    Task { await session.signOut() }
                }
            }
            .padding(22)
        }
    }
}
