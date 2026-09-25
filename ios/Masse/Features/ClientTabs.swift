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

    @State private var page: Page = .today
    /// Owned here, not by Train, so the rest can ride above the tab bar and
    /// follow her to any tab.
    @State private var rest = RestTimer()

    enum Page: Hashable { case today, train, fuel, cycle, coach }

    var body: some View {
        TabView(selection: $page) {
            Tab(L.t("clientNav.today"), systemImage: "house", value: Page.today) {
                TodayView(firstName: firstName, onStart: { page = .train })
            }

            Tab(L.t("clientNav.train"), systemImage: "figure.strengthtraining.traditional", value: Page.train) {
                TrainView(rest: rest)
            }

            Tab(L.t("clientNav.fuel"), systemImage: "fork.knife", value: Page.fuel) {
                NutritionView()
            }

            if cycleTracking {
                Tab(L.t("clientNav.cycle"), systemImage: "circle.lefthalf.filled", value: Page.cycle) {
                    CycleView()
                }
            }

            Tab(L.t("clientNav.coach"), systemImage: "bubble.left", value: Page.coach) {
                SoonView(title: L.t("clientNav.coach"), note: L.t("soonCopy.inbox"))
            }
        }
        .tint(Tk.a1)
        .modifier(CurrentTabBar(rest: rest, openTrain: { page = .train }))
    }
}

/// What the tab bar of the iOS she runs can do. From 26 it shrinks while she
/// scrolls; from 26.1 the rest rides above it, on every tab. The branch is
/// fixed for a given device, so the TabView's identity never changes.
private struct CurrentTabBar: ViewModifier {
    let rest: RestTimer
    let openTrain: () -> Void

    func body(content: Content) -> some View {
        if #available(iOS 26.1, *) {
            content
                .tabBarMinimizeBehavior(.onScrollDown)
                .tabViewBottomAccessory(isEnabled: rest.endsAt != nil) {
                    RestAccessory(rest: rest, open: openTrain)
                }
        } else if #available(iOS 26.0, *) {
            content.tabBarMinimizeBehavior(.onScrollDown)
        } else {
            content
        }
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
                        .textCase(.uppercase)
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
