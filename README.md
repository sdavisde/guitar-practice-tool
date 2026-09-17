# Triad Paths

Many ways to play any Nashville-number progression as three-note triad shapes on guitar.
Next.js + Tailwind + shadcn-style components. No database — the song lives in the browser. The only server code is
two route handlers that fetch and parse Ultimate Guitar pages for the "Search Ultimate Guitar" import.

## Run locally
    npm install
    npm run dev

## Deploy to Vercel
Option A (recommended): push this folder to a GitHub repo, then import the repo at vercel.com/new.
Vercel auto-detects Next.js; every git push becomes a deployment.

Option B: from this folder run `npx vercel` (then `npx vercel --prod`).

The page is pre-rendered, but the app is no longer a static export: the Ultimate Guitar import needs the
`/api/ug/search` and `/api/ug/tab` route handlers, which run on a Node runtime. Vercel handles this automatically.

## Test
    npm test          # engine unit tests (vitest)
    npm run typecheck

## Structure
- `src/lib/engine.ts` — chords, voicings, path strategies, phrase detection, chart import (pure logic, no UI)
- `src/lib/engine.test.ts` — tests for detection, the path search, and import
- `src/lib/random-progression.ts` — the Randomize buttons: mood profiles (which chords, how they move) and section
  profiles (where a verse, pre-chorus, chorus or bridge opens and ends), plus `randomSong` to string them together
- `src/lib/use-song.ts` — song state: sections, phrases, persistence (localStorage, v2 with a v1 migration)
- `src/components/diagrams.tsx` — chord diagram + fretboard map SVGs
- `src/components/section-sheet.tsx` — one song section: movement chips, repeat mode, one path per phrase
- `src/components/ui/` — shadcn-style primitives (Button, Dialog, ToggleGroup, ...)
- `src/app/page.tsx` — key picker, progression input, chart import, section list

## Progressions
Type Nashville numbers (`1 5 6m 4`, `2m7`, `5/7`) or chord names (`G D Em C`). Chromatic degrees are written with
the accidental first and are major unless a suffix says otherwise: `b7`, `b6`, `b3`, `#4`, `4m`, `b7sus4`.
Secondary dominants are the major chord on a minor degree: `2M`, `3M`, `6M` (or `27`, `37`, `67` as sevenths).

**Randomize** rolls one loop in the chosen mood (pop, folk, worship, rock, soul, dark) in a random key; **Random
song** rolls a verse, a chorus, and often a pre-chorus and a bridge, each shaped by its role (a pre-chorus leaves
home and ends on a cadence, a chorus opens on home or the 4) and played with a matching movement.

## The phrase model
A **section** (verse, chorus, ...) holds **phrases**; each phrase holds **slots**, one per chord token.
A path through the fretboard is chosen per phrase, not per section, so a chorus that plays 4-5-6m-1
three times gets three short paths instead of one twelve-chord path that has to climb forever.

- `detectPhrases` finds the progression a section repeats: it tries every 2–8 chord template, matches
  it as a subsequence (up to two passing chords between template chords, one truncated or one-chord-short
  occurrence allowed at the end), and keeps the reading that carries the most chords in the template
  itself. Consecutive repeats of a chord count as one chord unless a bar line separates them.
- Slots have a **role**: `structural` chords obey the movement's hard rule (climb, descend); `passing`
  chords are exempt and just stay near their neighbours. Chords between or around occurrences become
  passing chords of the neighbouring phrase, or their own phrase when there are more than two in a row.
- Phrases that instance the same template share a `patternId`. The section's **Repeats** setting plays
  them with the first occurrence's shapes (`same`) or pushes each one away from the last (`vary`).
- Cutting a phrase with the scissors or joining it with the previous one marks it `manual`; a retype that
  keeps the chord count keeps manual boundaries, anything else is detected again. "Re-detect phrases"
  discards manual cuts.
- Chart import keeps bar lines (`|`), `%` (repeat the previous bar) and a trailing `x2`, and marks the
  first chord of each bar; a phrase boundary on a bar line ranks higher during detection.
