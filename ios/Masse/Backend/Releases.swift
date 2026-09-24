import Foundation

/// What changed, version by version.
///
/// Read from releases.json in the bundle, which sync-strings.mjs copies from
/// the web's src/lib/releases.json — so both clients print the same notes, and
/// they are written once.
struct Release: Decodable, Identifiable, Sendable {
    let version: String
    let date: String
    let fr: [String]
    let en: [String]

    var id: String { version }

    /// The notes in the language the app is actually showing, which is not
    /// always the phone's: iOS lets a person pick a language per app.
    var notes: [String] {
        Bundle.main.preferredLocalizations.first == "en" ? en : fr
    }

    /// "24 sept. 2026", in the app's language.
    var displayDate: String {
        guard let parsed = try? Date(date, strategy: .iso8601.year().month().day()) else {
            return date
        }
        let locale = Locale(identifier: Bundle.main.preferredLocalizations.first ?? "fr")
        return parsed.formatted(.dateTime.day().month(.abbreviated).year().locale(locale))
    }

    static let all: [Release] = {
        guard
            let url = Bundle.main.url(forResource: "releases", withExtension: "json"),
            let data = try? Data(contentsOf: url)
        else { return [] }
        return (try? JSONDecoder().decode([Release].self, from: data)) ?? []
    }()
}

enum AppVersion {
    static var version: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "—"
    }

    static var build: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "—"
    }
}
