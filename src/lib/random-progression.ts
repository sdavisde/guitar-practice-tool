// Random practice material: diatonic (and lightly borrowed) progressions in a random major key,
// shaped by a mood (which chords, and how they move) and a section (where it starts, where it ends).

import { KEYS } from "./engine";

export type Rng = () => number;

/**
 * Scale-degree chords the generator can pick from. "2M", "3M" and "6M" are the secondary
 * dominants (V/V, V/vi, V/ii); "b3", "b6", "b7" and "4m" are borrowed from the parallel minor.
 */
export type Degree = "1" | "2m" | "3m" | "4" | "5" | "6m" | "2M" | "3M" | "6M" | "4m" | "b3" | "b6" | "b7";

type Weights<T extends string> = Partial<Record<T, number>>;
type Table = Partial<Record<Degree, Weights<Degree>>>;

// ---- moods ----

export type MoodId = "pop" | "folk" | "worship" | "rock" | "soul" | "dark";

type Color = { token: string; chance: number };

export interface Mood {
  id: MoodId;
  name: string;
  blurb: string;
  /** The chord the mood resolves to: the 1, or the 6m for a minor-feeling mood. */
  home: Degree;
  /** How often one chord moves to another in this style; a missing pair never happens. */
  next: Table;
  /** Where a loop tends to open. */
  start: Weights<Degree>;
  /** Chords that pull back to `home`: where a pre-chorus or bridge wants to end. */
  cadence: Degree[];
  /** Ways to dress up the chord at `i`, given its neighbours (the progression loops, so they wrap). */
  colors: (chords: Degree[], i: number) => Color[];
  /** At most this many dressed-up chords per progression length, so it still reads as harmony. */
  maxColors: Record<number, number>;
}

const slashable = (i: number) => i > 0; // Opening on a slash chord blurs the key.

/**
 * Slash chords only where the bass then moves by step: 1/3 walking to 4 or down to 2m,
 * 5/7 leading up to 1 or down the 1–7–6 line, 6m/5 on the way down to 4, and 1/5 before
 * the 5 of a cadence. Sus chords go on the major chords (and 2) as colour.
 */
function popColors(chords: Degree[], i: number): Color[] {
  const n = chords.length;
  const [prev, here, next] = [chords[(i - 1 + n) % n], chords[i], chords[(i + 1) % n]];
  const slash = slashable(i);
  const out: Color[] = [];
  if (here === "1") {
    if (slash && (next === "4" || next === "2m")) out.push({ token: "1/3", chance: 0.4 });
    if (slash && next === "5" && (prev === "4" || prev === "2m")) out.push({ token: "1/5", chance: 0.25 });
    out.push({ token: "1sus2", chance: 0.06 }, { token: "1sus4", chance: 0.05 });
  }
  if (here === "5") {
    if (slash && (next === "1" || (next === "6m" && prev === "1"))) out.push({ token: "5/7", chance: 0.4 });
    out.push({ token: "5sus4", chance: 0.12 });
  }
  if (here === "6m" && slash && next === "4" && (prev === "1" || prev === "5")) out.push({ token: "6m/5", chance: 0.3 });
  if (here === "4") out.push({ token: "4sus2", chance: 0.12 });
  if (here === "2m") out.push({ token: "2sus4", chance: 0.08 });
  return out;
}

/** Campfire strumming: the 1, 4 and 5 do most of the work; sus chords hang on the open shapes. */
function folkColors(chords: Degree[], i: number): Color[] {
  const n = chords.length;
  const [here, next] = [chords[i], chords[(i + 1) % n]];
  const out: Color[] = [];
  if (here === "1") {
    if (slashable(i) && (next === "4" || next === "2m")) out.push({ token: "1/3", chance: 0.3 });
    out.push({ token: "1sus4", chance: 0.12 }, { token: "1sus2", chance: 0.08 });
  }
  if (here === "5") {
    if (slashable(i) && next === "1") out.push({ token: "5/7", chance: 0.3 });
    out.push({ token: "5sus4", chance: 0.2 });
  }
  if (here === "4") out.push({ token: "4sus2", chance: 0.2 });
  return out;
}

