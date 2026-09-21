import { describe, expect, it } from "vitest";
import { KEYS, MAX_FRET, SETS, impliedQuality, openString, parseProgression } from "./engine";
import {
  SCALES, ScalePos, ScaleShape, bestShapeFor, posKey, scaleById, scaleFamilies, scaleNoteNames, scalePositions,
  scaleShapes,
} from "./scales";

const scale = (id: string) => SCALES.find((s) => s.id === id)!;
/** A shape as "string: frets", high e first — the way a box is usually written out. */
const frets = (notes: ScalePos[]) =>
  [1, 2, 3, 4, 5, 6].map((s) => notes.filter((n) => n.string === s).map((n) => n.fret).join(" "));
const at = (shapes: ScaleShape[], anchor: number) => shapes.find((s) => s.anchor === anchor)!;

describe("tuning", () => {
  it("agrees with the string sets the voicing engine uses", () => {
    expect([1, 2, 3, 4, 5, 6].map(openString)).toEqual([4, 11, 7, 2, 9, 4]);
    expect(SETS["1-3"].open).toEqual([7, 11, 4]);
    expect(SETS["2-4"].open).toEqual([2, 7, 11]);
    expect(SETS["3-5"].open).toEqual([9, 2, 7]);
  });
});

describe("scalePositions", () => {
  it("puts A minor pentatonic where it belongs on the low E string", () => {
    const low = scalePositions(scale("minor-pent"), "A").filter((p) => p.string === 6);
    expect(low.map((p) => p.fret)).toEqual([0, 3, 5, 8, 10, 12, 15]);
  });

  it("marks the roots and nothing else as degree 0", () => {
    const roots = scalePositions(scale("major"), "C").filter((p) => p.degree === 0);
    expect(roots.filter((p) => p.string === 2).map((p) => p.fret)).toEqual([1, 13]);
    expect(roots.every((p) => (openString(p.string) + p.fret) % 12 === 0)).toBe(true);
  });

  it("gives the parallel minor different notes from the major, not just a different root", () => {
    const maj = new Set(scalePositions(scale("major"), "G").map(posKey));
    const min = new Set(scalePositions(scale("minor"), "G").map(posKey));
    expect(maj).not.toEqual(min);
    // b3, b6 and b7 are in one and not the other, three notes each way.
    expect([...min].filter((k) => !maj.has(k)).length).toBeGreaterThan(10);
  });

  it("keeps the major pentatonic inside the major scale", () => {
    const maj = new Set(scalePositions(scale("major"), "D").map(posKey));
    expect(scalePositions(scale("major-pent"), "D").every((p) => maj.has(posKey(p)))).toBe(true);
  });
});

describe("scaleShapes", () => {
  it("builds the textbook A minor pentatonic box 1 at the 5th fret", () => {
    const box = at(scaleShapes(scale("minor-pent"), "A"), 5);
    expect(box.position).toBe(1);
    expect(frets(box.notes)).toEqual(["5 8", "5 8", "5 7", "5 7", "5 7", "5 8"]);
  });

  it("builds box 2 of the same scale, the one that slants back at the 7th fret", () => {
    const box = at(scaleShapes(scale("minor-pent"), "A"), 8);
    expect(box.position).toBe(2);
    expect(frets(box.notes)).toEqual(["8 10", "8 10", "7 9", "7 10", "7 10", "8 10"]);
  });

  it("builds the CAGED C major position at the 8th fret: three notes a string where the scale has them", () => {
    const box = at(scaleShapes(scale("major"), "C"), 8);
    expect(box.position).toBe(1);
    expect(frets(box.notes)).toEqual(["7 8 10", "8 10", "7 9 10", "7 9 10", "7 8 10", "7 8 10"]);
  });

  it("numbers the boxes from the one whose lowest 6th-string note is the root", () => {
    const shapes = scaleShapes(scale("minor-pent"), "A");
    expect(shapes.map((s) => [s.anchor, s.position])).toEqual([[0, 4], [3, 5], [5, 1], [8, 2], [10, 3], [12, 4]]);
  });

  it("lays a seven-note scale over its pentatonic's boxes", () => {
    const pent = scaleShapes(scale("major-pent"), "G");
    const full = scaleShapes(scale("major"), "G");
    expect(full.map((s) => [s.anchor, s.position])).toEqual(pent.map((s) => [s.anchor, s.position]));
    // Same hand position, the two extra notes added.
    for (const p of pent) {
      const f = at(full, p.anchor);
      const inFull = new Set(f.notes.map(posKey));
      expect(p.notes.every((n) => inFull.has(posKey(n)))).toBe(true);
      expect(f.notes.length).toBeGreaterThan(p.notes.length);
    }
  });

  it("offers all five positions in every key, without running off the neck", () => {
    for (const key of KEYS) {
      for (const s of SCALES) {
        const shapes = scaleShapes(s, key);
        expect(new Set(shapes.map((x) => x.position))).toEqual(new Set([1, 2, 3, 4, 5]));
        expect(shapes.every((x) => x.lowFret >= 0 && x.highFret <= MAX_FRET)).toBe(true);
        expect(shapes.every((x) => x.highFret - x.lowFret <= 6)).toBe(true);
      }
    }
  });

  it("holds every position on the neck in some box, bar a few notes at the very ends", () => {
    for (const key of KEYS) {
      for (const s of SCALES) {
        const held = new Set(scaleShapes(s, key).flatMap((x) => x.notes.map(posKey)));
        const loose = scalePositions(s, key).filter((p) => !held.has(posKey(p)));
        expect(loose.every((p) => p.fret === 0 || p.fret === MAX_FRET)).toBe(true);
      }
    }
  });
});

