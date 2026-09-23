import SwiftUI

/// The nine steps. They end with the week already written — that is the point
/// of asking: a client who finishes this has a programme, not an empty app.
///
/// Answers live on the device until the magic link comes back, because there
/// is no account to attach them to before then.
struct OnboardingView: View {
    @State private var model = OnboardingModel()
    @State private var signingIn = false

    var body: some View {
        if signingIn {
            SignInView { signingIn = false }
        } else {
            steps
        }
    }

    private var steps: some View {
        ZStack {
            Tk.bg.ignoresSafeArea()
            Atmosphere().ignoresSafeArea()

            VStack(spacing: 0) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 22) {
                        header
                        step
                    }
                    .padding(.horizontal, 22)
                    .padding(.top, 12)
                    .padding(.bottom, 28)
                }
                .scrollDismissesKeyboard(.interactively)

                footer
            }
        }
        .task { model.restore() }
    }

    // MARK: - Header

    @ViewBuilder private var header: some View {
        StepHeader(
            step: model.step,
            title: L.t(model.titleKey),
            lede: L.t(model.ledeKey)
        )

        if model.step == 2, let coach = model.answers.coachName {
            Text(L.t("onboarding.codeOk", coach))
                .font(Ty.copySmall)
                .foregroundStyle(Tk.a1)
        }
    }

    // MARK: - Steps

    @ViewBuilder private var step: some View {
        switch model.step {
        case 1: codeStep
        case 2: goalStep
        case 3: bodyStep
        case 4: injuriesStep
        case 5: equipmentStep
        case 6: daysStep
        case 7: cycleStep
        case 8: sleepStep
        default: summaryStep
        }
    }

    private var codeStep: some View {
        VStack(alignment: .leading, spacing: 14) {
            Field(
                label: L.t("onboarding.codeTitle"),
                placeholder: L.t("onboarding.codePlaceholder"),
                capitalisation: .characters,
                text: $model.answers.code
            )
            .tabular()

            if model.codeRejected {
                Text(L.t("onboarding.codeBad"))
                    .font(Ty.copySmall)
                    .foregroundStyle(Tk.a3)
                    .fixedSize(horizontal: false, vertical: true)
            }

            // A code is spent once, so it cannot be the only way in: a new
            // phone, a reinstall, or having onboarded on the web all end here.
            Button { signingIn = true } label: {
                Text(L.t("auth.haveAccount"))
                    .font(Ty.copySmall)
                    .foregroundStyle(Tk.ink2)
                    .underline()
            }
            .frame(minHeight: Tk.tap, alignment: .leading)
        }
    }

    private var goalStep: some View {
        VStack(spacing: 10) {
            ForEach(Answers.goals, id: \.self) { goal in
                SelectRow(
                    title: L.t("goal.\(goal)"),
                    selected: model.answers.goal == goal
                ) { model.answers.goal = goal }
            }
        }
    }

    private var bodyStep: some View {
        VStack(alignment: .leading, spacing: 16) {
            Field(label: L.t("onboarding.nameLabel"), text: $model.answers.name)
            HStack(spacing: 12) {
                Field(label: L.t("onboarding.height"), keyboard: .decimalPad, text: $model.answers.heightCm)
                Field(label: L.t("onboarding.weight"), keyboard: .decimalPad, text: $model.answers.weightKg)
            }
            Field(label: L.t("onboarding.birthYear"), keyboard: .numberPad, text: $model.answers.birthYear)
        }
    }

    private var injuriesStep: some View {
        VStack(alignment: .leading, spacing: 8) {
            TextEditor(text: $model.answers.injuries)
                .accessibilityLabel(L.t("onboarding.injuriesTitle"))
                .font(Ty.copy)
                .foregroundStyle(Tk.ink)
                .scrollContentBackground(.hidden)
                .frame(minHeight: 120)
                .padding(10)
                .background(Tk.glass2, in: .rect(cornerRadius: Tk.R.r2))
                .overlay(
                    RoundedRectangle(cornerRadius: Tk.R.r2)
                        .strokeBorder(Tk.edge, lineWidth: 1)
                )
        }
    }

    private var equipmentStep: some View {
        FlowRow(spacing: 8) {
            ForEach(Answers.equipmentOptions, id: \.self) { item in
                Chip(
                    title: L.t("equipment.\(item)"),
                    selected: model.answers.equipment.contains(item)
                ) { model.toggleEquipment(item) }
            }
        }
    }

    private var daysStep: some View {
        FlowRow(spacing: 8) {
            ForEach(0..<7, id: \.self) { day in
                Chip(
                    title: L.t("days.\(day)"),
                    selected: model.answers.sessionDays.contains(day)
                ) { model.toggleDay(day) }
            }
        }
    }

    private var cycleStep: some View {
        VStack(alignment: .leading, spacing: 14) {
            GlassCard(radius: Tk.R.r3) {
                Text(L.t("onboarding.cyclePromise"))
                    .font(Ty.copySmall)
                    .foregroundStyle(Tk.ink2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            SelectRow(title: L.t("onboarding.cycleOn"), selected: model.answers.cycleTracking) {
                model.answers.cycleTracking = true
            }
            SelectRow(title: L.t("onboarding.cycleOff"), selected: !model.answers.cycleTracking) {
                model.answers.cycleTracking = false
            }
        }
    }

    private var sleepStep: some View {
        Field(label: L.t("onboarding.sleepTitle"), keyboard: .decimalPad, text: $model.answers.sleepTargetH)
    }

    private var summaryStep: some View {
        VStack(alignment: .leading, spacing: 16) {
            GlassCard(radius: Tk.R.r3) {
                VStack(alignment: .leading, spacing: 10) {
                    ForEach(model.summary, id: \.0) { row in
                        HStack(alignment: .firstTextBaseline, spacing: 12) {
                            Text(row.0)
                                .font(Ty.copySmall)
                                .foregroundStyle(Tk.ink3)
                            Spacer(minLength: 8)
                            Text(row.1)
                                .font(Ty.body(14, weight: 600))
                                .foregroundStyle(Tk.ink)
                                .multilineTextAlignment(.trailing)
                        }
                    }
                }
            }

            Field(
                label: L.t("onboarding.emailLabel"),
                keyboard: .emailAddress,
                capitalisation: .never,
                text: $model.answers.email
            )

            if let message = model.message {
                Text(message)
                    .font(Ty.copySmall)
                    .foregroundStyle(model.messageIsError ? Tk.a3 : Tk.a1)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    // MARK: - Footer

    private var footer: some View {
        HStack(spacing: 10) {
            if model.step > 1 {
                SecondaryButton(title: L.t("onboarding.back")) { model.back() }
            }
            CTA(
                title: model.step == 9 ? L.t("onboarding.finish") : L.t("onboarding.next"),
                enabled: model.canAdvance && !model.busy
            ) {
                Task { await model.advance() }
            }
        }
        .padding(.horizontal, 22)
        .padding(.top, 12)
        .padding(.bottom, 8)
        .background(.ultraThinMaterial)
        .overlay(alignment: .top) { Tk.hair.frame(height: 1) }
    }
}

/// Chips wrap. SwiftUI has no flow layout of its own, so this is the smallest
/// honest one: place each subview, wrap when the row runs out.
struct FlowRow: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > width, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        return CGSize(width: width, height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX {
                x = bounds.minX
                y += rowHeight + spacing
                rowHeight = 0
            }
            view.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}

#Preview { OnboardingView() }
