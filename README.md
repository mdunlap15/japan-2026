# Osaka → Tokyo — Japan 2026

A single-file trip app for Yulia, Elena & co: Osaka → Kyoto → Nara → Hiroshima →
Hakone → Tokyo, **Oct 26 – Nov 6, 2026**. Live at
https://mdunlap15.github.io/japan-2026/ (GitHub Pages).

Install it from Safari/Chrome ("Add to Home Screen") — it works offline once installed.

## What's inside

- **Fully bilingual** — the РУС/ENG button (top right) switches the whole app,
  every day page and booking card included, between English and properly
  written Russian; the choice is remembered per phone
- **Days** — the real itinerary, one page per day, with live weather per city
- **Map** — every spot pinned, filterable, "near me now" and "get me home"
- **Chat** — a trip concierge that knows the whole plan (English + Russian)
- **Plan** — the open decisions as a 3-person ballot (votes sync between phones)
- **Journal** — visited tracker, wine & sake journal, meals log with recipes
- **Bookings** — flights, stays, the JR Pass, seat reservations, calendar download
- **Toolkit** — menu decoder with speech, survival phrases, emergency cards

## The two optional hookups

Everything else is static and already live.

1. **Shared sync (Supabase)** — already configured in `config.js`. Votes, notes,
   expenses and the journal sync between all three phones in real time.
   Schema: `supabase/schema.sql` (shared table, rows scoped by `TRIP_ID`).
2. **Concierge (Railway)** — deploy the `japan-2026-concierge` repo on Railway,
   set `ANTHROPIC_API_KEY` + `TRIP_KEY=japan-2026`, generate a domain, and paste
   the URL into `config.js` → `CONCIERGE_URL`. Until then the Chat tab shows a
   setup card and the wine/meal photo features save offline stubs.

## Maintenance

- Run `npm test` (jsdom smoke test) before pushing; `npm run test:strict` also
  fails on any unfilled `@@PLACEHOLDER@@` token.
- Bump `CACHE` in `sw.js` whenever `trip.ics` or the icons change.
- All trip-specific content lives in the `TRIP DATA` script block and the
  `TRIP CONTENT` HTML region of `index.html` — the engine below them never
  needs to change.
