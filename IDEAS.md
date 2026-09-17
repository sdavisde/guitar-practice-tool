# Ideas

Ways Triad Paths could get smarter at helping practice. Grouped by theme; each idea says what it
would build on in the codebase and where it stands. Status: **done**, **next** (agreed, not started),
**later** (worth doing, unscheduled), **maybe** (needs a rethink before it's worth it).

## Where the tool is today

The engine (`src/lib/engine.ts`) knows closed triads on three string sets, plans a path per phrase
with six movement strategies, detects repeated phrases, and imports Ultimate Guitar charts with
lyrics. The play page (`src/app/play`) steps through phrases by keyboard. The generator
(`src/lib/random-progression.ts`) makes practice progressions in a mood, shaped per section.
There is no tempo, no audio, no scale knowledge, and the capo is stored but ignored by the voicing
math. That shapes what "smarter" can mean.

## Smarter chord suggestions

- **Mood profiles for the generator.** _done_ — `MOODS` in `random-progression.ts`: pop, folk,
  worship, rock, soul and dark, each with its own transition table, home chord, cadence chords and
  colouring (sus, slash, sevenths). Borrowed chords (`b7`, `b6`, `b3`, `4m`) and secondary
  dominants (`2M`, `3M`, `6M`) came with it; the parser now accepts `b7`-style degree tokens.
- **Section-aware generation.** _done_ — `SECTIONS` in the same file: a verse loops at home, a
  pre-chorus leaves home and ends on a cadence, a chorus opens on home or the 4, a bridge starts
  somewhere new and turns back on a cadence. `randomSong` strings them together and gives each the
  movement that suits it (stay, climb, high, smooth). The "Random song" button uses it.
- **Default movement per section on import.** _next_ — when a chart comes in, a section named
  Chorus could default to Climb or High and a Verse to Stay, using the same table `SECTIONS`
  already holds, so an imported song plays with contrast before you touch anything.
- **Substitutions on a real song.** _later_ — for each chord in an imported chart, offer one or two
  substitutes with a one-line reason: the relative minor, a slash chord that walks the bass, a sus
  that delays the resolution, a secondary dominant before the next chord. The mood tables already
  encode which moves sound right; a substitution is a move the table likes that the chart didn't
  make. The triad engine can voice any of them immediately.
- **Upper-structure triads.** _later_ — playing a 3m triad over a 1 chord gives a maj7 sound; a 5
  triad over 4 gives a 4maj9. Suggest which triad to play over each chord for colour, rather than
  always the plain root triad. Fits the tool's triad focus exactly: it's the same shapes with a
  different label.
- **Mood on import.** _maybe_ — guess a song's mood from its chords (a lot of b7 says rock, sevenths
  say soul, a 6m home says dark) so substitutions and generated bridges match the song.

## Learning licks from songs

- **Scale boxes around each shape.** _later_ — every triad shape the path lands on is an anchor for a
  scale. Overlay the pentatonic or diatonic notes within a few frets of the chosen shape on the fret
  map (`FretMap` in `diagrams.tsx`), chord tones highlighted as target notes. The classic "play the
  triad, then decorate it" approach; the engine already has the tones and frets it needs.
- **Import tab lines, not just chords.** _later_ — the chart importer drops tab staff lines
  (`STAFF_RE` in `engine.ts`). Parse them instead into string and fret pairs, group them into licks
  per section, and place each lick on the fret map next to the triad it sits over. Any UG tab then
  says "here is the lick, and here is the shape it comes from."
- **Slide a lick to the current path.** _later_ — once a lick is positioned relative to a triad
  shape, transpose and move it to wherever the chosen path puts that chord. The same lick then works
  in a different key or on a different string set.
- **A lick library.** _later_ — save licks tagged by scale degree, string set and inversion. When a
  path lands on a matching shape, suggest a lick you already know that fits there.
- **Looping video.** _later_ — a YouTube embed with loop points and playback speed per section is
  still the most useful lick-learning tool, and sections already exist to hang it on.

## Practice mechanics

- **Tempo and auto-advance.** _later_ — bar marks already exist on imported charts (`Slot.bar`).
  Add a tempo, a Web Audio click, and let the play page advance phrases on time. A speed trainer
  that bumps the tempo each pass is the natural next step.
- **Hear the path.** _later_ — synthesize the triads (Web Audio oscillators are enough) so you can
  hear the voice leading the engine chose. A drone in the song key helps too.
- **Inversion drills.** _later_ — label each shape as root, first or second inversion (the
  `tones` order in a `Cand` already says which), and add exercises like "play this progression in
  all three inversions on strings 2 to 4." A quiz mode that hides the frets until you reveal them
  fits the same page.
- **Practice history.** _later_ — track which string sets, regions and shapes you've played, then
  point out gaps like never using strings 3 to 5 above fret 9.
- **Capo in the voicing math.** _later_ — the capo is stored on import (`SongMeta.capo`) but
  ignored. Offer to voice in the capo's shape key or in concert pitch.
- **Multiple saved songs and shareable URLs.** _later_ — there is one song in local storage
  (`use-song.ts`). A song list plus a state-in-URL link would make everything above more useful.
- **Microphone check.** _maybe_ — pitch-detect what you play and confirm the triad. Browser-only
  pitch tracking of three simultaneous notes is unreliable; single-note lick checking is more
  realistic if this is ever attempted.
