import Foundation

/// Every visible string, by key, from the catalog the web's dictionaries
/// generate (see ios/tools/sync-strings.mjs). The two clients must not drift
/// into saying different things about the same screen.
enum L {
    static func t(_ key: String) -> String {
        String(localized: String.LocalizationValue(key))
    }

    static func t(_ key: String, _ args: CVarArg...) -> String {
        String(format: String(localized: String.LocalizationValue(key)), arguments: args)
    }

    /// The one ICU plural the catalog could not carry, in Swift where it can
    /// use the real rules.
    static func step(_ n: Int) -> String {
        t("onboarding.step", String(n))
    }
}