/** Big open sus2 voicings and walking bass lines: the chords ring, the bass moves. */
function worshipColors(chords: Degree[], i: number): Color[] {
  const n = chords.length;
  const [prev, here, next] = [chords[(i - 1 + n) % n], chords[i], chords[(i + 1) % n]];
  const slash = slashable(i);
  const out: Color[] = [];
  if (here === "1") {
    if (slash && (next === "4" || next === "2m")) out.push({ token: "1/3", chance: 0.45 });
    if (slash && next === "5" && prev === "4") out.push({ token: "1/5", chance: 0.3 });
    out.push({ token: "1sus2", chance: 0.2 });
  }
  if (here === "5") {
    if (slash && (next === "1" || next === "6m")) out.push({ token: "5/7", chance: 0.4 });
    out.push({ token: "5sus4", chance: 0.25 });
  }
  if (here === "6m" && slash && next === "4") out.push({ token: "6m/5", chance: 0.35 });
  if (here === "4") out.push({ token: "4sus2", chance: 0.35 });
  if (here === "2m") out.push({ token: "2sus4", chance: 0.15 });
  return out;
}

/** Dominant sevenths on the 1, 4 and 5 (the blues shell) and a sus4 hanging before the 1. */
function rockColors(chords: Degree[], i: number): Color[] {
  const n = chords.length;
  const [here, next] = [chords[i], chords[(i + 1) % n]];
  const out: Color[] = [];
  if (here === "1") out.push({ token: "17", chance: 0.2 }, { token: "1sus4", chance: 0.12 });
  if (here === "4") out.push({ token: "47", chance: 0.2 });
  if (here === "5") out.push({ token: "57", chance: 0.3 }, { token: "5sus4", chance: 0.15 });
  if (here === "b7" && next === "1") out.push({ token: "b7sus4", chance: 0.1 });
  return out;
}

/** Sevenths nearly everywhere: maj7 on the 1 and 4, m7 on the minors, 7 on anything acting as a V. */
function soulColors(chords: Degree[], i: number): Color[] {
  const here = chords[i];
  const SEVENTHS: Partial<Record<Degree, Color>> = {
    "1": { token: "1maj7", chance: 0.6 },
    "4": { token: "4maj7", chance: 0.6 },
    "2m": { token: "2m7", chance: 0.7 },
    "3m": { token: "3m7", chance: 0.6 },
    "6m": { token: "6m7", chance: 0.6 },
    "4m": { token: "4m7", chance: 0.5 },
    "5": { token: "57", chance: 0.7 },
    "2M": { token: "27", chance: 0.8 },
    "3M": { token: "37", chance: 0.8 },
    "6M": { token: "67", chance: 0.8 },
  };
  const c = SEVENTHS[here];
  return c ? [c] : [];
}

/** Minor-key colour: the raised-seventh V7 (the 3M), sus chords on the 4 and 5, a 6m/5 walk-down. */
function darkColors(chords: Degree[], i: number): Color[] {
  const n = chords.length;
  const [here, next] = [chords[i], chords[(i + 1) % n]];
  const out: Color[] = [];
  if (here === "3M") out.push({ token: "37", chance: 0.5 });
  if (here === "6m") {
    if (slashable(i) && next === "4") out.push({ token: "6m/5", chance: 0.3 });
    out.push({ token: "6m7", chance: 0.1 });
  }
  if (here === "4") out.push({ token: "4sus2", chance: 0.2 });
  if (here === "5") out.push({ token: "5sus4", chance: 0.2 });
  if (here === "1" && slashable(i) && next === "2m") out.push({ token: "1/3", chance: 0.3 });
  return out;
}

