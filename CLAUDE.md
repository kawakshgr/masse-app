# Masse — web app + native iOS

Coaching software for strength coaches. **Two clients, one backend.**

| Target | Who | Stack |
|--------|-----|-------|
| **Web app** | The coach (and any client on Android) | Next.js App Router on Vercel |
| **Native iOS** | The client, primarily | SwiftUI, iOS 17+ |
| **Backend** | Both | Supabase — Postgres + Auth, **EU region (Frankfurt)** |

Full design handoff: `README.md` (scope, data model, screens, tokens).
Design reference: `Masse.dc.html` — switch the platform control to **Mac**/**Web** for
the coach, **iPhone** for the client. `Onboarding.dc.html` is the nine-step flow.

French UI first (`next-intl` on web, `String(localized:)` + `fr.lproj` on iOS);
English second. The French copy in the `FR_*` dictionaries is reviewed — lift it
verbatim, but **do not copy the prototype's DOM-translation mechanism**; it is a
prototyping trick.

## Build order

The backend is the contract. Build it once, then the two clients in parallel.

1. **Supabase project + schema + RLS** — EU region, from day one.
2. **Web: coach auth, roster, programme editor.** The coach's job is the product.
3. **Web: client screens** as a PWA — this is also the Android client. Same
   tabs and screens as the iPhone app (`src/app/(client)`), minus Apple Health.
4. **iOS: native client** — onboarding, Today, Train, Cycle. Reads the same tables.
5. **iOS: Live Activity + rest timer** — the reason the native app exists at all.
   Built: `RestTimer` (two dates, a local notification at the end) drives
   `SessionActivityAttributes`, shared with the `MasseWidgets` extension through
   `ios/Shared`. The extension has no string catalog — the app sends it words
   already localised. The web has the same rest bar, without the Lock Screen.

## What each target owns

**Web only:** the programme editor (drag and drop between day columns, resizable panes,
⌘K palette), the roster, the check-in form the coach types into.

**iOS only:** Live Activity for the running session, local notifications for rest
timers, Dynamic Type, offline set queue in local storage.

**Both:** onboarding by invite code, Today, session logging, cycle entry, the weekly
check-in as read.

## In v1

- **Invite-code onboarding** — nine steps, ends with week 1 written. Carries auth.
- **Roster** (web) — client list with the reason each client needs the coach.
- **Programme editor** (web) — weeks, seven day columns, sessions, ordered exercises,
  drag between days, duplicate week, save as template, push to clients.
- **Session logging** (both) — offline-first.
- **Check-ins** — **filed by the client**, from either app, with measurements and
  three photos. The coach's side is read-only (decided 24 Sep 2026): she reads,
  marks as read, and nudges (`check_in_reminders`, plus a prefilled WhatsApp
  message). The database holds her to that — a trigger lets a coach change
  `reviewed_at` and nothing else. She sets the due weekday in Admin
  (`coaches.check_in_due_offset`); `checkInWindow` in src/lib/checkIns.ts,
  mirrored by `CheckInFeed.open` on iOS, decides which week is asked for,
  when it opens (3 days before) and when it is late (2 days of grace after).
  Opening the form creates an empty row for photos to hang off; `isFiled`
  (src/lib/checkIns.ts) keeps it out of the coach's review until it holds
  something.
- **Cycle levers reach the client** — `client_cycle_state` returns the coach's
  per-phase load/sets/RPE/kcal/carbs; both clients apply them to what she is
  shown, never to the stored programme. It returns the day of cycle and the
  length to the client only, and pins the date to today for the coach: those
  would date a period.
- **Sleep and steps** — typed, or read from **Apple Health** on iOS. Read only:
  the app writes nothing back, and sleep *quality* stays typed because Health
  does not know whether a night was rough.
- **Cycle** — **entered manually, always.** Health exposes menstrual data and
  Masse does not ask for it: reading it would pull in exactly what "dates only,
  never symptoms" exists to keep out.
- **Messaging** — tab present, **inert**, badged `soon`.
- **Settings** (both) — behind the gear on Today: her details, her payments,
  appearance, language, privacy, release notes. Reminders are local
  notifications on iOS only; the web says so instead of hiding the section.
- **Her own billing, read only** — the client reads her arrangement, her
  non-draft invoices and their archived PDFs. She never writes a money row.
- **Her own details** — a client may update `first_name`, `name`, `phone`,
  `birth_date`, `height_cm`, `occupation`, `emergency_contact` on her row and
  nothing else; the trigger `clients_self_update_guard` enforces the list.

## Deliberately not in v1

- **Messaging implementation.** A credible thread needs real time, read states, push and
  media upload — a month of work to be worse than WhatsApp, which coaches already have.
  Keep the tab so the product's shape is honest.
- **Nutrition** — the coach writes targets as text in the programme.
- **Billing** — a spreadsheet suffices at this scale.
- **Health Connect** on Android. iOS reads Apple Health for sleep and steps
  (decided 23 Sep 2026, after the cost was weighed); the Android client has no
  equivalent yet and its clients type both.

## Ground rules

Each came out of a design decision or an audit. Not style preferences.

1. **EU region on day one.** The database holds special-category health data (cycle
   dates) under GDPR Art. 9. Migrating regions later is painful.
2. **Symptom notes never reach the server.** No table, ever. Local to the device —
   `UserDefaults`/SwiftData on iOS, `localStorage` on web. The app promises this on
   screen.
3. **Cycle data is dates only** — period start, cycle length. Phase and load
   coefficient are derived at read time, never stored.
4. **RLS on every table.** A coach reads only her clients; a client only her own rows.
   Enforce at the database — the iOS app talks to Supabase directly, so UI-layer checks
   are worth nothing.
5. **Keep programme structure relational.** No UI-shaped JSON blobs: both clients
   decode the same `sessions` / `session_exercises` rows.
6. **`assignments` is the delivery boundary.** `pushed_at` null means the client cannot
   see it. Delivery is never a side effect of saving.
7. **Derive prose from data.** Any sentence stating a number computes it from the same
   source the adjacent chart reads. The prototype had four bugs where a written summary
   contradicted the figures beside it.
8. **Offline is a state, not an error.** Sets are written locally, labelled as held,
   synced on reconnect — correct singular/plural in both languages.
9. **Today is reported, never judged.** A day in progress gets a neutral treatment,
   never a pass/fail colour.
10. **Uniform row heights in lists.** A ragged list reads as noise.
11. **Empty states are designed, not blank** — no clients, no programmes, an empty day,
    nothing logged today. The prototype has all of them.
12. **One radius scale per family.** Web 6/10/14/18; iOS 12/16/20/26 (sheets 38);
    chart bars `5px 5px 2px 2px`. Nothing in between.
13. **Deferred features keep their nav entry, rendered inert** — greyed label, `soon`
    badge, one line of copy on tap. Driven by one list (`SOON` in the prototype), not
    scattered conditions.
14. **HealthKit is scoped, not open.** Two read types — `stepCount` and
    `sleepAnalysis` — and nothing written back. Adding a third is not a one-line
    change: it means re-reading the privacy label and the Art. 9 basis. The
    cycle is deliberately not among them.
15. **Every new table states its grants, in the migration that creates it.**
    From 30 Oct 2026 Supabase no longer grants new `public` tables to the API
    roles, so a table without them is unreachable on a fresh project, a
    preview branch or `supabase db reset`. The pattern:
    `grant select, insert, update, delete on public.x to authenticated, service_role;`
    and `revoke all on public.x from anon;` — nothing is read signed out; the
    one signed-out need (invite preview) goes through a function. RLS still
    decides the rows.

## Tables in v1

`coaches`, `invite_codes`, `clients`, `programmes`, `programme_weeks`, `sessions`,
`session_exercises`, `assignments`, `set_logs`, `check_ins`, `cycle_logs`,
`daily_metrics`.

Do not create yet: `threads`, `messages`, `foods`, `meals`, `invoices`.

## Commands

```bash
# web
npm run dev
npm run build

# backend
npx supabase start
npx supabase db push

# ios
xcodebuild -scheme Masse -destination 'platform=iOS Simulator,name=iPhone 16'
```
