# Handoff: Masse — web app + native iOS

## Overview

Masse is coaching software for strength coaches who write a new programme for each
client every week. The finished product replaces the five tools coaching lives in today
— a spreadsheet, WhatsApp, notes, bank transfers, and the client's own training app.

**v1 is the web build of that whole loop**, with four honest simplifications:

- **Check-ins are typed by the coach.** She asks by WhatsApp, as she does today, and
  enters the answers. The client-submitted form comes later.
- **Cycle, sleep and steps are entered by hand.** No Apple Health or Health Connect —
  the web cannot read them anyway, and that is where platform review and legal
  exposure live.
- **Messaging is present but inert** — the tab stays, greyed, labelled `soon`.
- **Nutrition and billing are out**, with no placeholder.

The client is a real account with a real app from day one: she onboards through an
invite code, sees her week, and logs her sets. The native iOS client shares the same Supabase backend — see "Splitting the work
between the two clients" at the end for what belongs to which target.

---

## About the design files

The files in this bundle are **design references created in HTML**. They are
prototypes showing intended look and behaviour — **not production code to copy**.

`Masse.dc.html` is a single 8,000-line file that renders five platforms from one
component with a platform switch. It is deliberately not the architecture you want: it
exists so every screen can be seen and clicked side by side. **For this v1, only the
Mac and Web views matter** — switch the platform control at the top of the page.

**Your task is to recreate these designs across two real clients sharing one backend:**

| Target | Who it is for | Stack |
|--------|---------------|-------|
| **Web app** | The coach, plus any client on Android | Next.js (App Router) on Vercel |
| **Native iOS** | The client, primarily | SwiftUI, iOS 17+ |
| **Backend** | Both | Supabase — Postgres + Auth, EU region (Frankfurt) |

The backend is the contract between them. Build it first, then the two clients in
parallel. The iOS app talks to Supabase directly — there is no bespoke API layer in v1,
which is why row-level security has to be right (see Health data).

Styling: each platform's own idioms. The prototype's inline styles are an artefact of
the prototyping environment, not a recommendation — use Tailwind or CSS modules on web,
and native SwiftUI modifiers on iOS.

**Repository:** `kawakshgr/masse-app` (currently empty).

---

## Fidelity

**High-fidelity.** Colours, typography, spacing, radii and interaction states are final
and intentional. Recreate the coach's UI faithfully.

Two caveats:

1. **All demo data is fiction.** Six clients with their sleep histories, billing rows
   and check-ins are seeded constants that exist to make the screens legible. Do not
   port them.
2. **The prototype is bilingual (EN/FR) through a post-render DOM translation pass.
   Do not copy that mechanism** — it is a prototyping trick. Use `next-intl` or
   similar. The French copy itself is reviewed and correct, and can be lifted verbatim
   from the `FR_*` dictionaries in `Masse.dc.html`. **Build v1 in French first** — the
   first coaches are French-speaking.

---

## v1 scope

Everything the coach and the client need to run a week together. Three things are
present but filled in by hand for now, and one is present but inert.

### 1. Invite-code onboarding — nine steps

This is also the authentication system. A code is issued by the coach, used once, and
dies after 14 days. The nine steps are in `Onboarding.dc.html`:

1. Invite code (validated; a wrong code must fail honestly)
2. Goal — one focus
3. Height / bodyweight / birth year
4. Injuries to work around
5. Equipment available
6. Week shape — which days
7. Cycle tracking — opt-in, with the privacy promise stated plainly
8. Sleep on a normal night
9. Summary — **week 1 is already written**

Step 9 is the moment that sells the product. Her answers become her record: the coach
reads what she typed, not seeded data.

### 2. Roster — the coach's client list

Rows are **54px, uniform height**. Each row carries the client's name and, on the
second line, **the reason she needs the coach** (coral `--a3`) or her block label
otherwise — one line, ellipsised, full text in `title`. Clients needing attention get
an action chip that opens the tab which answers it.

