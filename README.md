# Triad Paths

Many ways to play any Nashville-number progression as three-note triad shapes on guitar.
Next.js (static export) + Tailwind + shadcn-style components. No server, no database — everything runs in the browser.

## Run locally
    npm install
    npm run dev

## Deploy to Vercel
Option A (recommended): push this folder to a GitHub repo, then import the repo at vercel.com/new.
Vercel auto-detects Next.js; every git push becomes a deployment.

Option B: from this folder run `npx vercel` (then `npx vercel --prod`).

The build is a fully static export (`output: "export"`), so pages are pre-rendered and load instantly.

## Structure
- `src/lib/engine.ts` — chords, voicings, path strategies, chart import (pure logic, no UI)
- `src/components/diagrams.tsx` — chord diagram + neck strip SVGs
- `src/components/section-card.tsx` — one song section: strategy pills, re-roll, path display
- `src/components/ui/` — shadcn-style primitives (Button, Dialog, ToggleGroup, ...)
- `src/app/page.tsx` — key picker, progression input, chart import, section list
