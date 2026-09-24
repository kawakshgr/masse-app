import Foundation
import Supabase

/// What she agreed to pay her coach, and what has been recorded as paid.
///
/// Read only. The app moves no money: the coach ticks a month when it arrives,
/// and this is that register seen from the other side. RLS shows her only her
/// own rows, and never a draft.
struct BillingArrangement: Decodable, Sendable {
    let amountCents: Int
    let type: String
    let dayOfMonth: Int?
    let packSessions: Int?

    enum CodingKeys: String, CodingKey {
        case type
        case amountCents = "amount_cents"
        case dayOfMonth = "day_of_month"
        case packSessions = "pack_sessions"
    }
}

struct ClientInvoice: Decodable, Sendable, Identifiable {
    let id: String
    let periodStart: String
    let amountCents: Int
    let status: String
    let paidAt: String?
    let invoiceNumber: String?
    let pdfPath: String?

    enum CodingKeys: String, CodingKey {
        case id, status
        case periodStart = "period_start"
        case amountCents = "amount_cents"
        case paidAt = "paid_at"
        case invoiceNumber = "invoice_number"
        case pdfPath = "pdf_path"
    }
}

enum BillingFeed {
    static func arrangement() async -> BillingArrangement? {
        let rows: [BillingArrangement]? = try? await Backend.client
            .from("billing_arrangements")
            .select("amount_cents, type, day_of_month, pack_sessions")
            .limit(1)
            .execute()
            .value
        return rows?.first
    }

    static func invoices() async throws -> [ClientInvoice] {
        try await Backend.client
            .from("invoices")
            .select("id, period_start, amount_cents, status, paid_at, invoice_number, pdf_path")
            .order("period_start", ascending: false)
            .limit(24)
            .execute()
            .value
    }

    /// Short-lived, like every other signed link in the app.
    static func pdfURL(_ path: String) async -> URL? {
        try? await Backend.client.storage.from("invoices").createSignedURL(path: path, expiresIn: 300)
    }
}

/// Money and dates in the app's language, the way the web prints them.
enum Money {
    private static var locale: Locale {
        Locale(identifier: Bundle.main.preferredLocalizations.first == "en" ? "en_GB" : "fr_FR")
    }

    static func euros(_ cents: Int) -> String {
        let value = Double(cents) / 100
        return value.formatted(
            .currency(code: "EUR")
                .precision(.fractionLength(cents % 100 == 0 ? 0 : 2))
                .locale(locale)
        )
    }

    /// "1er" in French, "1st" in English; plain numbers after that in French.
    static func dayOfMonth(_ day: Int) -> String {
        if Bundle.main.preferredLocalizations.first == "en" {
            let suffix: String
            switch (day % 10, day % 100) {
            case (1, let t) where t != 11: suffix = "st"
            case (2, let t) where t != 12: suffix = "nd"
            case (3, let t) where t != 13: suffix = "rd"
            default: suffix = "th"
            }
            return "\(day)\(suffix)"
        }
        return day == 1 ? "1er" : String(day)
    }

    /// "septembre 2026".
    static func month(_ period: String) -> String {
        guard let date = try? Date(period, strategy: .iso8601.year().month().day()) else {
            return period
        }
        return date.formatted(.dateTime.month(.wide).year().locale(locale))
    }

    /// "12 sept. 2026", from a timestamp.
    static func day(_ timestamp: String) -> String {
        let prefix = String(timestamp.prefix(10))
        guard let date = try? Date(prefix, strategy: .iso8601.year().month().day()) else {
            return prefix
        }
        return date.formatted(.dateTime.day().month(.abbreviated).year().locale(locale))
    }
}