The window subtitle is derived: `<n> clients need you · <m> check-ins to review`, both
counted from data with correct singular/plural. Never hardcode either number.

### 3. Programme editor — the coach's actual job

- A programme is a named block belonging to the coach; it has weeks, a week has up to
  seven days, a day has a session, a session has ordered exercises.
- An exercise carries a name, a scheme (`4 × 5 @ 82.5 kg`) and an optional cue.
- Exercises reorder within a day and move between days.
- A week can be **saved as a template** and **duplicated onto the next week**. This is
  the biggest time-saver and the reason a coach would switch.
- A week is **pushed** to selected clients. Pushing is always an explicit act — never a
  background sync — and it is the only moment anything becomes visible to a client.

### 4. Session logging — the client

The session, exercise by exercise. Each set is a row: target on the left, a log control
on the right. Logging a set starts a rest timer. **Offline is not an error state** — a
queued set is written locally, says so, and syncs when the connection returns.

### 5. Check-ins — entered by the coach in v1

The weekly check-in is four questions, three options each, plus a bodyweight and a free
note. **In v1 the coach fills it in**: she asks by WhatsApp, as she does today, and
types the answers into the client's Check-ins tab. The client-submitted form comes
later, and the schema is already shaped for it — only the author of the row changes.

### 6. Cycle — entered manually

No Health import. The client enters her period start date and her cycle length in her
app; the server derives phase and the load coefficient. **Symptom notes stay on her
device and are never sent** — there is no table for them.

### 7. Steps and sleep — entered manually

No Health import either. Three fields the client types. This defers the whole platform
permission surface and buys months of simplicity.

### 8. Messaging — present, inert

**Keep the tab. Render it greyed with a `soon` badge.** Clicking it does not navigate;
it reveals one line: messaging is in development, and until it ships WhatsApp stays
where it is.

This is a product decision. A credible thread needs real time, read states, push
notifications and media upload — roughly a month of work to end up worse than the tool
every coach already has. But hiding the tab entirely would misrepresent the product's
shape, so it stays visible and honest.

In the prototype this is driven by a single `SOON` array on the component, which greys
the Mac sidebar tab, the web tab bar and the iPad rail at once. Implement it the same
way: one list, not three hardcoded conditions.

### Explicitly not in v1

Nutrition (the coach writes targets as text in the programme), billing (a spreadsheet
suffices at this scale), Apple Health and Health Connect, and the messaging
implementation itself.

---

## Health data — architectural constraint, not a preference

Menstrual cycle data is **special-category health data** under GDPR Article 9. The
prototype makes three promises on screen. **The architecture must honour them:**

1. **Symptom notes never leave the client's device.** Local storage only, never sent to
   the server, no table. The client-facing copy says so explicitly. You cannot lose
   what you never hold.
2. **Period dates are stored — EU region only, minimal shape.** The server needs them
   to derive phase and scale the programme. Store the start date and the cycle length.
   Nothing else: no symptom, no mood, no pain score.
3. **The coach sees phase and adapted targets, never symptoms.** Enforce with
   row-level security, not in the UI layer.

Cycle tracking is **opt-in per client**, set at onboarding step 6 and revocable.
Clients with tracking off have no Cycle tab at all — absent, not disabled.

**Create the Supabase project in an EU region (Frankfurt) on day one.** Migrating a
production database between regions later is painful, and this database holds Article 9
data from the first client who opts in.

Keep `injuries` on the client record as plain text. It is health data in the broad
sense: do not build analytics on it, do not index it, do not send it anywhere.

---

## Data model

Minimal schema for v1. Postgres / Supabase. Tables the later phases will need are
listed at the end, commented — do not create them yet, but do not choose names that
collide with them.

