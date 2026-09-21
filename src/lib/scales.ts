// Scales on the neck — where a scale falls, and which of the five boxes each position belongs to.
//
// Every scale here sits on the song's own root, never on the relative minor: the relative minor is
// the same seven notes with a different tonic, so switching to it would leave the neck unchanged.
// The parallel minor does change what's under your fingers (b3, b6, b7), which is the point of a
// switch you make while soloing over one key.

import { MAX_FRET, OPEN_PITCH, QUAL, impliedQuality, keySemi, noteNames, openString } from "./engine";

export type ScaleId = "major" | "major-pent" | "minor-pent" | "minor";

export interface Scale {
  id: ScaleId;
  name: string;
  blurb: string;
  /** Semitones above the root, ascending. */
  ints: number[];
  /** The five-note skeleton the boxes are built on; the scale itself when it already has five notes. */
  pent: number[];
  /** Degree names, in the same order as `ints`. */
  degrees: string[];
}

const MAJOR_PENT = [0, 2, 4, 7, 9];
const MINOR_PENT = [0, 3, 5, 7, 10];

export const SCALES: Scale[] = [
  {
    id: "major", name: "Major", blurb: "The key's own seven notes.",
    ints: [0, 2, 4, 5, 7, 9, 11], pent: MAJOR_PENT,
    degrees: ["1", "2", "3", "4", "5", "6", "7"],
  },
  {
    id: "major-pent", name: "Major pentatonic", blurb: "Major without the 4 and the 7 — the five that never clash.",
    ints: MAJOR_PENT, pent: MAJOR_PENT,
    degrees: ["1", "2", "3", "5", "6"],
  },
  {
    id: "minor-pent", name: "Minor pentatonic", blurb: "The blues five on the same root: b3 and b7 rubbing against the key.",
    ints: MINOR_PENT, pent: MINOR_PENT,
    degrees: ["1", "b3", "4", "5", "b7"],
  },
  {
    id: "minor", name: "Natural minor", blurb: "The parallel minor: same root, flat 3rd, 6th and 7th.",
    ints: [0, 2, 3, 5, 7, 8, 10], pent: MINOR_PENT,
    degrees: ["1", "2", "b3", "4", "5", "b6", "b7"],
  },
];

export const DEFAULT_SCALE: ScaleId = "major";
export const scaleById = (id: ScaleId): Scale => SCALES.find((s) => s.id === id) ?? SCALES[0];

/** One scale note on the neck. `string` is 1 (high e) to 6 (low E); `degree` indexes the scale's `ints`. */
export interface ScalePos { string: number; fret: number; degree: number }

export const isRoot = (p: ScalePos): boolean => p.degree === 0;
export const posKey = (p: ScalePos): string => `${p.string}:${p.fret}`;

/** Semitones above the root for a pitch class, 0 to 11. */
const from = (pc: number, root: number) => ((pc - root) % 12 + 12) % 12;
/** Pitch class of a pitch measured in semitones above the open 6th string. */
const pitchClass = (v: number) => (v + openString(6)) % 12;

/** Every place the scale falls on the neck, string 1 first, low frets first. */
export function scalePositions(scale: Scale, key: string, maxFret = MAX_FRET): ScalePos[] {
  const root = keySemi(key);
  const out: ScalePos[] = [];
  for (let string = 1; string <= 6; string++) {
    for (let fret = 0; fret <= maxFret; fret++) {
      const degree = scale.ints.indexOf(from(openString(string) + fret, root));
      if (degree >= 0) out.push({ string, fret, degree });
    }
  }
  return out;
}

/** One of the five boxes, as the positions it holds. */
export interface ScaleShape {
  /** 1–5, counted from the box whose lowest note on the 6th string is the root — the usual numbering. */
  position: number;
  /** Fret of that lowest note on the 6th string: where the hand sits. */
  anchor: number;
  notes: ScalePos[];
  lowFret: number;
  highFret: number;
}

/**
 * The twelve notes of one pentatonic box: two per string, walking the skeleton upward from `anchor`
 * on the 6th string. Pitches are counted in semitones above that open string.
 */
