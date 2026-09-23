import SwiftUI

@main
struct MasseApp: App {
    @State private var session = Session()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
                .task { session.start() }
                // The magic link comes back here through masse://auth-callback.
                .onOpenURL { url in
                    Task { await session.handle(url: url) }
                }
        }
    }
}
