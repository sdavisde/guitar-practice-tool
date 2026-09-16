// Random practice material: a diatonic progression in a random major key.

import { KEYS } from "./engine";

export type Rng = () => number;

type Degree = "1" | "2m" | "3m" | "4" | "5" | "6m";

/**
 * How often one diatonic chord moves to another in everyday pop/rock/folk harmony.
 * Missing pairs are moves that sound aimless, so they never happen.
 */
const NEXT: Record<Degree, Partial<Record<Degree, number>>> = {
  "1":  { "4": 5, "5": 5, "6m": 4, "2m": 2, "3m": 1 },
  "2m": { "5": 6, "4": 2, "6m": 1, "1": 1 },
  "3m": { "6m": 5, "4": 4, "2m": 1 },
  "4":  { "1": 4, "5": 5, "6m": 2, "2m": 2 },
  "5":  { "1": 5, "6m": 4, "4": 3 },
  "6m": { "4": 5, "2m": 3, "5": 3, "1": 1, "3m": 1 },
};

const START: Partial<Record<Degree, number>> = { "1": 5, "6m": 2, "4": 2, "2m": 1 };

function pick<T extends string>(weights: Partial<Record<T, number>>, rng: Rng): T {
  const entries = Object.entries(weights) as [T, number][];
  let r = rng() * entries.reduce((sum, [, w]) => sum + w, 0);
  for (const [value, w] of entries) if ((r -= w) < 0) return value;
  return entries[entries.length - 1][0];
}

const flows = (from: Degree, to: Degree) => !!NEXT[from][to];

function walk(start: Degree, length: number, rng: Rng): Degree[] {
  const out = [start];
  while (out.length < length) out.push(pick(NEXT[out[out.length - 1]], rng));
  return out;
}

/** A loop that sounds like a key: moves well chord to chord and back to the top, has the 1, and isn't just two chords. */
function isGoodLoop(chords: Degree[]): boolean {
  return flows(chords[chords.length - 1], chords[0]) && chords.includes("1") && new Set(chords).size >= 3;
}

/** A 4-chord loop, or sometimes 8 chords: the loop, then an answer that keeps its first half and takes a new turn. */
function skeleton(rng: Rng): Degree[] {
  for (;;) {
    const start = pick(START, rng);
    const loop = walk(start, 4, rng);
    if (rng() < 0.65) {
      if (isGoodLoop(loop)) return loop;
      continue;
    }
    const answer = walk(loop[1], 3, rng);
    const full = [...loop, loop[0], ...answer];
    const pingPong = full.some((c, i) => i >= 3 && c === full[i - 2] && full[i - 1] === full[i - 3]);
    const turnsHome = answer[2] === "4" || answer[2] === "5" || answer[2] === "2m";
    if (flows(loop[3], loop[0]) && isGoodLoop(full) && turnsHome && !pingPong && answer.join() !== loop.slice(1).join()) return full;
  }
}

type Color = { token: string; chance: number };

/**
 * Ways to dress up the chord at `i`, given its neighbors (the progression loops, so they wrap).
 * Slash chords only where the bass then moves by step: 1/3 walking to 4 or down to 2m,
 * 5/7 leading up to 1 or down the 1–7–6 line, 6m/5 on the way down to 4, and 1/5 before
 * the 5 of a cadence. Sus chords go on the major chords (and 2) as color.
 */
function colors(chords: Degree[], i: number): Color[] {
  const n = chords.length;
  const [prev, here, next] = [chords[(i - 1 + n) % n], chords[i], chords[(i + 1) % n]];
  const slash = i > 0; // Opening on a slash chord blurs the key.
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

/** At most this many dressed-up chords, so the progression still reads as plain harmony. */
const MAX_COLORS: Record<number, number> = { 4: 1, 8: 3 };

/**
 * A diatonic progression in scale degrees ("1 5/7 6m 4sus2"), so any key works: a
 * functional skeleton, then the odd slash or sus chord where it fits.
 */
export function randomProgression(rng: Rng = Math.random): string[] {
  const chords = skeleton(rng);
  const tokens: string[] = [...chords];
  let budget = MAX_COLORS[chords.length] ?? 1;
  // Visit chords in random order so the budget doesn't always go to the first ones.
  const order = chords.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (const i of order) {
    if (!budget) break;
    const hit = colors(chords, i).find((c) => rng() < c.chance);
    if (hit) { tokens[i] = hit.token; budget--; }
  }
  return tokens;
}

/** Any major key but the current one, so every roll visibly changes something. */
export function randomKey(current?: string, rng: Rng = Math.random): string {
  const pool = KEYS.filter((k) => k !== current);
  return pool[Math.floor(rng() * pool.length)];
}