export const MOODS: Mood[] = [
  {
    id: "pop", name: "Pop", blurb: "Everyday pop, rock and folk harmony: the six diatonic chords, moving the way they usually do.",
    home: "1",
    next: {
      "1":  { "4": 5, "5": 5, "6m": 4, "2m": 2, "3m": 1 },
      "2m": { "5": 6, "4": 2, "6m": 1, "1": 1 },
      "3m": { "6m": 5, "4": 4, "2m": 1 },
      "4":  { "1": 4, "5": 5, "6m": 2, "2m": 2 },
      "5":  { "1": 5, "6m": 4, "4": 3 },
      "6m": { "4": 5, "2m": 3, "5": 3, "1": 1, "3m": 1 },
    },
    start: { "1": 5, "6m": 2, "4": 2, "2m": 1 },
    cadence: ["5", "4"],
    colors: popColors, maxColors: { 4: 1, 8: 3 },
  },
  {
    id: "folk", name: "Folk", blurb: "Campfire chords: 1, 4 and 5 carry the song, a 6m for the sad verse, the odd b7 for a country turn.",
    home: "1",
    next: {
      "1":  { "4": 6, "5": 5, "6m": 2, "2m": 1, "b7": 1 },
      "2m": { "5": 5, "4": 2, "1": 1 },
      "4":  { "1": 6, "5": 4, "6m": 1, "2m": 1 },
      "5":  { "1": 6, "4": 3, "6m": 2 },
      "6m": { "4": 4, "5": 3, "1": 2, "2m": 1 },
      "b7": { "4": 4, "1": 3, "5": 1 },
    },
    start: { "1": 6, "4": 2, "6m": 1 },
    cadence: ["5", "4"],
    colors: folkColors, maxColors: { 4: 1, 8: 3 },
  },
  {
    id: "worship", name: "Worship", blurb: "Anthemic loops of 1, 5, 6m and 4 with sus2 colour and a bass that walks between them.",
    home: "1",
    next: {
      "1":  { "5": 6, "4": 4, "6m": 4, "2m": 2 },
      "2m": { "4": 3, "5": 3, "1": 2, "6m": 1 },
      "4":  { "1": 5, "5": 4, "6m": 3, "2m": 1 },
      "5":  { "6m": 5, "1": 4, "4": 3 },
      "6m": { "4": 6, "5": 2, "1": 2, "2m": 2 },
    },
    start: { "1": 5, "6m": 3, "4": 2 },
    cadence: ["5", "4"],
    colors: worshipColors, maxColors: { 4: 2, 8: 4 },
  },
  {
    id: "rock", name: "Rock", blurb: "Mixolydian and blues rock: the b7 and b3 next to the 1, 4 and 5, with dominant sevenths.",
    home: "1",
    next: {
      "1":  { "b7": 5, "4": 5, "5": 3, "b3": 2, "6m": 1, "b6": 1 },
      "4":  { "1": 5, "b7": 3, "5": 3, "b3": 1 },
      "5":  { "4": 4, "1": 4, "b7": 2 },
      "6m": { "4": 3, "b7": 2, "5": 2, "1": 1 },
      "b7": { "4": 5, "1": 4, "5": 1, "b6": 1 },
      "b3": { "4": 4, "b7": 2, "1": 2 },
      "b6": { "b7": 5, "5": 1, "1": 1 },
    },
    start: { "1": 6, "4": 1, "6m": 1 },
    cadence: ["5", "b7", "4"],
    colors: rockColors, maxColors: { 4: 2, 8: 3 },
  },
  {
    id: "soul", name: "Soul", blurb: "Soul and jazz-pop: ii–V–I turns, secondary dominants and a borrowed 4m, in sevenths.",
    home: "1",
    next: {
      "1":  { "6m": 4, "4": 4, "3m": 3, "2m": 3, "6M": 1, "3M": 1 },
      "2m": { "5": 7, "3m": 1, "4": 1 },
      "3m": { "6m": 4, "2m": 3, "4": 2, "6M": 1 },
      "4":  { "3m": 3, "5": 3, "1": 3, "2m": 2, "4m": 2 },
      "4m": { "1": 5, "3m": 2, "5": 1 },
      "5":  { "1": 6, "3m": 2, "6m": 2 },
      "6m": { "2m": 5, "4": 2, "5": 2, "3m": 1, "2M": 1 },
      "2M": { "5": 5, "2m": 2 },
      "3M": { "6m": 6 },
      "6M": { "2m": 6 },
    },
    start: { "1": 5, "6m": 2, "2m": 2, "4": 1 },
    cadence: ["5", "4m"],
    colors: soulColors, maxColors: { 4: 3, 8: 6 },
  },
  {
    id: "dark", name: "Dark", blurb: "Minor-key brooding: the song lives on the 6m, with the 3M as its raised-seventh dominant.",
    home: "6m",
    next: {
      "6m": { "4": 5, "5": 3, "1": 2, "3m": 2, "2m": 2, "3M": 1 },
      "4":  { "5": 4, "6m": 3, "1": 3, "2m": 1, "3M": 1 },
      "5":  { "6m": 6, "4": 2, "1": 1 },
      "1":  { "5": 4, "4": 3, "6m": 2, "3m": 1 },
      "3m": { "4": 4, "6m": 3, "2m": 1 },
      "2m": { "3M": 3, "6m": 3, "5": 2, "4": 1 },
      "3M": { "6m": 7, "4": 1 },
    },
    start: { "6m": 6, "4": 1, "2m": 1 },
    cadence: ["5", "3M", "4"],
    colors: darkColors, maxColors: { 4: 1, 8: 3 },
  },
];

