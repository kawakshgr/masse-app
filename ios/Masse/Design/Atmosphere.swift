import SwiftUI

/// Two blurred blobs of the deep `b1` / `b2` pair, drifting. The phone screens
/// carry it; it is what the glass surfaces above have to catch.
///
/// Not the bright accents: those are for ink and fills, and would oversaturate
/// everything sitting on top.
struct Atmosphere: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var drift = false

    var body: some View {
        GeometryReader { geo in
            ZStack {
                blob(Tk.b1, size: geo.size.width * 1.1)
                    .offset(x: -geo.size.width * 0.3, y: -geo.size.height * 0.28)
                    .offset(x: drift ? 26 : 0, y: drift ? 34 : 0)

                blob(Tk.b2, size: geo.size.width * 1.0)
                    .offset(x: geo.size.width * 0.34, y: geo.size.height * 0.3)
                    .offset(x: drift ? -22 : 0, y: drift ? -28 : 0)
            }
            .blur(radius: 48)
            .opacity(0.7)
        }
        .allowsHitTesting(false)
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 26).repeatForever(autoreverses: true)) {
                drift = true
            }
        }
    }

    private func blob(_ colour: Color, size: CGFloat) -> some View {
        Circle().fill(colour).frame(width: size, height: size * 0.62)
    }
}
