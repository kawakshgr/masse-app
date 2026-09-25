import ActivityKit
import SwiftUI
import WidgetKit

/// The session, readable at arm's length with the phone locked on the bench.
///
/// Resting, the countdown is the whole point and it is the biggest thing there.
/// Not resting, the exercise and the next set are. The countdown is drawn by
/// the system from two dates, so it ticks with the app asleep and needs no
/// push to reach zero.
struct SessionLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SessionActivityAttributes.self) { context in
            LockScreenView(context: context)
                .activityBackgroundTint(W.bg)
                .activitySystemActionForegroundColor(W.ink)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(context.state.exercise)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(W.ink)
                            .lineLimit(1)
                        Text(context.state.detail)
                            .font(.system(size: 13))
                            .foregroundStyle(W.ink2)
                    }
                    .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Countdown(state: context.state, size: 26)
                        .padding(.trailing, 4)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    RestProgress(state: context.state)
                        .padding(.horizontal, 4)
                }
            } compactLeading: {
                Image(systemName: resting(context.state) ? "timer" : "figure.strengthtraining.traditional")
                    .foregroundStyle(W.a1)
            } compactTrailing: {
                Countdown(state: context.state, size: 14)
                    .frame(maxWidth: 52)
            } minimal: {
                Image(systemName: "timer")
                    .foregroundStyle(W.a1)
            }
            .keylineTint(W.a1)
        }
    }
}

private struct LockScreenView: View {
    let context: ActivityViewContext<SessionActivityAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 3) {
                    Text((resting(context.state) ? context.state.restLabel : context.attributes.sessionName).uppercased())
                        .font(.system(size: 11, weight: .semibold))
                        .tracking(1.5)
                        .foregroundStyle(W.ink2)
                    Text(context.state.exercise)
                        .font(.system(size: 19, weight: .heavy))
                        .foregroundStyle(W.ink)
                        .lineLimit(1)
                    Text(context.state.detail)
                        .font(.system(size: 14))
                        .foregroundStyle(W.ink2)
                }
                Spacer(minLength: 8)
                Countdown(state: context.state, size: 40)
            }
            RestProgress(state: context.state)
        }
        .padding(16)
    }
}

/// The rest remaining, or the ready line when there is none.
private struct Countdown: View {
    let state: SessionActivityAttributes.ContentState
    let size: CGFloat

    var body: some View {
        if let start = state.restStartedAt, let end = state.restEndsAt, end > .now {
            Text(timerInterval: start...end, countsDown: true)
                .font(.system(size: size, weight: .heavy).monospacedDigit())
                .foregroundStyle(W.ink)
                .multilineTextAlignment(.trailing)
        } else {
            Text(state.readyLabel)
                .font(.system(size: min(size, 17), weight: .semibold))
                .foregroundStyle(W.a1)
                .multilineTextAlignment(.trailing)
        }
    }
}

private struct RestProgress: View {
    let state: SessionActivityAttributes.ContentState

    var body: some View {
        if let start = state.restStartedAt, let end = state.restEndsAt, end > .now {
            ProgressView(timerInterval: start...end, countsDown: true) {
                EmptyView()
            } currentValueLabel: {
                EmptyView()
            }
            .tint(W.a1)
        } else {
            // Same height with or without a rest, so the card does not jump
            // — or clip its last line — the moment the rest runs out.
            Color.clear.frame(height: 4)
        }
    }
}

private func resting(_ state: SessionActivityAttributes.ContentState) -> Bool {
    (state.restEndsAt ?? .distantPast) > .now
}

/// The handful of tokens the Lock Screen needs, from Tokens.swift. The Lock
/// Screen is always dark enough for the dark set.
private enum W {
    static let bg = Color(red: 0x16 / 255, green: 0x16 / 255, blue: 0x16 / 255)
    static let ink = Color(red: 0xF4 / 255, green: 0xF2 / 255, blue: 0xFB / 255)
    static let ink2 = ink.opacity(0.74)
    static let a1 = Color(red: 0x5F / 255, green: 0xE3 / 255, blue: 0xD2 / 255)
}
