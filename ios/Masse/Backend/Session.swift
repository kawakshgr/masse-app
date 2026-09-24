import Foundation
import Observation
import OSLog
import Supabase

private let log = Logger(subsystem: "fr.masse.client", category: "auth")

/// Who is signed in, and what the app should show because of it.
///
/// Three states, not two: there is a moment after the magic link comes back
/// where a session exists but the invite has not been spent yet. Showing Today
/// then would show an account with no client row behind it.
@MainActor
@Observable
final class Session {
    enum State: Equatable {
        /// Still asking the keychain. Not "signed out" — saying that for a
        /// frame would flash onboarding at someone who is already a client.
        case loading
        case signedOut
        /// Signed in, and the answers still have to be spent on the invite.
        case claiming
        case signedIn(profile: ClientProfile)
        case claimFailed
        /// Signed in, but no coach has added this address yet.
        case noClientRecord
    }

    private(set) var state: State = .loading

    /// Why the last link failed, if it did. A sign-in that quietly returns to
    /// the form tells the person nothing, and they will just try the same link
    /// again.
    private(set) var linkError: String?

    private var watcher: Task<Void, Never>?

    func start() {
        guard watcher == nil else { return }
        watcher = Task { [weak self] in
            for await (event, session) in Backend.auth.authStateChanges {
                guard let self else { return }
                switch event {
                case .initialSession, .signedIn, .tokenRefreshed:
                    if session != nil {
                        await self.settle()
                    } else {
                        self.state = .signedOut
                    }
                case .signedOut:
                    self.state = .signedOut
                default:
                    break
                }
            }
        }
    }

    /// The link came back. Completing it is what creates the session; the
    /// answers are spent immediately afterwards, by `settle`.
    func handle(url: URL) async {
        linkError = nil
        do {
            _ = try await Backend.auth.session(from: url)
        } catch {
            // Almost always one of three: the link was already used, it has
            // expired, or it was opened on a device that did not ask for it.
            // Whichever it was, say so — the alternative is someone tapping the
            // same dead link a second time.
            log.error("magic link failed: \(error.localizedDescription, privacy: .public)")
            linkError = L.t("auth.callbackError")
            state = .signedOut
        }
    }

    /// The code from the email. A session made this way is announced by
    /// authStateChanges like any other, so `settle` runs — and spends the
    /// invite answers waiting on this phone — exactly as it does for a link.
    func verify(email: String, code: String) async -> Bool {
        do {
            _ = try await Backend.auth.verifyOTP(
                email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                token: code,
                type: .email
            )
            linkError = nil
            return true
        } catch {
            log.error("code sign-in failed: \(error.localizedDescription, privacy: .public)")
            return false
        }
    }

    /// Is there a client row yet? If not, and answers are on this device, spend
    /// them. A session without a client row is an account that cannot do
    /// anything, so it is not a state the app rests in.
    private func settle() async {
        do {
            if let profile = try await currentClient() {
                AnswerStore.clear()
                state = .signedIn(profile: profile)
                return
            }

            guard let answers = AnswerStore.load(), !answers.code.isEmpty else {
                // Signed in, no client row, nothing to claim with. Usually
                // someone signing back in on an address their coach has not
                // added — which is not a failed claim and must not say so.
                state = .noClientRecord
                return
            }

            state = .claiming
            try await InviteFlow.claim(answers)
            AnswerStore.clear()
            guard let profile = try await currentClient() else {
                state = .noClientRecord
                return
            }
            state = .signedIn(profile: profile)
        } catch {
            state = .claimFailed
        }
    }

    private struct ClientRow: Decodable {
        let first_name: String?
        let name: String
        let cycle_tracking: Bool?
    }

    /// Who this client is, as far as the shell needs to know: what to call her,
    /// and whether she asked for cycle tracking — which decides a whole tab.
    private func currentClient() async throws -> ClientProfile? {
        guard let userId = Backend.auth.currentUser?.id else { return nil }
        let rows: [ClientRow] = try await Backend.client
            .from("clients")
            .select("first_name, name, cycle_tracking")
            .eq("id", value: userId)
            .limit(1)
            .execute()
            .value
        guard let row = rows.first else { return nil }
        return ClientProfile(
            firstName: row.first_name ?? row.name,
            cycleTracking: row.cycle_tracking ?? false
        )
    }

    /// After she edits her details: the greeting on Today reads the name from
    /// here, so it has to be asked again rather than left stale.
    func refreshProfile() async {
        if let profile = try? await currentClient() {
            state = .signedIn(profile: profile)
        }
    }

    func signOut() async {
        try? await Backend.auth.signOut()
        AnswerStore.clear()
        state = .signedOut
    }
}


/// The little the shell needs about the person signed in.
struct ClientProfile: Equatable, Sendable {
    let firstName: String?
    let cycleTracking: Bool
}