export const DEFAULT_MOOD: MoodId = "pop";
export const moodById = (id: MoodId): Mood => MOODS.find((m) => m.id === id) ?? MOODS[0];

// ---- sections ----

export type SectionKind = "verse" | "prechorus" | "chorus" | "bridge";

/** How a song section shapes the chords it gets: where it opens, how it ends, how it's played. */
export interface SectionProfile {
  id: SectionKind;
  name: string;
  blurb: string;
  /** Chords the section may open on, as a reweighting of the mood's own start weights; 0 forbids. */
  start: (mood: Mood) => Weights<Degree>;
  /** "loop": ends so it can start over; "cadence": ends on a chord that pulls home, ready for the next section. */
  ending: "loop" | "cadence";
  /** Chance of the longer 8-chord form. */
  long: number;
  /** The movement the section is played with; leave unset to keep the app's default. */
  strategyId?: string;
}

export const SECTIONS: SectionProfile[] = [
  {
    id: "verse", name: "Verse", blurb: "Sits at home and loops, so the words can carry it.",
    start: (mood) => mood.start, ending: "loop", long: 0.35, strategyId: "stay",
  },
  {
    id: "prechorus", name: "Pre-chorus", blurb: "Leaves home and climbs, ending on a chord that leans into the chorus.",
    start: (mood) => away(mood, { "2m": 4, "4": 4, "6m": 2, "3m": 1, "b6": 1, "b7": 1 }),
    ending: "cadence", long: 0, strategyId: "climb",
  },
  {
    id: "chorus", name: "Chorus", blurb: "Opens on the home chord or the 4, bright and high on the neck.",
    start: (mood) => ({ [mood.home]: 5, "4": 3, ...(mood.home === "1" ? { "6m": 1 } : {}) }),
    ending: "loop", long: 0.5, strategyId: "high",
  },
  {
    id: "bridge", name: "Bridge", blurb: "Goes somewhere new, borrowed chords welcome, then turns back home on a cadence.",
    start: (mood) => away(mood, { "4": 4, "6m": 3, "2m": 2, "b6": 3, "b7": 2, "4m": 2, "3M": 1, "b3": 1 }),
    ending: "cadence", long: 0.3, strategyId: "smooth",
  },
];

export const sectionById = (id: SectionKind): SectionProfile => SECTIONS.find((s) => s.id === id) ?? SECTIONS[0];

/** Openers the mood actually uses, home excluded, so a pre-chorus or bridge starts somewhere else. */
function away(mood: Mood, prefer: Weights<Degree>): Weights<Degree> {
  const out: Weights<Degree> = {};
  for (const [d, w] of Object.entries(prefer) as [Degree, number][]) {
    if (d !== mood.home && mood.next[d]) out[d] = w;
  }
  return out;
}

// ---- generation ----

function pick<T extends string>(weights: Weights<T>, rng: Rng): T {
  const entries = (Object.entries(weights) as [T, number][]).filter(([, w]) => w > 0);
  let r = rng() * entries.reduce((sum, [, w]) => sum + w, 0);
  for (const [value, w] of entries) if ((r -= w) < 0) return value;
  return entries[entries.length - 1][0];
}

const flows = (mood: Mood, from: Degree, to: Degree) => !!mood.next[from]?.[to];

function walk(mood: Mood, start: Degree, length: number, rng: Rng): Degree[] {
  const out = [start];
  while (out.length < length) out.push(pick(mood.next[out[out.length - 1]] ?? { [mood.home]: 1 }, rng));
  return out;
}

