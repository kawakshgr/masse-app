import SwiftUI

/// Where the app starts. It has one job today: prove the shell, the tokens and
/// the type scale are real. The invite-code onboarding replaces it next.
struct RootView: View {
    var body: some View {
        ZStack {
            Tk.bg.ignoresSafeArea()
            Atmosphere().ignoresSafeArea()

            VStack(alignment: .leading, spacing: 14) {
                Text("masse").kicker()

                Text("Aujourd’hui")
                    .font(Ty.screenTitle)
                    .tracking(Ty.displayTracking(30))
                    .foregroundStyle(Tk.ink)

                Text("La coquille, les couleurs et la typo. Le reste arrive.")
                    .font(Ty.copy)
                    .foregroundStyle(Tk.ink2)

                Spacer()
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(22)
        }
    }
}

#Preview { RootView() }
