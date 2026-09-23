import SwiftUI

/// Which of the two states the app is in: nobody yet, or a client with a week
/// waiting. There is nothing in between — an account without a claimed invite
/// cannot exist, because claiming is what creates the row.
struct RootView: View {
    var body: some View {
        OnboardingView()
    }
}

#Preview { RootView() }