/** A loop that sounds like the key: moves well chord to chord and back to the top, visits home, and isn't just two chords. */
function isGoodLoop(mood: Mood, chords: Degree[]): boolean {
  return flows(mood, chords[chords.length - 1], chords[0]) && chords.includes(mood.home) && new Set(chords).size >= 3;
}

/** Two chords trading back and forth ("4 5 4 5") — filler, not a progression. */
const pingPong = (c: Degree[]) => c.some((x, i) => i >= 3 && x === c[i - 2] && c[i - 1] === c[i - 3]);

/** A 4-chord loop, or an 8-chord one: the loop, then an answer that keeps its first half and takes a new turn. */
function loopSkeleton(mood: Mood, start: Weights<Degree>, long: number, rng: Rng): Degree[] {
  for (;;) {
    const loop = walk(mood, pick(start, rng), 4, rng);
    if (rng() >= long) {
      if (isGoodLoop(mood, loop)) return loop;
      continue;
    }
    const answer = walk(mood, loop[1], 3, rng);
    const full = [...loop, loop[0], ...answer];
    const turnsHome = flows(mood, answer[2], mood.home) && answer[2] !== mood.home;
    if (flows(mood, loop[3], loop[0]) && isGoodLoop(mood, full) && turnsHome && !pingPong(full) && answer.join() !== loop.slice(1).join()) return full;
  }
}

/** A run that starts away from home and lands on a cadence chord, ready to hand over to the next section. */
function cadenceSkeleton(mood: Mood, start: Weights<Degree>, long: number, rng: Rng): Degree[] {
  const length = rng() < long ? 8 : 4;
  for (;;) {
    const run = walk(mood, pick(start, rng), length, rng);
    const last = run[run.length - 1];
    if (!mood.cadence.includes(last) || !flows(mood, last, mood.home)) continue;
    if (new Set(run).size < 3 || pingPong(run)) continue;
    // Landing home in the middle of a 4-chord run undoes the tension; a longer run may pass through it.
    if (length === 4 && run.slice(1, -1).includes(mood.home)) continue;
    return run;
  }
}

function dress(mood: Mood, chords: Degree[], rng: Rng): string[] {
  const tokens: string[] = [...chords];
  let budget = mood.maxColors[chords.length] ?? 1;
  // Visit chords in random order so the budget doesn't always go to the first ones.
  const order = chords.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (const i of order) {
    if (!budget) break;
    const hit = mood.colors(chords, i).find((c) => rng() < c.chance);
    if (hit) { tokens[i] = hit.token; budget--; }
  }
  return tokens;
}

export interface ProgressionOpts { mood?: MoodId; section?: SectionKind }

/**
 * A progression in scale degrees ("1 5/7 6m 4sus2"), so any key works: a skeleton shaped by
 * the mood's transitions and the section's opening and ending, then a little colour where it fits.
 * Defaults to a pop verse: a loop that sits at home.
 */
export function randomProgression(rng: Rng = Math.random, opts: ProgressionOpts = {}): string[] {
  const mood = moodById(opts.mood ?? DEFAULT_MOOD);
  const section = sectionById(opts.section ?? "verse");
  const start = section.start(mood);
  const chords = section.ending === "loop"
    ? loopSkeleton(mood, start, section.long, rng)
    : cadenceSkeleton(mood, start, section.long, rng);
  return dress(mood, chords, rng);
}

export interface RandomSection { name: string; tokens: string[]; strategyId?: string }

/**
 * A whole song's worth of sections in one mood: a verse and a chorus always, a pre-chorus and
 * a bridge often, each with the movement that suits it.
 */
export function randomSong(mood: MoodId, rng: Rng = Math.random): RandomSection[] {
  const kinds: SectionKind[] = ["verse"];
  if (rng() < 0.55) kinds.push("prechorus");
  kinds.push("chorus");
  if (rng() < 0.7) kinds.push("bridge");
  return kinds.map((kind) => {
    const profile = sectionById(kind);
    const section: RandomSection = { name: profile.name, tokens: randomProgression(rng, { mood, section: kind }) };
    if (profile.strategyId) section.strategyId = profile.strategyId;
    return section;
  });
}

/** Any major key but the current one, so every roll visibly changes something. */
export function randomKey(current?: string, rng: Rng = Math.random): string {
  const pool = KEYS.filter((k) => k !== current);
  return pool[Math.floor(rng() * pool.length)];
}