```
coaches
  id            uuid, references auth.users
  name, first_name
  pronoun       'she' | 'he'
  created_at

invite_codes
  id            uuid
  coach_id      → coaches
  code          text        -- 'MERLET-4K2P', one use only
  state         'sent' | 'opened' | 'joined' | 'expired' | 'revoked'
  issued_at, expires_at     -- 14 days, hard expiry
  claimed_by    → clients   nullable, null until joined
  ask_cycle     bool        -- whether onboarding offers cycle tracking

clients
  id            uuid, references auth.users   -- the client IS an account
  coach_id      → coaches
  name, first_name, email, slug
  -- from onboarding: these ARE her record, not seeded data
  height_cm, birth_year
  start_weight_kg, start_weight_date
  goal          'Get stronger' | 'Build muscle' | 'Lean out' | 'Move better'
  injuries      text[]      -- programmed around
  equipment     text[]      -- gym | home rack | bands | bodyweight only
  session_days  int[]       -- 0=Mon … 6=Sun
  sleep_target_h numeric
  cycle_tracking bool       -- opt-in, revocable
  status        'active' | 'paused'
  created_at

programmes
  id            uuid
  coach_id      → coaches
  name          text        -- 'Upper / Lower — 4 day'
  is_template   bool
  created_at, updated_at

programme_weeks
  id            uuid
  programme_id  → programmes
  week_number   int
  UNIQUE (programme_id, week_number)

sessions
  id            uuid
  week_id       → programme_weeks
  day_index     int         -- 0=Mon … 6=Sun
  name          text        -- 'Lower — hinge focus'
  notes         text
  UNIQUE (week_id, day_index)

session_exercises
  id                uuid
  session_id        → sessions
  position          int
  name              text
  scheme            text    -- '4 × 5 @ 82.5 kg' — free text in v1
  target_sets, target_reps  int
  target_weight_kg  numeric
  cue               text

assignments                 -- the delivery boundary
  id            uuid
  client_id     → clients
  week_id       → programme_weeks
  start_date    date
  pushed_at     timestamptz nullable   -- null until the coach pushes it
  UNIQUE (client_id, week_id)

set_logs
  id                    uuid
  client_id             → clients
  session_exercise_id   → session_exercises
  set_index, reps       int
  weight_kg             numeric
  rpe                   int nullable
  logged_at             timestamptz
  synced_at             timestamptz nullable   -- null while queued offline

check_ins                   -- authored by the COACH in v1, by the client later
  id              uuid
  client_id       → clients
  week_start_date date
  feel            'Strong' | 'Steady' | 'Heavy'
  pain            'None' | 'Minor' | 'Need to talk'
  adherence       'All of it' | 'Most' | 'Struggled'
  bodyweight_kg   numeric
  note            text
  author          'coach' | 'client'     -- v1 writes 'coach'
  submitted_at    timestamptz
  reviewed_at     timestamptz nullable   -- null = waiting on the coach

cycle_logs                  -- EU region, dates only, NEVER symptoms
  id                  uuid
  client_id           → clients
  period_start_date   date
  cycle_length_days   int    -- her own figure, default 28
  logged_at           timestamptz

daily_metrics               -- manual entry in v1, no Health import
  id            uuid
  client_id     → clients
  day           date
  sleep_h       numeric nullable
  sleep_quality int nullable          -- 1 rough … 3 good
  steps         int nullable
  UNIQUE (client_id, day)
```

**Derived, never stored:**

- **Current phase** — from the latest `period_start_date` and `cycle_length_days`.
  Menstrual days 1–5, follicular 6–13, ovulatory 14–16, luteal 17–end.
- **Load coefficient** — menstrual −10%, follicular 0%, ovulatory +5%, luteal trims
  volume before intensity. Applied to `target_weight_kg` at read time so the coach can
  always override a row.
- **Sleep averages, adherence percentages, step totals** — always computed from their
  source rows.

**Row-level security from the start**, even with one user: every table filters on
`coach_id`, directly or through its parent. It costs one policy per table now and
prevents a data leak when the second coach signs up.

