import SwiftUI

/// The code in the sign-in email, typed rather than tapped — OtpCodeEntry on
/// the web.
///
/// The link only finishes on the phone that asked for it: PKCE keeps its
/// verifier here. A link opened on a computer, or in a mail app that will not
/// hand it back, cannot sign her in. The code can, wherever she read it.
struct CodeEntry: View {
    let email: String

    @Environment(Session.self) private var session
    @State private var code = ""
    @State private var checking = false
    @State private var bad = false

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Divider().overlay(Tk.hair)

            Text(L.t("auth.codeLabel")).kicker()

            TextField("••••••••", text: $code)
                .keyboardType(.numberPad)
                .textContentType(.oneTimeCode)
                .multilineTextAlignment(.center)
                .font(Ty.figure)
                .tracking(8)
                .foregroundStyle(Tk.ink)
                .tabular()
                .frame(minHeight: 56)
                .background(Tk.glass2, in: .rect(cornerRadius: Tk.R.r2))
                .overlay(
                    RoundedRectangle(cornerRadius: Tk.R.r2)
                        .strokeBorder(Tk.edge, lineWidth: 1)
                )
                .onChange(of: code) { _, new in
                    let digits = String(new.filter(\.isNumber).prefix(8))
                    if digits != new { code = digits }
                    bad = false
                }

            Text(L.t(bad ? "auth.codeBad" : "auth.codeHint"))
                .font(Ty.copySmall)
                .foregroundStyle(bad ? Tk.a3 : Tk.ink3)
                .fixedSize(horizontal: false, vertical: true)

            SecondaryButton(title: L.t(checking ? "auth.codeChecking" : "auth.codeVerify")) {
                Task { await verify() }
            }
            .disabled(code.count < 6 || checking)
            .opacity(code.count < 6 ? 0.5 : 1)
        }
    }

    private func verify() async {
        checking = true
        defer { checking = false }
        bad = !(await session.verify(email: email, code: code))
    }
}
