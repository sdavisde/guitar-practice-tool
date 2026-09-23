// Facts about one voicing and how it sits against the chord before it — what the voicing picker shows.

import { Cand, OPEN_PITCH, QUAL, SETS, STRATEGIES, SetId, candKey } from "@/lib/engine";

export { candKey };

/** Which real string each index of a cand's frets/tones sits on, low to high. String 1 = high e. */
export const SET_STRINGS: Record<SetId, number[]> = {
  "1-3": [3, 2, 1],
  "2-4": [4, 3, 2],
  "3-5": [5, 4, 3],
};

/** The string sets as the picker lays them out: thin (strings 1–3) to beefy (3–5). */
export const SET_ORDER = (Object.keys(SETS) as SetId[]).sort((a, b) => SETS[a].lane - SETS[b].lane);

/**
 * Each note's pitch in semitones above the open low E, low string first. This, not `avg`, is how
 * high a shape sounds: `avg` is a mean fret number, which says nothing across string sets.
 */
export const pitches = (c: Cand): number[] => c.frets.map((f, i) => OPEN_PITCH[SET_STRINGS[c.set][i] - 1] + f);
export const lowPitch = (c: Cand): number => Math.min(...pitches(c));
export const topPitch = (c: Cand): number => Math.max(...pitches(c));
export const meanPitch = (c: Cand): number => pitches(c).reduce((a, b) => a + b, 0) / 3;

export type Inversion = 0 | 1 | 2;
export const INVERSION_NAMES = ["Root position", "1st inversion", "2nd inversion"] as const;

/** Which chord tone is in the bass: `tones` runs low string first, so its first entry says. */
export function inversion(c: Cand): Inversion {
  const semi = ((c.tones[0] - c.chord.root) % 12 + 12) % 12;
  const at = QUAL[c.chord.q].ints.indexOf(semi);
  return (at < 0 ? 0 : at) as Inversion;
}

/** "frets 3–5", "fret 12" when the shape is a straight bar, "open" when nothing is fretted. */
export function fretText(c: Cand): string {
  const lo = Math.min(...c.frets), hi = Math.max(...c.frets);
  if (hi === 0) return "open";
  return lo === hi ? `fret ${lo}` : `frets ${lo}–${hi}`;
}

/** A chord's voicings, one list per string set (thin to beefy), each highest-sounding first. */
export function voicingColumns(list: Cand[]): { set: SetId; cands: Cand[] }[] {
  return SET_ORDER.map((set) => ({
    set,
    cands: list.filter((c) => c.set === set).sort((a, b) => meanPitch(b) - meanPitch(a)),
  }));
}

/** The voicing a stored pin names, if the chord still has it. */
export const candFromKey = (list: Cand[], key: string | undefined): Cand | undefined =>
  key ? list.find((c) => candKey(c) === key) : undefined;

export interface Comparison {
  /** Whole semitones the shape sounds above (+) or below (−) the one before, by mean pitch. */
  semitones: number;
  /** String sets moved: negative toward strings 1–3 (thinner), positive toward 3–5 (beefier). */
  sets: number;
  /** Frets the hand travels, to the nearest half. */
  hand: number;
}

export function compare(prev: Cand, cand: Cand): Comparison {
  return {
    semitones: Math.round(meanPitch(cand) - meanPitch(prev)),
    sets: SETS[cand.set].lane - SETS[prev.set].lane,
    hand: Math.round(Math.abs(cand.avg - prev.avg) * 2) / 2,
  };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const COUNT = ["", "one", "two"];

/** The comparison as the readout's phrases: "3 semitones higher", "one set beefier", "hand moves 2 frets". */
export function comparePhrases(c: Comparison): string[] {
  const s = Math.abs(c.semitones), n = Math.abs(c.sets);
  return [
    s === 0 ? "same height" : `${plural(s, "semitone")} ${c.semitones > 0 ? "higher" : "lower"}`,
    n === 0 ? "same strings" : `${COUNT[n] ?? n} ${n === 1 ? "set" : "sets"} ${c.sets < 0 ? "thinner" : "beefier"}`,
    c.hand === 0 ? "hand stays put" : `hand moves ${plural(c.hand, "fret")}`,
  ];
}

/** "+3 st", "−9 st", "±0 st". */
export function signedSemitones(n: number): string {
  return `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n)} st`;
}

/**
 * The voicing a movement would choose for this one chord, coming from `prev`: its own rule and
 * costs applied to a single step. With no chord before, only the movement's taste for where on
 * the neck to sit decides. Undefined when the rule leaves nothing (climbing from the 15th fret),
 * and for Wander, which has no opinion.
 */
export function movementPick(strategyId: string, prev: Cand | undefined, list: Cand[] = []): Cand | undefined {
  const strat = STRATEGIES.find((s) => s.id === strategyId);
  if (!strat) return undefined;
  let best: Cand | undefined, bestCost = Infinity;
  for (const c of list) {
    if (prev && strat.ok && !strat.ok(prev, c)) continue;
    const cost = strat.unary(c) + (prev ? strat.trans(prev, c) : 0);
    if (cost < bestCost) { best = c; bestCost = cost; }
  }
  return best;
}