**Later phases — do not create yet:** `threads`, `messages` (messaging), `foods`,
`meals` (nutrition), `invoices` (billing).

---

## Screens

Only the coach's desktop views. In the prototype, switch the platform control to
**Mac** or **Web**.

### Layout shell

Three panes: sidebar nav | list | detail. Dividers are drag-resizable and persist their
position. On the web the same layout sits inside a browser window instead of a Mac
window — no other difference.

Sidebar in v1: **Clients**, **Programmes**. Nothing else. (The prototype shows Foods,
Inbox, Billing, Admin — all later.)

### Clients list

Rows are **54px, uniform height** — a ragged list reads as noise.

- 32px circular avatar, initials, `linear-gradient(140deg, --a1, --a2)`
- Two lines: name (13px / 700) and the block label (11px, `--ink2`), one line each with
  `text-overflow: ellipsis` and the full text in `title`
- A remove control at the right

The coral attention line and action chips are driven by real signals — a missed
session, a waiting check-in, short sleep. Compute them; never hardcode them.

### Client detail

One pane, not seven tabs: the record as typed, editable in place, plus the list of
programmes assigned to her with an export action per week.

### Programmes list

Programme name, week count, how many clients it is assigned to, and whether it is a
template.

### Programme editor — the screen that matters

- Week selector across the top; duplicate-week and save-as-template actions beside it.
- Seven day columns. Empty days are visibly empty and clickable to add a session.
- A session is a card: name, then ordered exercise rows.
- An exercise row: name, scheme, cue. Inline-editable. Drag handle for reordering.
- Drag an exercise between day columns.
- An assign control: pick clients, which writes `assignments` rows.
- An export control per week: text to clipboard, or PDF.

---

## Design tokens

Two themes. Dark values below; light values are in `Masse.dc.html` lines 19–60.

| Token | Dark | Light | Use |
|-------|------|-------|-----|
| `--bg` | `#05121b` | `#e7f2f3` | app background |
| `--deep` | `#020a10` | `#ffffff` | window shell |
| `--ink` | `#f3fcfb` | `#05202a` | primary text |
| `--ink2` | `ink @ 74%` | `ink @ 76%` | secondary text |
| `--ink3` | `ink @ 48%` | `ink @ 52%` | tertiary text |
| `--a1` | `#5fe3d2` | `#0a8579` | primary accent (teal) |
| `--a2` | `#9c86ff` | `#5636cf` | secondary accent (violet) |
| `--a3` | `#ff8069` | `#c9452f` | attention / coral |
| `--onA` | `#022b2a` | `#ffffff` | text on accent fills |

Glass surfaces are alpha + blur driven. For the web, use the **regular** level:
`--glass: rgba(255,255,255,.09)`, `--glass2: rgba(255,255,255,.17)`,
`--edge: rgba(255,255,255,.17)`, `backdrop-filter: blur(26px) saturate(165%)`.

**Corner radius — Mac / Web scale: 6 / 10 / 14 / 18.** Nothing in between. Chart bars
`5px 5px 2px 2px`; 4px tracks get 2px.

**Typography**

- Display / numerals: **Bricolage Grotesque** (400, 600, 800). At 800 with
  `letter-spacing: -.03em` to `-.05em`.
- UI / body: **Instrument Sans** (400, 500, 600, 700).
- `font-variant-numeric: tabular-nums` on every figure that changes.

**Elevation**

```
--spec: inset 0 1px 0 rgba(255,255,255,.26), inset 0 -1px 0 rgba(0,0,0,.22)
--lift: 0 16px 40px rgba(0,0,0,.32)
```

---

## Rules that came out of the design work

1. **Derive prose from data.** Any sentence stating a number must compute it from the
   same source the adjacent element reads. The prototype had four bugs where a written
   summary contradicted the figures beside it.
