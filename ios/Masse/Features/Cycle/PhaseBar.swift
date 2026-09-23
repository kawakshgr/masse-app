import SwiftUI

/// The cycle as a strip: four phases at their real widths, and a mark on today.
///
/// The widths come from the database — one phase is not a quarter of a cycle,
/// and drawing them equal would say something untrue about a body. The current
/// phase is the only one filled, so the answer to "where am I" is the thing the
/// eye lands on.
struct PhaseBar: View {
    let spans: [PhaseSpan]
    let currentPhase: String?
    let dayOfCycle: Int?
    let cycleLength: Int

    private var total: Int {
        max(spans.reduce(0) { $0 + $1.length }, 1)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            GeometryReader { proxy in
                let width = proxy.size.width

                ZStack(alignment: .leading) {
                    HStack(spacing: 2) {
                        ForEach(spans) { span in
                            let isNow = span.phase == currentPhase
                            RoundedRectangle(cornerRadius: 4)
                                .fill(Sel.style(isNow))
                                .frame(width: segmentWidth(span, in: width))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 4)
                                        .strokeBorder(isNow ? Tk.a1 : .clear, lineWidth: 1)
                                )
                        }
                    }

                    // Today, on the same scale as the segments beneath it.
                    if let day = dayOfCycle {
                        Capsule()
                            .fill(Tk.ink)
                            .frame(width: 2, height: 30)
                            .offset(x: markerOffset(day, in: width))
                            .accessibilityHidden(true)
                    }
                }
            }
            .frame(height: 30)

            HStack(spacing: 6) {
                ForEach(spans) { span in
                    Text(L.t("phase.\(span.phase)"))
                        .font(Ty.copySmall)
                        .foregroundStyle(span.phase == currentPhase ? Tk.ink : Tk.ink3)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(spoken)
    }

    private func segmentWidth(_ span: PhaseSpan, in width: CGFloat) -> CGFloat {
        let gaps = CGFloat(max(spans.count - 1, 0)) * 2
        return max((width - gaps) * CGFloat(span.length) / CGFloat(total), 2)
    }

    /// Centred on the day's own slice, so day 1 sits inside the first segment
    /// rather than on the edge before it.
    private func markerOffset(_ day: Int, in width: CGFloat) -> CGFloat {
        let slice = width / CGFloat(max(cycleLength, 1))
        let clamped = min(max(day, 1), max(cycleLength, 1))
        return slice * (CGFloat(clamped) - 0.5) - 1
    }

    private var spoken: String {
        guard let phase = currentPhase, let day = dayOfCycle else {
            return L.t("cycleChart.none")
        }
        return L.t("cycleChart.spoken", L.t("phase.\(phase)"), String(day))
    }
}
