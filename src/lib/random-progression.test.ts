import { describe, expect, it } from "vitest";
import { KEYS, parseProgression } from "./engine";
import { Degree, MOODS, MoodId, SECTIONS, SectionKind, moodById, randomKey, randomProgression, randomSong } from "./random-progression";

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

/** The skeleton chord under any colouring: "5/7", "5sus4" and "57" are all the 5; "37" is the 3M; "4m7" is the 4m. */
function skeleton(t: string): Degree {
  const s = t.replace(/\/[1-7]$|sus[24]$/, "");
  const dom = s.match(/^([236])7$/);
  if (dom) return (dom[1] + "M") as Degree;
  const major = s.match(/^([1-7])(?:maj)?7$/);
  if (major) return major[1] as Degree;
  return s.replace(/m7$/, "m").replace(/^([236])$/, "$1m") as Degree;
}

describe("moods and sections", () => {
  const rng = seeded(99);
  const N = 300;
  const rolls = (mood: MoodId, section: SectionKind) =>
    Array.from({ length: N }, () => randomProgression(rng, { mood, section }));

  for (const mood of MOODS) {
    describe(mood.name, () => {
      const vocab = new Set(Object.keys(mood.next));

      for (const section of SECTIONS) {
        it(`${section.name.toLowerCase()}: parses in any key, moves only along the mood's own transitions`, () => {
          for (const p of rolls(mood.id, section.id)) {
            expect([4, 8]).toContain(p.length);
            expect(parseProgression(p.join(" "), "Eb").errors).toEqual([]);
            expect(parseProgression(p.join(" "), "E").errors).toEqual([]);
            const d = p.map(skeleton);
            for (const x of d) expect(vocab).toContain(x);
            d.forEach((x, i) => i > 0 && expect(mood.next[d[i - 1]]?.[x]).toBeTruthy());
            expect(new Set(d).size).toBeGreaterThanOrEqual(3);
            expect(p[0]).not.toContain("/");
            const budget = mood.maxColors[p.length];
            expect(p.filter((t, i) => t !== d[i]).length).toBeLessThanOrEqual(budget);
          }
        });
      }

      it("verse and chorus loop through home; pre-chorus and bridge leave it and end on a cadence", () => {
        for (const kind of ["verse", "chorus"] as const) {
          for (const p of rolls(mood.id, kind)) {
            const d = p.map(skeleton);
            expect(d).toContain(mood.home);
            expect(mood.next[d[d.length - 1]]?.[d[0]]).toBeTruthy();
          }
        }
        for (const kind of ["prechorus", "bridge"] as const) {
          for (const p of rolls(mood.id, kind)) {
            const d = p.map(skeleton);
            expect(d[0]).not.toBe(mood.home);
            expect(mood.cadence).toContain(d[d.length - 1]);
            expect(mood.next[d[d.length - 1]]?.[mood.home]).toBeTruthy();
            if (d.length === 4) expect(d.slice(1, -1)).not.toContain(mood.home);
          }
        }
      });

      it("chorus opens on home or the 4", () => {
        for (const p of rolls(mood.id, "chorus")) expect([mood.home, "4", "6m"]).toContain(skeleton(p[0]));
      });

      it("pre-chorus is always four chords", () => {
        for (const p of rolls(mood.id, "prechorus")) expect(p.length).toBe(4);
      });
    });
  }

  it("each mood has its own flavour", () => {
    const all = (mood: MoodId) => new Set(rolls(mood, "verse").concat(rolls(mood, "bridge")).flat());
    expect([...all("rock")].some((t) => t.startsWith("b7"))).toBe(true);
    expect([...all("rock")].some((t) => /^[145]7$/.test(t))).toBe(true);
    expect([...all("folk")]).toContain("b7");
    expect([...all("soul")].some((t) => t.endsWith("maj7"))).toBe(true);
    expect([...all("soul")].some((t) => t === "37" || t === "3M" || t === "27" || t === "2M" || t === "67" || t === "6M")).toBe(true);
    expect([...all("soul")].some((t) => t.startsWith("4m"))).toBe(true);
    expect([...all("dark")].some((t) => t === "3M" || t === "37")).toBe(true);
    expect([...all("worship")]).toContain("4sus2");
    for (const p of rolls("dark", "verse")) expect(skeleton(p[0])).not.toBe("1");
    for (const p of rolls("pop", "verse")) expect(p.every((t) => !/^[b#]/.test(t) && !/M$|[a-z0-9]7$/.test(t))).toBe(true);
  });

  it("dark verses mostly open on the 6m", () => {
    const opens6m = rolls("dark", "verse").filter((p) => skeleton(p[0]) === "6m").length;
    expect(opens6m).toBeGreaterThan(N * 0.6);
  });

  it("the default roll is a pop verse", () => {
    const r1 = seeded(5), r2 = seeded(5);
    expect(randomProgression(r1)).toEqual(randomProgression(r2, { mood: "pop", section: "verse" }));
  });
});

describe("randomSong", () => {
  const rng = seeded(3);
  const songs = Array.from({ length: 200 }, () => randomSong("pop", rng));

  it("always has a verse then a chorus, with a pre-chorus and bridge often, in song order", () => {
    const ORDER = ["Verse", "Pre-chorus", "Chorus", "Bridge"];
    for (const s of songs) {
      const names = s.map((x) => x.name);
      expect(names).toContain("Verse");
      expect(names).toContain("Chorus");
      expect(names).toEqual(ORDER.filter((n) => names.includes(n)));
    }
    expect(songs.filter((s) => s.some((x) => x.name === "Pre-chorus")).length).toBeGreaterThan(50);
    expect(songs.filter((s) => s.some((x) => x.name === "Bridge")).length).toBeGreaterThan(80);
  });

  it("gives each section the movement that suits it", () => {
    const want: Record<string, string> = { Verse: "stay", "Pre-chorus": "climb", Chorus: "high", Bridge: "smooth" };
    for (const s of songs) for (const x of s) expect(x.strategyId).toBe(want[x.name]);
  });

  it("works in every mood", () => {
    for (const m of MOODS) {
      const s = randomSong(m.id, rng);
      for (const x of s) expect(parseProgression(x.tokens.join(" "), "A").errors).toEqual([]);
    }
    expect(moodById("dark").home).toBe("6m");
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