2. **Uniform row heights in lists.**
3. **Nothing is delivered automatically.** In v1 the coach exports and sends. Later, she
   pushes — and that push is always an explicit act, never a background sync.
4. **Empty states are designed, not blank.** No clients yet, no programmes yet, an
   empty day in a week: each says what to do next. The prototype has all three.
5. **One radius scale.** Do not invent intermediate values.

---

## Splitting the work between the two clients

**Web only** — these need a pointer, a keyboard and width:

- The **programme editor**: seven day columns, drag and drop between days, inline
  editing of every exercise row.
- The **roster** and the three-pane shell with resizable, position-persisting dividers.
- The **⌘K command palette**.
- The **check-in form the coach types into** (v1 only).

**iOS only** — these are why a native app is worth building at all:

- **Live Activity** for the running session: current exercise, sets done, rest
  countdown, on the lock screen and in the Dynamic Island. The web PWA cannot do this,
  and it is the single most-used surface for a client mid-session.
- **Local notifications** for rest timers.
- **Dynamic Type**: the client's screens reflow against the user's text size — they do
  not scale. The prototype demonstrates the real iOS range.
- **Offline set queue** in local storage, synced on reconnect.

**Both, from the same rows** — build once in each, never diverge the model:

- Invite-code onboarding (nine steps)
- Today, session logging, cycle entry, weekly check-in as read

**The Android client is the web PWA in v1.** The prototype's Android screens exist so
the eventual native app has a spec; do not build it yet. What the prototype settles for
that phase: an ongoing notification via foreground service rather than a Live Activity,
Material 3 radii (8/12/16/28), text buttons instead of iOS pills, and a left-aligned
status clock.

## Contracts the two clients must agree on

Decide these once, in the backend, or the clients will drift:

1. **`assignments.pushed_at`** is the only thing that makes a week visible to a client.
   Null means invisible. Neither client may read an unpushed week.
2. **Phase and load coefficient are computed server-side** (a Postgres function or a
   view), not in each client. Two implementations of the same arithmetic will disagree.
3. **`set_logs.synced_at`** null means the row exists only on the device. Both clients
   use the same convention so a coach sees the same "held" state whichever app the
   client uses.
4. **Programme structure stays relational.** Both clients decode the same
   `sessions` / `session_exercises` rows — no UI-shaped JSON blob.
5. **Symptom notes have no table.** Enforced by absence, not by policy.

## App Store notes for the iOS phase

- **No HealthKit entitlement in v1.** Cycle, sleep and steps are typed by hand. This
  keeps the submission simple and defers the health-data review entirely.
- Cycle tracking is opt-in and revocable; the privacy policy must say that symptom
  notes never leave the device, because the app says so on screen.
- The client app has no purchase flow: the coach bills her clients outside the app.
  There is nothing for StoreKit to do in v1.

## Files in this bundle

| File | What it is |
|------|-----------|
| `Masse.dc.html` | Five-platform prototype. **Switch to Mac or Web.** Design reference. |
| `Stratégie v1 web.dc.html` | Scope and stack reasoning. Written before this narrowing — the stack section holds, the scope section is superseded by this README. |
| `Onboarding.dc.html` | Client onboarding. Not in v1; reference for the iOS phase. |
| `ios-frame.jsx`, `android-frame.jsx`, `macos-window.jsx` | Device bezels, presentation only. Not part of the product. |
| `support.js`, `doc-page.js` | Prototyping runtime. Not part of the product. |

Open any `.dc.html` directly in a browser.

---

## Where to start

1. Open `Masse.dc.html`, switch to **Mac**, and click through **Clients** and
   **Programmes**. Ignore every other tab.
2. Scaffold Next.js + Supabase — **EU region, Frankfurt, from day one.**
3. Migrations and RLS policies for the five tables above.
4. Coach auth (magic link), then the client form, then the programme editor.
5. Week export to text and PDF. Without it, v1 does nothing for a real coach.
