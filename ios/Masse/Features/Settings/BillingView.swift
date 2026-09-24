import SwiftUI

/// Her side of the coach's billing register: the plan, then month by month.
struct BillingView: View {
    @Environment(\.openURL) private var openURL

    @State private var arrangement: BillingArrangement?
    @State private var invoices: [ClientInvoice] = []
    @State private var loaded = false
    @State private var failed = false
    @State private var opening: String?
    @State private var pdfFailed = false

    var body: some View {
        ZStack {
            Tk.bg.ignoresSafeArea()
            Atmosphere().ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text(L.t("settings.billingLede"))
                        .font(Ty.copySmall)
                        .foregroundStyle(Tk.ink2)
                        .fixedSize(horizontal: false, vertical: true)

                    if !loaded {
                        ProgressView().tint(Tk.a1).frame(maxWidth: .infinity)
                    } else {
                        GlassCard {
                            VStack(alignment: .leading, spacing: 8) {
                                Text(L.t("settings.plan")).kicker()
                                Text(BillingView.planLine(arrangement) ?? L.t("settings.noPlan"))
                                    .font(arrangement == nil ? Ty.copy : Ty.rowTitle)
                                    .foregroundStyle(arrangement == nil ? Tk.ink2 : Tk.ink)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }

                        GlassCard {
                            VStack(alignment: .leading, spacing: 10) {
                                Text(L.t("settings.payments")).kicker()

                                if failed {
                                    Text(L.t("offline.lede"))
                                        .font(Ty.copy)
                                        .foregroundStyle(Tk.ink2)
                                } else if invoices.isEmpty {
                                    Text(L.t("settings.noPayments"))
                                        .font(Ty.copy)
                                        .foregroundStyle(Tk.ink2)
                                } else {
                                    ForEach(invoices) { row($0) }
                                }

                                if pdfFailed {
                                    Text(L.t("settings.pdfFailed"))
                                        .font(Ty.copySmall)
                                        .foregroundStyle(Tk.a3)
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, 22)
                .padding(.top, 8)
                .padding(.bottom, 32)
            }
        }
        .navigationTitle(L.t("settings.billing"))
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    /// "120 € par mois, le 5" — or the pack, said as a pack.
    static func planLine(_ plan: BillingArrangement?) -> String? {
        guard let plan else { return nil }
        let amount = Money.euros(plan.amountCents)
        if plan.type == "pack" {
            return L.t("settings.planPack", amount, String(plan.packSessions ?? 0))
        }
        return L.t("settings.planMonthly", amount, Money.dayOfMonth(plan.dayOfMonth ?? 1))
    }

    private func row(_ invoice: ClientInvoice) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                Text(Money.month(invoice.periodStart).capitalized)
                    .font(Ty.rowTitle)
                    .foregroundStyle(Tk.ink)
                Spacer(minLength: 8)
                Text(Money.euros(invoice.amountCents))
                    .font(Ty.rowTitle)
                    .foregroundStyle(Tk.ink)
                    .tabular()
            }

            HStack(alignment: .firstTextBaseline) {
                Text(statusLine(invoice))
                    .font(Ty.copySmall)
                    .foregroundStyle(statusColour(invoice.status))
                Spacer(minLength: 8)
                if let path = invoice.pdfPath {
                    Button {
                        Task { await open(path, id: invoice.id) }
                    } label: {
                        if opening == invoice.id {
                            ProgressView().tint(Tk.a1)
                        } else {
                            Text(L.t("settings.invoicePdf"))
                                .font(Ty.copySmall)
                                .foregroundStyle(Tk.a1)
                                .underline()
                        }
                    }
                    .frame(minHeight: Tk.tap)
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .frame(minHeight: 72)
        .background(Tk.glass2, in: .rect(cornerRadius: Tk.R.r1))
    }

    private func statusLine(_ invoice: ClientInvoice) -> String {
        switch invoice.status {
        case "paid":
            return invoice.paidAt.map { L.t("settings.statusPaidOn", Money.day($0)) }
                ?? L.t("settings.statusPaid")
        case "late": return L.t("settings.statusLate")
        case "void": return L.t("settings.statusVoid")
        default: return L.t("settings.statusSent")
        }
    }

    /// Paid is the accent; late is coral, because it is the one thing here that
    /// asks something of her. Waiting is neither.
    private func statusColour(_ status: String) -> Color {
        switch status {
        case "paid": Tk.a1
        case "late": Tk.a3
        default: Tk.ink2
        }
    }

    private func open(_ path: String, id: String) async {
        opening = id
        defer { opening = nil }
        if let url = await BillingFeed.pdfURL(path) {
            pdfFailed = false
            openURL(url)
        } else {
            pdfFailed = true
        }
    }

    private func load() async {
        async let plan = BillingFeed.arrangement()
        do {
            invoices = try await BillingFeed.invoices()
            failed = false
        } catch {
            failed = true
        }
        arrangement = await plan
        loaded = true
    }
}
