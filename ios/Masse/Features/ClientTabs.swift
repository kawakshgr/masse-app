import SwiftUI

/// The client's app.
///
/// No messaging tab: a client and her coach talk on WhatsApp (decided
/// 26 Sep 2026).
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

    enum Page: Hashable { case today, train, fuel, cycle }

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
