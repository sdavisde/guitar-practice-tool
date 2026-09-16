import { describe, expect, it } from "vitest";
import { KEYS, parseProgression } from "./engine";
import { randomKey, randomProgression } from "./random-progression";

// Deterministic PRNG (mulberry32) so failures reproduce.
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("randomProgression", () => {
  const rng = seeded(42);
  const rolls = Array.from({ length: 1000 }, () => randomProgression(rng));
  const PLAIN = ["1", "2m", "3m", "4", "5", "6m"];
  const COLORED = ["1/3", "1/5", "5/7", "6m/5", "1sus2", "1sus4", "5sus4", "4sus2", "2sus4"];
  // The skeleton chord under any coloring: "5/7" and "5sus4" are both the 5.
  const degree = (t: string) => t.replace(/\/[1-7]$|sus[24]$/, "").replace(/^([236])$/, "$1m");

  it("makes 4- or 8-chord progressions that parse in any key", () => {
    for (const p of rolls) {
      expect([4, 8]).toContain(p.length);
      expect(p.every((t) => PLAIN.includes(t) || COLORED.includes(t))).toBe(true);
      expect(parseProgression(p.join(" "), "Eb").errors).toEqual([]);
    }
  });

  it("always includes the tonic, never repeats a chord back to back, and uses at least 3 chords", () => {
    for (const p of rolls) {
      const d = p.map(degree);
      expect(d).toContain("1");
      expect(new Set(d).size).toBeGreaterThanOrEqual(3);
      d.forEach((t, i) => i > 0 && expect(t).not.toBe(d[i - 1]));
    }
  });

  it("8-chord rolls restate the loop's opening and then take a different turn", () => {
    const eights = rolls.filter((p) => p.length === 8);
    expect(eights.length).toBeGreaterThan(0);
    for (const p of eights) {
      const d = p.map(degree);
      expect(d.slice(4, 6)).toEqual(d.slice(0, 2));
      expect(d.slice(4).join()).not.toBe(d.slice(0, 4).join());
    }
  });

  it("adds a few sus and slash chords, never opening on a slash chord", () => {
    const colored = rolls.map((p) => p.filter((t) => COLORED.includes(t)).length);
    for (const [k, p] of rolls.entries()) {
      expect(colored[k]).toBeLessThanOrEqual(p.length === 4 ? 1 : 3);
      expect(p[0]).not.toContain("/");
    }
    const all = new Set(rolls.flat());
    for (const t of COLORED) expect(all).toContain(t);
    expect(colored.filter((n) => n === 0).length).toBeGreaterThan(200); // plenty stay plain
  });

  it("puts slash chords where the bass steps to the next chord", () => {
    const stepsTo: Record<string, string[]> = { "1/3": ["4", "2m"], "1/5": ["5"], "5/7": ["1", "6m"], "6m/5": ["4"] };
    for (const p of rolls) {
      p.forEach((t, i) => {
        if (stepsTo[t]) expect(stepsTo[t]).toContain(degree(p[(i + 1) % p.length]));
      });
    }
  });

  it("varies", () => {
    expect(new Set(rolls.map((p) => p.join(" "))).size).toBeGreaterThan(60);
  });
});

describe("parseProgression slash chords", () => {
  it("keeps the bass in names and degrees", () => {
    const { chords } = parseProgression("1/3 5/7 G/B 4", "G");
    expect(chords.map((c) => c.name)).toEqual(["G/B", "D/F#", "G/B", "C"]);
    expect(chords.map((c) => c.degree)).toEqual(["1/3", "5/7", "1/3", "4"]);
    expect(chords[0].root).toBe(chords[2].root);
    expect(chords[3].bass).toBeUndefined();
  });
});

describe("randomKey", () => {
  it("returns a known key other than the current one", () => {
    const rng = seeded(7);
    for (let i = 0; i < 200; i++) {
      const k = randomKey("G", rng);
      expect(KEYS).toContain(k);
      expect(k).not.toBe("G");
    }
  });
});
