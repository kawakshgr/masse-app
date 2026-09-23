import Foundation
import Supabase

/// The one client. Everything the app reads or writes goes through it, and RLS
/// is what decides what comes back — there is no API layer in front of it, so a
/// check made here would be worth nothing anyway.
enum Backend {

    static let client: SupabaseClient = {
        guard
            let raw = Bundle.main.object(forInfoDictionaryKey: "SupabaseURL") as? String,
            let url = URL(string: raw),
            let key = Bundle.main.object(forInfoDictionaryKey: "SupabasePublishableKey") as? String,
            !key.isEmpty
        else {
            // A build without them cannot do anything at all, so it fails here
            // rather than at the first query with an opaque network error.
            fatalError("SupabaseURL / SupabasePublishableKey missing from Info.plist")
        }

        return SupabaseClient(
            supabaseURL: url,
            supabaseKey: key,
            options: .init(
                auth: .init(
                    // The magic link comes back through masse://auth-callback.
                    redirectToURL: URL(string: "masse://auth-callback"),
                    flowType: .pkce
                )
            )
        )
    }()

    static var auth: AuthClient { client.auth }
}
