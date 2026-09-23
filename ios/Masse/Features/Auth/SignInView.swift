import SwiftUI

/// The other door. An invite code is spent once, so it cannot be how a client
/// gets back in after a new phone, a reinstall, or having onboarded on the web.
struct SignInView: View {
    /// Back to the code, for someone who tapped this by mistake.
    let onUseCode: () -> Void

    @Environment(Session.self) private var session

    @State private var email = ""
    @State private var sent = false
    @State private var busy = false
    @State private var error: String?

    var body: some View {
        ZStack {
            Tk.bg.ignoresSafeArea()
            Atmosphere().ignoresSafeArea()

            VStack(spacing: 0) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 22) {
                        VStack(alignment: .leading, spacing: 10) {
                            Text(L.t("auth.title")).kicker()
                            Text(L.t("auth.signInTitle"))
                                .font(Ty.screenTitle)
                                .tracking(Ty.displayTracking(30))
                                .foregroundStyle(Tk.ink)
                                .fixedSize(horizontal: false, vertical: true)
                            Text(L.t("auth.signInLede"))
                                .font(Ty.copy)
                                .foregroundStyle(Tk.ink2)
                                .fixedSize(horizontal: false, vertical: true)
                        }

                        Field(
                            label: L.t("auth.email"),
                            placeholder: L.t("auth.emailPlaceholder"),
                            keyboard: .emailAddress,
                            capitalisation: .never,
                            text: $email
                        )

                        if sent {
                            VStack(alignment: .leading, spacing: 6) {
                                Text(L.t("auth.sent"))
                                    .font(Ty.copySmall)
                                    .foregroundStyle(Tk.a1)
                                // PKCE keeps its verifier on the device that
                                // asked. A link opened elsewhere cannot finish.
                                Text(L.t("auth.openOnThisDevice"))
                                    .font(Ty.copySmall)
                                    .foregroundStyle(Tk.ink3)
                            }
                            .fixedSize(horizontal: false, vertical: true)
                        }

                        if let error = session.linkError ?? error {
                            Text(error)
                                .font(Ty.copySmall)
                                .foregroundStyle(Tk.a3)
                                .fixedSize(horizontal: false, vertical: true)
                        }

                        Button(action: onUseCode) {
                            Text(L.t("auth.backToCode"))
                                .font(Ty.copySmall)
                                .foregroundStyle(Tk.ink2)
                                .underline()
                        }
                        .frame(minHeight: Tk.tap, alignment: .leading)
                    }
                    .padding(.horizontal, 22)
                    .padding(.top, 12)
                    .padding(.bottom, 28)
                }
                .scrollDismissesKeyboard(.interactively)

                CTA(
                    title: L.t(busy ? "auth.sending" : "auth.send"),
                    enabled: !email.trimmingCharacters(in: .whitespaces).isEmpty && !busy
                ) {
                    Task { await send() }
                }
                .padding(.horizontal, 22)
                .padding(.top, 12)
                .padding(.bottom, 8)
                .background(.ultraThinMaterial)
                .overlay(alignment: .top) { Tk.hair.frame(height: 1) }
            }
        }
    }

    private func send() async {
        busy = true
        error = nil
        defer { busy = false }
        do {
            try await InviteFlow.sendMagicLink(to: email)
            sent = true
        } catch {
            self.error = L.t("auth.error")
        }
    }
}

#Preview { SignInView(onUseCode: {}) }
