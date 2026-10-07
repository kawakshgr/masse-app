# Masse — web app + native iOS

Coaching software for strength coaches. **One web app, one backend.**

> **PWA only (decided 29 Sep 2026).** Clients use the web app installed on
> the home screen, on iPhone and Android alike. The native iOS app in `ios/`
> is **frozen**: no more changes, builds or installs. It no longer matches
> the backend (its onboarding still sends the old `claim_invite`
> arguments). Everything below about iOS is history, kept for reference.
> Rest timers on the Lock Screen and Apple Health are given up: clients who
> want a gym timer use Hevy or another app, and type sleep and steps.

| Target | Who | Stack |
|--------|-----|-------|
| **Web app** | The coach, and every client as a PWA | Next.js App Router on Vercel |
| ~~Native iOS~~ | Frozen 29 Sep 2026 | SwiftUI |
| **Backend** | The web app | Supabase — Postgres + Auth, **EU region (Frankfurt)** |

Full design handoff: `README.md` (scope, data model, screens, tokens).
Design reference: `Masse.dc.html` — switch the platform control to **Mac**/**Web** for
the coach, **iPhone** for the client. `Onboarding.dc.html` is the nine-step flow.

French UI first (`next-intl` on web, `String(localized:)` + `fr.lproj` on iOS);
English second. Dates and figures follow the language through `lib/locale.ts`
(`intl(locale)`: fr-FR or en-GB) — never a hard-coded "fr-FR", except on
invoices, which stay French. The French copy in the `FR_*` dictionaries is reviewed — lift it
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
   already localised. The web had the same rest bar until 29 Sep 2026; it is
   gone — rest time is written on each exercise, the client runs a timer.
   From iOS 26.1 the rest also rides above the tab bar on every tab
   (`tabViewBottomAccessory`, `RestAccessory`); `RestTimer` is owned by
   `ClientTabs` for that reason. The tab bar uses the `Tab` API and shrinks
   on scroll from iOS 26. Deployment target: iOS 18.

## What each target owns

**Web only:** the programme editor (drag and drop between day columns, resizable panes,
⌘K palette), the roster, the check-in form the coach types into.

**iOS only:** Live Activity for the running session, local notifications for rest
timers, Dynamic Type, offline set queue in local storage.

**Both:** onboarding by invite code, Today, session logging, cycle entry, the weekly
check-in as read. Neither has messaging: WhatsApp is the channel.

## In v1

- **Invite-code onboarding** — nine steps, ends with week 1 written. Carries auth.
  The coach may offer a video call on the invite (29 Sep 2026: unticked by
  default, 10/20/30/60 min, `invite_codes.call_minutes`). She sets weekly
  windows and days off once in Mon compte (`coach_availability`,
  `coach_unavailable_days`, Paris time) with her personal video link
  (`coaches.call_link`; nothing is connected — no Zoom or Google API).
  Step 5 then offers her real free slots (`invite_free_slots`: next week,
  24 h ahead at least, minus calls booked) and `claim_invite` books the one
  taken (`appointments`) in the same transaction; a slot taken meanwhile
  lets the sign-up through without it. The coach sees calls in À traiter
  and above the client's tabs (WhatsApp confirmation, cancel); the client
  on Today. `/rendez-vous/[id]` serves the .ics to either side.
  A call can also be offered to a client already coached (30 Sep 2026):
  the coach sets a length from the client's header
  (`clients.call_offer_minutes`), the client picks a slot on Today
  (`my_call_slots`, `book_call`), and the offer is spent.
  An invite may also ask for approval (30 Sep 2026, "Valider avant d'ouvrir
  le suivi", ticked with the video call unless she changes it,
  `invite_codes.needs_approval`): the client then arrives `pending`. The
  coach reads the answers on one sheet (`RequestSheet`, in place of the
  tabs; "Nouvelles demandes" in À traiter, flagged once the call is over)
  and accepts — status `active`, the app opens — or refuses, which erases
  the account at once (`erase_my_client`). Until then the client's whole
  app is one waiting screen (`PendingScreen`) with the call and "Annuler
  ma demande", which erases it too. A client cannot lift `pending` alone.
- **Roster** (web) — client list with the reason each client needs the coach.
- **Her own words on WhatsApp** (1 Oct 2026) — Admin → Messages: the
  eleven messages Masse writes (reminders, payment, calls, requests) can be
  rewritten, placeholders shown in her language and stored as Masse's
  ({first}…), in `coach_messages`. Every link writes through
  `messageWriter()` (lib/coachMessages.ts): hers, else the default text.
- **À traiter** (web, 29 Sep 2026) — the pane the coach lands on beside her
  roster (`/clients`): every client who needs her, grouped by reason — late
  and filed check-ins, late invoices, three days of silence, missed sessions,
  next week not sent, no programme yet, short sleep — each with a WhatsApp
  message already written (`lib/whatsapp.ts`) or the screen that answers it.
  `lib/queue.ts` reuses the roster's attention rule; it adds, never re-derives.
- **Programme editor** (web) — weeks, seven day columns, sessions, ordered exercises,
  drag between days, duplicate week, save as template, push to clients —
  one week, or the whole programme to several clients at once (30 Sep 2026,
  `pushProgramme`: week 1 on the chosen date, each later week 7 days on). A
  week pushed ahead stays out of sight until its start date: every reader
  of `assignments` takes `start_date <= today`.
  The scheme she types ("4×8 @ 60 kg") is read into `target_sets`,
  `target_reps`, `target_weight_kg` (`lib/scheme.ts`); ranges and anything
  else stay text with no target. Below lg there is no library pane: each
  day has a big "+ Mouvement" opening `MovementPicker` (1 Oct 2026) — a
  search, eight muscle families (`lib/movementFamilies.ts`), then one
  family filtered by kit; a tap adds to the day. A push never re-dates a
  week a client has already begun (`weeksBegun`): her history is read
  against that date. A session copies to other weeks and a day
  (`copySession`, CopySessionSheet), never replacing one a client has
  logged sets on (set_logs cascade). On a computer a movement edits in a
  panel on the right (the same ExerciseSheet). A movement may name up to
  three stand-ins (1 Oct 2026, `session_exercises.alternatives`): the
  client swaps on Séance with one tile when the machine is taken, and each
  set carries `set_logs.done_as` — history, records, "la dernière fois"
  and the strength curve read `done_as ?? name`; progression ignores those
  sets. A deload week is written from the menu (`deloadWeek`, 1 Oct 2026:
  a set fewer if asked, load −20 to −50 % rounded to a plate, reps kept,
  never pushed). A new programme can start from a template or from any
  programme's menu (2 Oct 2026, `copyProgramme`: every week, session and
  movement, rest days and stand-ins; nothing assigned; not a template).
  Next week can be written from the last (`progressWeek`, 29 Sep 2026): an
  exercise moves on (+2.5 kg or +1 rep, her choice) only when every client
  who logged it hit every prescribed set; otherwise, or with no logs or no
  target, it stays. The new week is never pushed by this.
- **Session logging** (both) — offline-first. Séance opens today's session
  or another day's (`?jour=`, 30 Sep 2026: sessions get moved), lists the
  week ("Ma semaine") with what is logged, and shows under each movement
  the client's last sets on it (`lib/lastTime.ts`). Reps and load are
  stepped with − and +, or typed: a tap on the number opens the keypad
  (7 Oct 2026, decimal for kg, comma or point). Sets shown are the
  week's, whichever day they were done. Two weekdays can trade places
  for the running week (30 Sep 2026, `client_day_moves`, `lib/dayMoves.ts`):
  "Échanger avec aujourd'hui" on another day's session, or two taps in the
  Nutrition tab's week. The session and the day type — so the food — move
  together, because every reader (Today, Séance, Nutrition, the PDF, and
  the coach's roster, week and history) takes both from the same planned
  day: read a weekday through `weekPlan()` / `plannedDays`, never straight
  from `day_index`. Nothing of the coach's is rewritten; the client only
  reads `client_week_days` now. Monday, the week is as planned again. A client may flag pain on an
  exercise (30 Sep 2026: mild / sharp / had to stop, optional note,
  `pain_reports`); it heads À traiter until the coach marks it seen. Health
  data: accepted only under consent, erased when consent is withdrawn.
- **Check-ins** — **filed by the client**, from either app, with measurements and
  three photos. The coach's side is read-only (decided 24 Sep 2026): she reads,
  marks as read, and nudges (`check_in_reminders`, plus a prefilled WhatsApp
  message). The database holds her to that — a trigger lets a coach change
  `reviewed_at` and nothing else. Under the review she can prepare a summary
  to send (30 Sep 2026, `CheckInSummary`): the week's figures in a few
  lines — weight and measurements against the last and the first check-in,
  sessions logged, average sleep and steps — composed by
  `lib/checkInSummary.ts` from the rows the review shows, read on demand
  (`checkInWeekFigures`), hers to edit, then opened in WhatsApp. Figures
  only: the client's answers and pain are not repeated back. On her
  check-in day she can take them one after the other (`/bilans`, 1 Oct
  2026): the oldest unread first, "Lu, suivant" or "Passer", and at the
  end who has not filed, with the reminder written. She sets the due weekday in Admin
  (`coaches.check_in_due_offset`), and may give one client a day of their
  own from their check-ins tab (7 Oct 2026, `clients.check_in_due_offset`,
  null = hers; every reader goes through `dueOffsetFor`); `checkInWindow` in src/lib/checkIns.ts,
  mirrored by `CheckInFeed.open` on iOS, decides which week is asked for,
  when it opens (3 days before) and when it is late (2 days of grace after).
  The client's form is one question a screen (1 Oct 2026); a photo slot
  opens the camera with the last check-in's photo of that pose laid over
  it (2 Oct 2026, `CameraSheet`: guide opacity, 5/10 s timer, front/back,
  3:4 crop; picking a file stays one tap away); the coach's
  review has a before/after slider and a picture to send (made on the
  device, nothing uploaded).
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
- **No messaging.** Coach and client talk on WhatsApp — the nudge to file a
  check-in already opens a prefilled WhatsApp message. There is no inbox tab
  on either side (removed 26 Sep 2026); do not add one back.
- **Settings** (both) — behind the gear on Today: her details, her payments,
  appearance, language, privacy, her data, release notes, notifications.
- **Notifications** (1 Oct 2026, web push) — turned on per device from
  Réglages → Notifications or Mon compte (`PushSettings`; on iPhone only in
  the installed app), kept in `push_subscriptions` with the device's
  language, sent by `lib/push.ts` with the service role and the VAPID keys
  (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`; inert without them).
  The client gets one morning notification (`/api/notify`, Vercel Cron
  05:00 UTC: session through the week as arranged, check-in due or late, a
  call today, the night when not yet noted), an evening one for the day's
  steps (`?moment=soir`, 19:00 UTC) and the coach's nudge; the coach hears of a check-in first
  filed and of pain reported. No figure of health in a payload. On her check-in day (the
  weekday she set them due) the coach gets one morning summary of what
  waits: to read, not filed yet, late payments, pain (1 Oct 2026).
- **Passkeys** (30 Sep 2026) — Face ID, a fingerprint or the device code as
  a quicker way back in, for clients and coaches alike. The e-mail code
  stays the first sign-in and the fallback. Turned on from Réglages → Clé
  d'accès or Mon compte (`PasskeySettings`), used from `/connexion`
  (`PasskeySignIn`). Supabase Auth's native passkeys, experimental: the
  browser client opts in (`lib/supabase/client.ts`). Bound to the domain
  masseapp.online (the Relying Party ID — never change it, every passkey
  would die); nothing is offered on any other address (`lib/passkeys.ts`).
- **The client's own progress** (1 Oct 2026) — `/evolution`, from Today:
  weight by check-in, measurements against the first, the first and latest
  photo of a pose on the slider (shared from the phone), and strength
  (`loadStrength`). `/seance/historique`: the last eight weeks sent, with
  the sets logged per movement.
- **Fresh data** (2 Oct 2026, `PullToRefresh`, in both layouts) — on a
  touch screen, pulling down from the top of whatever scrolls runs
  `router.refresh()` (server data again, client state kept); never in a
  sheet or while typing; offline it says so. Everywhere, coming back after
  five minutes in the background refreshes unasked. A computer has F5.
- **Offline pages** (1 Oct 2026) — the service worker keeps Séance,
  Aujourd'hui and Nutrition as last served (fresh first, the copy after 4 s
  or offline, never a redirect) and `/connexion` forgets them
  (`lib/offlinePages.ts`): one person's pages, never a coach's.
- **Her own billing, read only** — the client reads her arrangement, her
  non-draft invoices and their archived PDFs. She never writes a money row.
- **Her own details** — a client may update `first_name`, `name`, `phone`,
  `birth_date`, `height_cm`, `occupation`, `emergency_contact` on her row and
  nothing else; the trigger `clients_self_update_guard` enforces the list.
- **The coach's own details** — "Mon compte", behind her name in the top bar:
  first and last name, phone, and the address her invoices print (kept once,
  on `coach_billing_profiles`), her video link and call availability. On her
  `coaches` row she may change `name`, `first_name`, `pronoun`, `phone`,
  `check_in_due_offset`, `logo_path`, `call_link` and nothing else —
  `coaches_self_update_guard`, so a suspended coach cannot lift her own
  suspension. Platform admins pass.
- **A logo per coach** (29 Sep 2026) — uploaded in Admin → Logo straight to
  the public `coach-logos` bucket (own folder only, PNG/JPEG, 1 MB), path on
  `coaches.logo_path`, URL from `lib/logo.ts`. Printed on the invoice sheet
  and its PDF, shown to the coach's clients on Today.
- **Client PDF** (29 Sep 2026) — from Session and Nutrition, a dropdown
  (programme / meal plan / both) and a download: `/export` renders
  `lib/clientPdf.tsx` with the client's own session — this week at today's
  phase, the plan per day type with numbered meals and supplements — under
  the coach's logo. Fonts shared with the invoice through `lib/pdfFonts.ts`.
- **GDPR** (29 Sep 2026, see `docs/rgpd/`) — consent to health data at
  sign-up, withdrawn or given again in Réglages → Mes données (cycle
  tracking that was on resumes with it, `cycle_tracking_paused`); a client's
  data export (`/reglages/donnees`); erasure by the client
  (`delete_my_account`) or the coach (`erase_my_client`), photos removed from
  storage first (`lib/erase.ts`) because SQL cannot; invoices survive
  erasure with `billed_to` (kept 10 years). Archiving a client starts
  retention — photos after 3 months, everything after 12 — run nightly by
  `/api/retention` (Vercel Cron, needs `SUPABASE_SERVICE_ROLE_KEY` and
  `CRON_SECRET`). Adults only (`claim_invite`). Functions run in `fra1`.
  Public pages: `/confidentialite`, `/mentions-legales`, `/conditions` — in
  French and in English (30 Sep 2026: `?lang=`, else the app's language);
  the French version binds. Change one language, change the other.

Billing (1 Oct 2026): the month's invoices go out in one press —
Facturation lists monthly clients whose invoice has not gone, ticked by
default; `issueAndSendMonth` issues, archives and e-mails each. Above the
table, the last twelve months from the invoice rows (`RevenueChart`):
received at the foot of each bar, billed and still owed above. A
changed monthly rate moves this month's row with it (`saveArrangement`)
unless the invoice is issued: a numbered invoice keeps its amount, number
and issue date — the trigger `invoices_issued_fixed` holds every path to
that, ticking paid included (2 Oct 2026). A month marked paid is locked
the same way while it stays paid; unticking reopens it.

Speed (1 Oct 2026): server components read the user with `authUser()`
(`lib/supabase/auth.ts`, getClaims verified locally against the ES256 key,
once per request) — not `auth.getUser()`, a trip to the auth server each
time; server actions that write keep getUser. Reads that do not depend on
one another go in one `Promise.all`. Every route group has a `loading.tsx`
skeleton (`components/Skeleton.tsx`), and a client file's tabs show theirs
the moment one is tapped. The coach layout waits only for the coach's row:
the top line's count and the ⌘K names stream in (`NeedsLine`, `Palette`).
A link to a file (the data export) is a plain `<a>`, never a prefetching
`Link`.

## Deliberately not in v1

- **Messaging, at all.** A credible thread needs real time, read states, push and
  media upload — a month of work to be worse than WhatsApp, which coaches already
  have. Dropped entirely on 26 Sep 2026, tab included.
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
    badge, one line of copy on tap — while they are genuinely coming. A feature
    that is dropped (messaging, 26 Sep 2026) leaves the nav altogether.
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
16. **One visual grammar, on every target** (decided 25 Sep 2026, after the
    Ink Factory reference; applies to every feature from then on, coach web,
    client web, iOS and onboarding alike — the client's twins are `Kicker
    icon=…` / `ScreenHeader` on web and `SectionHeader` / `screenKicker` on iOS). Page and pane titles in capitals under a coloured
    kicker that carries the key figure (`PaneHead`); section titles with a
    large line icon (`SectionTitle`, icons in `components/Icon`); sub-menus
    are `SubNav` capsules; a filter with more than three choices is a
    dropdown (`LinkSelect` when it lives in the URL), not a row of chips;
    secondary page actions go in `ActionMenu`. Picking one of a handful of
    things — a settings part, a family, a destination — is a grid of big
    tiles (`components/Tiles.tsx`, 1 Oct 2026: client Réglages, Admin, Mon
    compte, the libraries and the movement picker on a phone), each tile
    opening its part on its own screen (`?partie=`); lists stay for data. Plain modules only for shared
    constants — a value exported from a `"use client"` file cannot be read
    by a server component.

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
