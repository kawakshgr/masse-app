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

    static func step(_ n: Int) -> String {
        t("onboarding.step", String(n))
    }

    /// An ICU plural, carried into the catalog as one key per case by
    /// sync-strings.mjs. The choosing happens here because that is the part a
    /// string file cannot do — the words themselves are still the web's.
    private static func plural(_ key: String, _ n: Int) -> String {
        n == 1 ? t("\(key).one", String(n)) : t("\(key).other", String(n))
    }

    /// "1 série" / "3 séries".
    static func sets(_ n: Int) -> String { plural("today.sets", n) }

    /// "1 série en attente" / "3 séries en attente".
    static func heldCount(_ n: Int) -> String { plural("log.heldCount", n) }

    /// A dose's unit. Some pluralise — a capsule, two capsules — and most do
    /// not: grams are grams. A missing key comes back as the key itself, which
    /// is how the plain ones are told apart from the plural ones.
    static func unit(_ unit: String, _ count: Int) -> String {
        let key = "supp.unit.\(unit)"
        let pluralised = plural(key, count)
        return pluralised.hasPrefix(key) ? t(key) : pluralised
    }
}