function skeleton(pent: number[], root: number, anchor: number): { string: number; fret: number }[] {
  const bones: { string: number; fret: number }[] = [];
  let v = anchor;
  for (let j = 0; j < 12; j++) {
    const string = 6 - Math.floor(j / 2);
    bones.push({ string, fret: v - OPEN_PITCH[string - 1] });
    do { v++; } while (!pent.includes(from(pitchClass(v), root)));
  }
  return bones;
}

/** How far past the skeleton a box reaches on each string, so a seven-note scale's extra two notes join the box they're played in. */
const REACH = 1;
/** Skeleton notes a box must have on the neck to count as a hand position rather than a sliver at the end. */
const MIN_BONES = 8;

/**
 * The boxes the scale's positions group into: the five pentatonic shapes, anchored at every fret of
 * the 6th string the skeleton can start on, so a box that repeats an octave up is listed twice. A
 * box that mostly hangs off the nut or the end of the neck is left out, and one that hangs off a
 * little keeps only the notes that fit. A seven-note scale uses its parent pentatonic's boxes and
 * picks up the two extra notes a fret either side of the skeleton — the CAGED positions.
 */
export function scaleShapes(scale: Scale, key: string, maxFret = MAX_FRET): ScaleShape[] {
  const root = keySemi(key);
  const positions = scalePositions(scale, key, maxFret);
  const shapes: ScaleShape[] = [];
  for (let anchor = 0; anchor <= maxFret; anchor++) {
    const i = scale.pent.indexOf(from(pitchClass(anchor), root));
    if (i < 0) continue;
    const bones = skeleton(scale.pent, root, anchor).filter((b) => b.fret >= 0 && b.fret <= maxFret);
    if (bones.length < MIN_BONES) continue;
    const window = new Map<number, [number, number]>();
    for (const b of bones) {
      const w = window.get(b.string);
      window.set(b.string, w ? [Math.min(w[0], b.fret), Math.max(w[1], b.fret)] : [b.fret, b.fret]);
    }
    const notes = positions.filter((p) => {
      const w = window.get(p.string);
      return !!w && p.fret >= w[0] - REACH && p.fret <= w[1] + REACH;
    });
    const frets = notes.map((n) => n.fret);
    shapes.push({ position: i + 1, anchor, notes, lowFret: Math.min(...frets), highFret: Math.max(...frets) });
  }
  return shapes;
}

/**
 * The box a position most belongs to: of the boxes holding it, the one whose fret span is most
 * centred on that fret, then the tightest, then the lowest box number. A note at the very end of
 * the neck can belong to no box at all (its box runs off the fretboard); the nearest box answers
 * for it so hovering always lights something up.
 */
export function bestShapeFor(shapes: ScaleShape[], pos: ScalePos): ScaleShape | undefined {
  const key = posKey(pos);
  const holding = shapes.filter((s) => s.notes.some((n) => posKey(n) === key));
  const pool = holding.length ? holding : shapes;
  if (!pool.length) return undefined;
  const off = (s: ScaleShape) => Math.abs((s.lowFret + s.highFret) / 2 - pos.fret);
  const span = (s: ScaleShape) => s.highFret - s.lowFret;
  return pool.reduce((a, b) => {
    if (off(b) !== off(a)) return off(b) < off(a) ? b : a;
    if (span(b) !== span(a)) return span(b) < span(a) ? b : a;
    return b.position < a.position ? b : a;
  });
}

/** The note each degree of the scale lands on, spelled the way the key spells its notes. */
export function scaleNoteNames(scale: Scale, key: string): string[] {
  const names = noteNames(key);
  const root = keySemi(key);
  return scale.ints.map((iv) => names[(root + iv) % 12]);
}

/** The chord family a scale note belongs to, which is what colours it. */
export type Fam = "maj" | "min" | "dim" | "sus";

/**
 * The chord family the *song's key* builds on each degree of the scale, so a note is coloured by
 * the chord it belongs to in the song rather than by the scale you happen to be looking at: 2, 3
 * and 6 minor, 7 diminished, the rest major. Every scale here shares the key's root, so a note
 * keeps its colour as you switch scales — the 6 is the same purple whichever scale you are in.
 * The flat degrees a minor scale brings in (b3, b6, b7) have no chord in a major key, so they take
 * the major colour the rest of the app already gives borrowed degrees.
 */
export function scaleFamilies(scale: Scale): Fam[] {
  return scale.ints.map((iv) => QUAL[impliedQuality(iv)].fam);
}
