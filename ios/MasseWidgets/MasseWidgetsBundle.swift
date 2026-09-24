import SwiftUI
import WidgetKit

/// The extension exists for one thing: the session on the Lock Screen.
@main
struct MasseWidgetsBundle: WidgetBundle {
    var body: some Widget {
        SessionLiveActivity()
    }
}
