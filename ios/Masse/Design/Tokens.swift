import SwiftUI

/// The design tokens, lifted from the handoff. Nothing in the app may invent a
/// colour or a radius: if a value is not here, it does not exist.
///
/// Light and dark are resolved by the system, not by a flag we carry around —
/// every colour below is dynamic, so a view never asks which theme it is in.
enum Tk {

    // MARK: - Colour

    /// App background. Dark is a neutral #161616; the surfaces around it —
    /// ink, glass, edges, the atmosphere — lean violet, as on the web.
    static let bg = dynamic(dark: 0x161616, light: 0xE7F2F3)
    /// The surface a sheet sits on, and the knob of a toggle.
    static let deep = dynamic(dark: 0x161616, light: 0xFFFFFF)

    /// Primary text.
    static let ink = dynamic(dark: 0xF4F2FB, light: 0x05202A)
    /// Secondary text. Most labels are this, not `ink3`.
    static let ink2 = dynamic(dark: 0xF4F2FB, light: 0x05202A, darkAlpha: 0.74, lightAlpha: 0.76)
    /// Tertiary: hints, placeholders, states that are inert.
    static let ink3 = dynamic(dark: 0xF4F2FB, light: 0x05202A, darkAlpha: 0.48, lightAlpha: 0.52)

    /// Primary accent, teal.
    static let a1 = dynamic(dark: 0x5FE3D2, light: 0x0A8579)
    /// Secondary accent, violet.
    static let a2 = dynamic(dark: 0x9C86FF, light: 0x5636CF)
    /// Attention, coral. Never decorative.
    static let a3 = dynamic(dark: 0xFF8069, light: 0xC9452F)
    /// Text on an accent fill.
    static let onA = dynamic(dark: 0x022B2A, light: 0xFFFFFF)

    /// The deep pair behind the blurred atmosphere. Not for ink or fills.
    static let b1 = dynamic(dark: 0x2B2F7A, light: 0x9FE6DD)
    static let b2 = dynamic(dark: 0x52309E, light: 0xC9BCFF)

    // MARK: - Glass
    //
    // Liquid Glass is alpha driven: the same tokens at the `regular` level the
    // web uses, so the two clients read as one product.

    /// A panel.
    static let glass = dynamic(dark: 0xF6F3FF, light: 0xFFFFFF, darkAlpha: 0.09, lightAlpha: 0.62)
    /// Anything nested inside a panel: a field, a chip, a rail.
    static let glass2 = dynamic(dark: 0xF6F3FF, light: 0xFFFFFF, darkAlpha: 0.17, lightAlpha: 0.82)
    /// A hairline that separates two surfaces.
    static let edge = dynamic(dark: 0xECE7FF, light: 0x05202A, darkAlpha: 0.17, lightAlpha: 0.13)
    /// Fainter still: a divider inside one surface.
    static let hair = dynamic(dark: 0xECE7FF, light: 0x05202A, darkAlpha: 0.10, lightAlpha: 0.09)

    /// The accent veil a metric card carries.
    static func wash(_ accent: Color) -> Color { accent.opacity(0.20) }

    // MARK: - Radius
    //
    // The iOS scale is its own: 12 / 16 / 20 / 26, and 38 for a sheet. It is
    // not the web's 6 / 10 / 14 / 18. Nothing in between, on either.

    enum R {
        static let r1: CGFloat = 12
        static let r2: CGFloat = 16
        static let r3: CGFloat = 20
        static let r4: CGFloat = 26
        static let sheet: CGFloat = 38
        /// A pill: a segmented rail, a chip, a full-width call to action.
        static let pill: CGFloat = 999
    }

    // MARK: - Touch

    /// Apple's floor, and the size of anything a thumb finds mid-set.
    static let tap: CGFloat = 44

    // MARK: - Helpers

    private static func dynamic(
        dark: UInt32,
        light: UInt32,
        darkAlpha: Double = 1,
        lightAlpha: Double = 1
    ) -> Color {
        Color(UIColor { traits in
            traits.userInterfaceStyle == .light
                ? UIColor(hex: light, alpha: lightAlpha)
                : UIColor(hex: dark, alpha: darkAlpha)
        })
    }
}

private extension UIColor {
    convenience init(hex: UInt32, alpha: Double) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: CGFloat(alpha)
        )
    }
}
