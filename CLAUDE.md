# Masse — v1 web

Coaching software for strength coaches. **v1 is the web app only**; iOS follows,
sharing the same Supabase backend.

Full design handoff: `README.md` (scope, data model, screens, tokens).
Design reference: `Masse.dc.html` — switch the platform control to **Mac** or **Web**
for the coach, **iPhone** for the client.

## Stack

- Next.js (App Router) on Vercel
- Supabase — Postgres + Auth, **EU region (Frankfurt), from day one**
- PWA for the client in v1; native iOS after
- French UI first (`next-intl`); English second

## In v1

- **Invite-code onboarding** — nine steps, ends with week 1 written. Carries auth.
- **Roster** — the coach's client list, with the reason each client needs her.
- **Programme editor** — weeks, seven day columns, sessions, ordered exercises, drag
  between days, duplicate week, save as template, assign to clients.
- **Session logging** — the client logs her sets; offline-first.
- **Check-ins** — **entered by the coach in v1.** She asks by WhatsApp and types the
  answers in. The client-submitted form comes later.
- **Cycle** — **entered manually**, no Health import. Period start date + cycle length
  → phase → load coefficient.
- **Steps and sleep** — **entered manually**, no Health import.
- **Messaging** — tab present, **inert**, labelled `soon`. See below.

## Deliberately not in v1

- **Messaging implementation.** The tab renders greyed with a `soon` badge and a line
  of copy explaining that WhatsApp stays where it is. This is a product decision, not
  an oversight: a credible thread needs real time, read states, push and media upload —
  a month of work to be worse than the tool coaches already have. Keep the tab so the
  shape of the product is honest about what is coming.
- **Nutrition** — the coach writes targets as text in the programme.
- **Billing** — a spreadsheet suffices at this scale.
- **Apple Health / Health Connect** — the web cannot read them, and that is where
  platform review and legal exposure live. Manual entry instead.

## Ground rules

Each came out of a design decision or an audit. Not style preferences.

1. **EU region on day one.** The database holds special-category health data (cycle
   dates) under GDPR Art. 9. Migrating regions later is painful.
2. **Symptom notes never reach the server.** No table, ever. Local to the client's
   device. The app promises this on screen.
3. **Cycle data is dates only** — period start, cycle length. No symptom, mood or pain
   score. Phase and load coefficient are derived at read time, never stored.
4. **RLS on every table.** A coach reads only her clients; a client reads only her own
   rows. Enforce at the database, not in the UI.
5. **Derive prose from data.** Any sentence stating a number computes it from the same
   source the adjacent chart reads. The prototype had four bugs where a written summary
   contradicted the figures beside it.
6. **Offline is a state, not an error.** Sets are written locally, labelled as held,
   and synced on reconnect — with correct singular/plural in both languages.
7. **Today is reported, never judged.** A day in progress gets a neutral treatment,
   never a pass/fail colour.
8. **Nothing is delivered automatically.** Pushing a week to a client is an explicit
   act by the coach.
9. **Uniform row heights in lists.** A ragged list reads as noise.
10. **Empty states are designed, not blank** — no clients, no programmes, an empty day,
    nothing logged today. The prototype has all of them.
11. **One radius scale per family.** Mac/Web 6/10/14/18; iOS 12/16/20/26; chart bars
    `5px 5px 2px 2px`. Nothing in between.
12. **Do not copy the prototype's DOM-translation mechanism.** Use `next-intl`. The
    French copy in the `FR_*` dictionaries is reviewed and can be lifted verbatim.

## Unimplemented features in the UI

The pattern for anything deferred: **keep the navigation entry, render it inert.**

- Greyed label (`--ink3`), badge reading `soon` in `--a2`, `cursor: default`.
- Clicking it does not navigate; it reveals one line saying what is missing and what to
  do meanwhile.
- In the prototype this is the `SOON` array on the component — a single list drives the
  sidebar, the tab bar and the iPad rail.

## Tables in v1

`coaches`, `invite_codes`, `clients`, `programmes`, `programme_weeks`, `sessions`,
`session_exercises`, `assignments`, `set_logs`, `check_ins`, `cycle_logs`.

Do not create yet: `threads`, `messages`, `foods`, `meals`, `invoices`.

## Commands

```bash
npm run dev
npx supabase start
npm run build
```
