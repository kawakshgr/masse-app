import SwiftUI

/// The client's app.
///
/// Coach keeps its place and is rendered inert, badged `soon`: a deferred
/// feature that disappears from the nav makes the product's shape a lie.
struct ClientTabs: View {
    let firstName: String?
    /// Cycle only exists for a client who asked for it during onboarding. A tab
    /// about her period for someone who never asked is worse than a missing
    /// feature, and the prototype filters it the same way.
    let cycleTracking: Bool

    @State private var tab: Tab = .today

    enum Tab: Hashable { case today, train, fuel, cycle, coach }

    var body: some View {
        TabView(selection: $tab) {
            TodayView(firstName: firstName, onStart: { tab = .train })
                .tabItem { Label(L.t("clientNav.today"), systemImage: "house") }
                .tag(Tab.today)

            TrainView()
                .tabItem { Label(L.t("clientNav.train"), systemImage: "figure.strengthtraining.traditional") }
                .tag(Tab.train)

            NutritionView()
                .tabItem { Label(L.t("clientNav.fuel"), systemImage: "circle.hexagongrid") }
                .tag(Tab.fuel)

            if cycleTracking {
                CycleView()
                    .tabItem { Label(L.t("clientNav.cycle"), systemImage: "hexagon") }
                    .tag(Tab.cycle)
            }

            SoonView(title: L.t("clientNav.coach"), note: L.t("soonCopy.inbox"))
                .tabItem { Label(L.t("clientNav.coach"), systemImage: "bubble.left") }
                .tag(Tab.coach)
        }
        .tint(Tk.a1)
    }
}

/// A tab that is present and honest about not being built. One line of copy,
/// and nothing that looks tappable.
struct SoonView: View {
    let title: String
    let note: String

    var body: some View {
        ZStack {
            Tk.bg.ignoresSafeArea()
            Atmosphere().ignoresSafeArea()

            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 8) {
                    Text(title)
                        .font(Ty.screenTitle)
                        .tracking(Ty.displayTracking(30))
                        .foregroundStyle(Tk.ink3)
                    Text(L.t("shell.soon").uppercased())
                        .font(Ty.emphasis)
                        .tracking(Ty.kickerTracking)
                        .foregroundStyle(Tk.ink3)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Tk.glass2, in: .rect(cornerRadius: Tk.R.pill))
                }

                Text(note)
                    .font(Ty.copy)
                    .foregroundStyle(Tk.ink2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(22)
        }
    }
}
