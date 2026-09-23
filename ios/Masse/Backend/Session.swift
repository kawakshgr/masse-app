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
        case signedIn(clientName: String?)
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

    /// Is there a client row yet? If not, and answers are on this device, spend
    /// them. A session without a client row is an account that cannot do
    /// anything, so it is not a state the app rests in.
    private func settle() async {
        do {
            if let name = try await currentClientName() {
                AnswerStore.clear()
                state = .signedIn(clientName: name)
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
            state = .signedIn(clientName: try await currentClientName())
        } catch {
            state = .claimFailed
        }
    }

    private struct ClientName: Decodable { let first_name: String?; let name: String }

    private func currentClientName() async throws -> String? {
        guard let userId = Backend.auth.currentUser?.id else { return nil }
        let rows: [ClientName] = try await Backend.client
            .from("clients")
            .select("first_name, name")
            .eq("id", value: userId)
            .limit(1)
            .execute()
            .value
        guard let row = rows.first else { return nil }
        return row.first_name ?? row.name
    }

    func signOut() async {
        try? await Backend.auth.signOut()
        AnswerStore.clear()
        state = .signedOut
    }
}
