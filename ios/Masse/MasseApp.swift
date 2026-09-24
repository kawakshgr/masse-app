import SwiftUI

@main
struct MasseApp: App {
    @State private var session = Session()
    /// Her choice from Settings. Nil follows the phone, which is the default.
    @AppStorage(Appearance.key) private var appearance = Appearance.auto.rawValue

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
                .preferredColorScheme(Appearance(rawValue: appearance)?.scheme)
                .task { session.start() }
                // The magic link comes back here through masse://auth-callback.
                .onOpenURL { url in
                    Task { await session.handle(url: url) }
                }
        }
    }
}
