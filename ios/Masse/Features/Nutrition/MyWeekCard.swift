import SwiftUI

/// Her own week, and the one thing she needs to do to it: move a day — MyWeek
/// on the web. Tap one day, then another, and they trade places.
struct MyWeekCard: View {
    /// Monday first; nil is a default day.
    let week: [String?]
    /// Called once the swap has landed, so the plan above can follow it.
    let onSwapped: () async -> Void

    @State private var picked: Int?
    @State private var busy = false

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 12) {
                SectionHeader(title: L.t("myWeek.title"), symbol: "calendar")

                Text(picked.map { L.t("myWeek.pickSecond", L.t("days.\($0)")) } ?? L.t("myWeek.lede"))
                    .font(Ty.copySmall)
                    .foregroundStyle(Tk.ink2)
                    .fixedSize(horizontal: false, vertical: true)

                VStack(spacing: 6) {
                    ForEach(0..<7, id: \.self) { day in
                        row(day)
                    }
                }
                .opacity(busy ? 0.6 : 1)
                .disabled(busy)

                Text(L.t("myWeek.note"))
                    .font(Ty.copySmall)
                    .foregroundStyle(Tk.ink3)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func row(_ day: Int) -> some View {
        let chosen = picked == day
        return Button {
            Task { await choose(day) }
        } label: {
            HStack(spacing: 12) {
                Text(L.t("days.\(day)"))
                    .font(Ty.copySmall)
                    .foregroundStyle(Tk.ink2)
                    .frame(width: 84, alignment: .leading)
                Text(week.indices.contains(day) ? (week[day] ?? L.t("myWeek.default")) : L.t("myWeek.default"))
                    .font(Ty.rowTitle)
                    .foregroundStyle(Tk.ink)
                    .lineLimit(1)
                Spacer(minLength: 8)
                if chosen {
                    Image(systemName: "arrow.up.arrow.down")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Tk.a1)
                }
            }
            .padding(.horizontal, 14)
            .frame(minHeight: 52)
            .background(Sel.style(chosen), in: .rect(cornerRadius: Tk.R.r2))
            .overlay(
                RoundedRectangle(cornerRadius: Tk.R.r2)
                    .strokeBorder(chosen ? Tk.a1 : Tk.edge, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(chosen ? .isSelected : [])
    }

    private func choose(_ day: Int) async {
        guard let first = picked else {
            picked = day
            return
        }
        picked = nil
        guard first != day else { return }

        busy = true
        defer { busy = false }
        try? await MyWeekFeed.swap(first, day)
        await onSwapped()
    }
}