describe("bestShapeFor", () => {
  it("picks the box the note sits in the middle of, not the one it sits at the edge of", () => {
    const shapes = scaleShapes(scale("minor-pent"), "A");
    // Fret 8 on the low E is the top of box 1 (5–8) and the anchor of box 2 (7–10).
    const pos = scalePositions(scale("minor-pent"), "A").find((p) => p.string === 6 && p.fret === 8)!;
    expect(bestShapeFor(shapes, pos)!.anchor).toBe(8);
    // Fret 5 on the same string is box 1's anchor and box 5's top (2–5).
    const low = scalePositions(scale("minor-pent"), "A").find((p) => p.string === 6 && p.fret === 5)!;
    expect(bestShapeFor(shapes, low)!.anchor).toBe(5);
  });

  it("always answers with a box that holds the note when one does", () => {
    for (const key of KEYS) {
      for (const s of SCALES) {
        const shapes = scaleShapes(s, key);
        for (const p of scalePositions(s, key)) {
          const best = bestShapeFor(shapes, p)!;
          expect(best).toBeDefined();
          const holders = shapes.filter((x) => x.notes.some((n) => posKey(n) === posKey(p)));
          if (holders.length) expect(holders).toContain(best);
        }
      }
    }
  });

  it("falls back to the nearest box for a note whose own box runs off the neck", () => {
    const s = scale("minor");
    const shapes = scaleShapes(s, "C");
    const top = scalePositions(s, "C").find((p) => p.string === 2 && p.fret === MAX_FRET)!;
    expect(shapes.some((x) => x.notes.some((n) => posKey(n) === posKey(top)))).toBe(false);
    expect(bestShapeFor(shapes, top)!.highFret).toBeGreaterThan(12);
  });

  it("has nothing to say about an empty neck", () => {
    expect(bestShapeFor([], { string: 1, fret: 0, degree: 0 })).toBeUndefined();
  });
});

describe("scaleNoteNames", () => {
  it("spells each degree the way the key spells its notes", () => {
    expect(scaleNoteNames(scale("major"), "G")).toEqual(["G", "A", "B", "C", "D", "E", "F#"]);
    expect(scaleNoteNames(scale("minor"), "F")).toEqual(["F", "G", "Ab", "Bb", "C", "Db", "Eb"]);
    expect(scaleNoteNames(scale("minor-pent"), "A")).toEqual(["A", "C", "D", "E", "G"]);
  });

  it("lines up with the degree names", () => {
    for (const s of SCALES) expect(s.degrees).toHaveLength(s.ints.length);
  });
});

describe("scaleFamilies", () => {
  it("gives the major scale the key's own chords: 1 4 5 major, 2 3 6 minor, 7 diminished", () => {
    expect(scaleFamilies(scale("major"))).toEqual(["maj", "min", "min", "maj", "maj", "min", "dim"]);
  });

  it("colours the major pentatonic the same way, minus the 4 and the 7", () => {
    expect(scaleFamilies(scale("major-pent"))).toEqual(["maj", "min", "min", "maj", "min"]);
  });

  it("treats a minor scale's flat degrees as the borrowed major chords they are in the key", () => {
    expect(scaleFamilies(scale("minor-pent"))).toEqual(["maj", "maj", "maj", "maj", "maj"]);
    expect(scaleFamilies(scale("minor"))).toEqual(["maj", "min", "maj", "maj", "maj", "maj", "maj"]);
  });

  it("keeps a degree's colour when the scale changes, because every scale shares the key's root", () => {
    const fam = (id: string) => new Map(scale(id).ints.map((iv, i) => [iv, scaleFamilies(scale(id))[i]]));
    const major = fam("major");
    for (const id of ["major-pent", "minor-pent", "minor"]) {
      for (const [iv, f] of fam(id)) if (major.has(iv)) expect(f).toBe(major.get(iv));
    }
  });

  it("agrees with the colour the chord names elsewhere in the app would get", () => {
    // The song index colours a chord by `QUAL[c.q].fam`; the neck must reach the same answer.
    const { chords } = parseProgression("1 2m 3m 4 5 6m 7°", "G");
    expect(chords.map((c) => impliedQuality(c.root - 7))).toEqual(chords.map((c) => c.q));
    expect(scaleFamilies(scale("major"))).toEqual(["maj", "min", "min", "maj", "maj", "min", "dim"]);
  });
});

describe("scaleById", () => {
  it("finds a scale and falls back to the major", () => {
    expect(scaleById("minor-pent").name).toBe("Minor pentatonic");
    expect(scaleById("nonsense" as never).id).toBe("major");
  });
});
