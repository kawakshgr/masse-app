import SwiftUI

/// Every text style in the app, in one file, as the brief asks. No view sets a
/// size or a weight itself — it names a role here.
///
/// Two families and nothing else. Both are registered from the bundle when the
/// files are present; until they are, `resolve` falls back to the system face
/// at the same size and weight, so the app is legible and the swap is one
/// constant rather than a sweep through the views.
enum Ty {

    /// Display and large numerals. Bricolage at 800, always.
    static func display(_ size: CGFloat, relativeTo style: Font.TextStyle = .title) -> Font {
        resolve(.display, weight: 800, size: size, relativeTo: style)
    }

    /// Body, buttons, labels. Instrument Sans.
    static func body(
        _ size: CGFloat,
        weight: Int = 400,
        relativeTo style: Font.TextStyle = .body
    ) -> Font {
        resolve(.body, weight: weight, size: size, relativeTo: style)
    }

    // MARK: - Named roles
    //
    // Sizes are the prototype's iPhone values. Every one of them scales with
    // Dynamic Type, because the client's screens reflow — they do not shrink.

    /// A screen title.
    static var screenTitle: Font { display(30, relativeTo: .largeTitle) }
    /// A card's headline, or a session name.
    static var cardTitle: Font { display(19, relativeTo: .title3) }
    /// A figure that carries the card: a weight, an hour, a count.
    static var figure: Font { display(26, relativeTo: .title) }
    /// The rest timer and the one number a screen exists for.
    static var hero: Font { display(56, relativeTo: .largeTitle) }

    /// Running text.
    static var copy: Font { body(15, relativeTo: .body) }
    /// Secondary running text, under a title.
    static var copySmall: Font { body(13, relativeTo: .subheadline) }
    /// A button or a pill.
    static var action: Font { body(15, weight: 600, relativeTo: .headline) }
    /// A delta or a badge — the two things the brief puts at 700.
    static var emphasis: Font { body(13, weight: 700, relativeTo: .footnote) }
    /// A row's own name.
    static var rowTitle: Font { body(15, weight: 600, relativeTo: .body) }

    // MARK: - Tracking
    //
    // Display tightens as it grows; micro-caps open up. SwiftUI applies these
    // with `.tracking()`, which takes points, so they are computed from size.

    static func displayTracking(_ size: CGFloat) -> CGFloat {
        size >= 60 ? size * -0.05 : size >= 17 ? size * -0.03 : size * -0.02
    }

    /// The uppercase kicker above a card. 11pt, wide, and `ink2` — never `ink3`.
    static let kickerTracking: CGFloat = 11 * 0.14

    // MARK: - Resolution

    private enum Family {
        case display, body

        var postScriptNames: [Int: String] {
            switch self {
            case .display:
                return [800: "BricolageGrotesque-ExtraBold"]
            case .body:
                return [
                    400: "InstrumentSans-Regular",
                    500: "InstrumentSans-Medium",
                    600: "InstrumentSans-SemiBold",
                    700: "InstrumentSans-Bold",
                ]
            }
        }
    }

    /// True once the font files are in the bundle and listed under `UIAppFonts`.
    /// One lookup, cached: `UIFont(name:)` returning nil is how we know.
    private static let customFontsAvailable: Bool =
        UIFont(name: "InstrumentSans-Regular", size: 12) != nil

    private static func resolve(
        _ family: Family,
        weight: Int,
        size: CGFloat,
        relativeTo style: Font.TextStyle
    ) -> Font {
        if customFontsAvailable, let name = family.postScriptNames[weight] {
            return .custom(name, size: size, relativeTo: style)
        }
        // The fallback keeps the shape: same size, same weight, same scaling.
        return .system(size: size, weight: systemWeight(weight), design: .default)
    }

    private static func systemWeight(_ weight: Int) -> Font.Weight {
        switch weight {
        case ...400: return .regular
        case 401...500: return .medium
        case 501...600: return .semibold
        case 601...700: return .bold
        default: return .heavy
        }
    }
}

extension View {
    /// A kicker: 11pt, uppercase, widely tracked, `ink2`. The most repeated
    /// label in the product, so it is a modifier rather than four lines.
    func kicker() -> some View {
        self
            .font(Ty.body(11, weight: 400, relativeTo: .caption))
            .tracking(Ty.kickerTracking)
            .textCase(.uppercase)
            .foregroundStyle(Tk.ink2)
    }

    /// Every figure that changes, so it does not jitter as it counts.
    func tabular() -> some View {
        self.monospacedDigit()
    }
}
