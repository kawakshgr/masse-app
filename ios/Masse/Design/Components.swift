import SwiftUI

// The atoms every screen is built from. A view composes these; it does not
// reach for a colour, a radius or a font size of its own.

/// Selection is a tinted gradient, never a flat fill — the web's `--sel`. One
/// definition, erased to a single type so it can be handed to `.background`.
enum Sel {
    static func style(_ selected: Bool) -> AnyShapeStyle {
        selected
            ? AnyShapeStyle(LinearGradient(
                colors: [Tk.a1.opacity(0.30), Tk.a2.opacity(0.26)],
                startPoint: .top,
                endPoint: .bottom))
            : AnyShapeStyle(Tk.glass2)
    }
}

/// A panel: glass over the atmosphere, with the specular hairline that makes it
/// read as a surface rather than a rectangle of tint.
struct GlassCard<Content: View>: View {
    var radius: CGFloat = Tk.R.r4
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Tk.glass, in: .rect(cornerRadius: radius))
            .overlay(
                RoundedRectangle(cornerRadius: radius)
                    .strokeBorder(Tk.edge, lineWidth: 1)
            )
    }
}

/// The primary action. Teal to violet — the one place both accents appear at
/// once — and full width, because a thumb should not have to aim.
struct CTA: View {
    let title: String
    var enabled: Bool = true
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(Ty.action)
                .foregroundStyle(Tk.onA)
                .frame(maxWidth: .infinity, minHeight: 52)
                .background(
                    LinearGradient(
                        colors: [Tk.a1, Tk.a2],
                        startPoint: .leading,
                        endPoint: .trailing
                    ),
                    in: .rect(cornerRadius: Tk.R.pill)
                )
        }
        .disabled(!enabled)
        .opacity(enabled ? 1 : 0.4)
    }
}

/// A quieter action beside the primary one.
struct SecondaryButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(Ty.action)
                .foregroundStyle(Tk.ink2)
                .frame(minHeight: 52)
                .padding(.horizontal, 20)
                .background(Tk.glass2, in: .rect(cornerRadius: Tk.R.pill))
        }
    }
}

/// One option in a list of them. Selected is `--sel`: a tinted gradient, never
/// a flat fill, so it reads as chosen rather than as disabled.
struct SelectRow: View {
    let title: String
    var subtitle: String?
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(Ty.rowTitle)
                        .foregroundStyle(Tk.ink)
                    if let subtitle {
                        Text(subtitle)
                            .font(Ty.copySmall)
                            .foregroundStyle(Tk.ink2)
                    }
                }
                Spacer(minLength: 8)
                if selected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(Tk.a1)
                }
            }
            .padding(.horizontal, 16)
            .frame(minHeight: 54, alignment: .leading)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(rowBackground, in: .rect(cornerRadius: Tk.R.r2))
            .overlay(
                RoundedRectangle(cornerRadius: Tk.R.r2)
                    .strokeBorder(Tk.edge, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private var rowBackground: AnyShapeStyle { Sel.style(selected) }
}

/// A chip in a wrapping group: days of the week, equipment.
struct Chip: View {
    let title: String
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(Ty.body(14, weight: 600))
                .foregroundStyle(selected ? Tk.ink : Tk.ink2)
                .padding(.horizontal, 16)
                .frame(minHeight: Tk.tap)
                .background(chipBackground, in: .rect(cornerRadius: Tk.R.pill))
                .overlay(
                    RoundedRectangle(cornerRadius: Tk.R.pill)
                        .strokeBorder(Tk.edge, lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }

    private var chipBackground: AnyShapeStyle { Sel.style(selected) }
}

/// A labelled field. The label is a kicker, so every form in the app opens the
/// same way.
struct Field: View {
    let label: String
    var placeholder: String = ""
    var keyboard: UIKeyboardType = .default
    var capitalisation: TextInputAutocapitalization = .sentences
    @Binding var text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label).kicker()
            TextField(placeholder, text: $text)
                .font(Ty.copy)
                .foregroundStyle(Tk.ink)
                .keyboardType(keyboard)
                .textInputAutocapitalization(capitalisation)
                .autocorrectionDisabled()
                .padding(.horizontal, 14)
                .frame(minHeight: 52)
                .background(Tk.glass2, in: .rect(cornerRadius: Tk.R.r2))
                .overlay(
                    RoundedRectangle(cornerRadius: Tk.R.r2)
                        .strokeBorder(Tk.edge, lineWidth: 1)
                )
        }
    }
}

/// The header every onboarding step shares: which step, its title, its lede.
struct StepHeader: View {
    let step: Int
    let title: String
    let lede: String

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(L.step(step)).kicker().tabular()
            Text(title)
                .font(Ty.screenTitle)
                .tracking(Ty.displayTracking(30))
                .foregroundStyle(Tk.ink)
                .fixedSize(horizontal: false, vertical: true)
            Text(lede)
                .font(Ty.copy)
                .foregroundStyle(Tk.ink2)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
