import { describe, expect, it } from "vitest";
import {
  Cand, candidates, parseProgression, planPhrase, sectionFromTokens, setSlotPin, clearPhrasePins, clearHeldPins,
  isUserPin, pinSlot, solveSection, retokenizeSection, redetectSection, splitPhraseAt, sectionSlots, Section, Slot,
} from "./engine";
import {
  candKey, candFromKey, compare, comparePhrases, fretText, inversion, lowPitch, meanPitch, movementPick, pitches,
  signedSemitones, topPitch, voicingColumns,
} from "./voicings";
import { heldBefore, solveSectionPaths, voicingContext } from "./use-section-paths";
import { isSection } from "./use-song";

const chord = (tok: string, key = "G") => parseProgression(tok, key).chords[0];
const voicing = (tok: string, k: string, key = "G"): Cand => {
  const c = candFromKey(candidates(chord(tok, key)), k);
  if (!c) throw new Error(`${tok} has no voicing ${k}`);
  return c;
};
const solve = (s: Section, key = "G", alt = 0) => solveSection(s, s.phrases.map((p) => planPhrase(p, key)), { alt, K: 8 });
const keys = (s: Section, key = "G", alt = 0) => solve(s, key, alt).map((r) => r.path?.map(candKey) ?? null);
const sectionPaths = (s: Section, key = "G", alt = 0) => solveSectionPaths(s, s.phrases.map((p) => planPhrase(p, key)), alt);
/** Pin chord `i` of phrase `p` the way the picker does: holding the chords before it where they are. */
const pinByHand = (s: Section, p: number, i: number, k: string | undefined, key = "G"): Section => {
  const paths = sectionPaths(s, key);
  return pinSlot(s, paths.offsets[p] + paths.plans[p].units[i].slot, k, heldBefore(paths, p, i));
};
/** Every slot's fixed voicing and whether the app is only holding it. */
const pinsOf = (s: Section): [string | null, boolean][] => sectionSlots(s).map((x) => [x.pin ?? null, !!x.held]);

describe("voicing facts", () => {
  it("measures pitch from the real strings, not the mean fret", () => {
    // G on the open 2-4 strings: D3 G3 B3, 10 15 19 semitones above the low E.
    expect(pitches(voicing("1", "2-4:0-0-0"))).toEqual([10, 15, 19]);
    const thin = voicing("1", "1-3:4-3-3"), beefy = voicing("1", "3-5:5-5-4");
    expect(beefy.avg).toBeGreaterThan(thin.avg);
    expect(meanPitch(beefy)).toBeLessThan(meanPitch(thin)); // higher up the neck, lower in pitch
    expect([lowPitch(thin), topPitch(thin)]).toEqual([19, 27]);
  });

  it("names the inversion from the bass note", () => {
    expect(inversion(voicing("4", "1-3:5-5-3"))).toBe(0); // C E G
    expect(inversion(voicing("1", "1-3:4-3-3"))).toBe(1); // B D G
    expect(inversion(voicing("1", "2-4:0-0-0"))).toBe(2); // D G B
  });

  it("gives every voicing a key that finds it again, and none that finds another chord's", () => {
    for (const tok of ["1", "6m", "7°", "4sus4"]) {
      const list = candidates(chord(tok));
      expect(new Set(list.map(candKey)).size).toBe(list.length);
      for (const c of list) expect(candFromKey(list, candKey(c))).toBe(c);
    }
    expect(candFromKey(candidates(chord("5")), "1-3:5-5-3")).toBeUndefined();
  });

  it("describes fret spans", () => {
    expect(fretText(voicing("4", "1-3:5-5-3"))).toBe("frets 3–5");
    expect(fretText(voicing("1", "2-4:0-0-0"))).toBe("open");
    expect(fretText(voicing("1", "2-4:12-12-12"))).toBe("fret 12");
  });

  it("lays voicings out thin to beefy, each column highest first", () => {
    const cols = voicingColumns(candidates(chord("4")));
    expect(cols.map((c) => c.set)).toEqual(["1-3", "2-4", "3-5"]);
    expect(cols.reduce((n, c) => n + c.cands.length, 0)).toBe(candidates(chord("4")).length);
    for (const { set, cands } of cols) {
      expect(cands.every((c) => c.set === set)).toBe(true);
      const heights = cands.map(meanPitch);
      expect(heights).toEqual([...heights].sort((a, b) => b - a));
    }
  });
});

describe("compare", () => {
  const em = voicing("6m", "1-3:4-5-3");

  it("says how a shape sits against the chord before", () => {
    expect(compare(em, voicing("4", "1-3:5-5-3"))).toEqual({ semitones: 0, sets: 0, hand: 0.5 });
    expect(compare(em, voicing("4", "1-3:9-8-8")).semitones).toBe(4);
    const low = compare(em, voicing("4", "3-5:3-2-0"));
    expect(low.semitones).toBeLessThan(0);
    expect(low.sets).toBe(2);
  });

  it("puts it in words", () => {
    expect(comparePhrases({ semitones: 1, sets: 0, hand: 0.5 })).toEqual(["1 semitone higher", "same strings", "hand moves 0.5 frets"]);
    expect(comparePhrases({ semitones: -9, sets: 2, hand: 1 })).toEqual(["9 semitones lower", "two sets beefier", "hand moves 1 fret"]);
    expect(comparePhrases({ semitones: 0, sets: -1, hand: 0 })).toEqual(["same height", "one set thinner", "hand stays put"]);
    expect([3, -9, 0].map(signedSemitones)).toEqual(["+3 st", "−9 st", "±0 st"]);
  });
});

describe("movementPick", () => {
  const em = voicing("6m", "1-3:4-5-3");
  const list = candidates(chord("4"));

  it("applies each movement's own rule and costs to the one step", () => {
    expect(candKey(movementPick("stay", em, list)!)).toBe("1-3:5-5-3");
    expect(movementPick("climb", em, list)!.avg).toBeGreaterThan(em.avg);
    expect(movementPick("descend", em, list)!.avg).toBeLessThan(em.avg);
    expect(movementPick("low", em, list)!.avg).toBeLessThan(movementPick("high", em, list)!.avg);
    // Smooth: the fewest frets moved on the same strings.
    expect(candKey(movementPick("smooth", em, list)!)).toBe("1-3:5-5-3");
  });

  it("has no answer when the rule leaves nothing, or for Wander", () => {
    const top = [...candidates(chord("6m"))].sort((a, b) => b.avg - a.avg)[0];
    const below = list.filter((c) => c.avg <= top.avg);
    expect(movementPick("climb", top, below)).toBeUndefined();
    expect(movementPick("wander", em, list)).toBeUndefined();
  });

  it("falls back to the movement's taste when nothing comes before", () => {
    expect(movementPick("low", undefined, list)!.avg).toBe(Math.min(...list.map((c) => c.avg)));
    expect(movementPick("high", undefined, list)!.avg).toBe(Math.max(...list.map((c) => c.avg)));
  });
});

describe("hand-picked voicings", () => {
  const verse = () => sectionFromTokens("Verse", ["1", "6m", "4", "5"], "G");

  it("forces the chord onto the pinned voicing and re-paths the rest around it", () => {
    const free = keys(verse())[0]!;
    expect(free[2]).not.toBe("3-5:10-10-9");
    const pinned = keys(setSlotPin(verse(), 2, "3-5:10-10-9"))[0]!;
    expect(pinned[2]).toBe("3-5:10-10-9");
    expect(pinned[3]).not.toBe(free[3]); // the 5 follows it up the neck
  });

  it("survives a re-roll and a change of movement", () => {
    const s = setSlotPin(verse(), 2, "3-5:10-10-9");
    for (let alt = 0; alt < 8; alt++) expect(keys(s, "G", alt)[0]![2]).toBe("3-5:10-10-9");
    for (const strategyId of ["smooth", "low", "high", "wander"]) expect(keys({ ...s, strategyId })[0]![2]).toBe("3-5:10-10-9");
  });

  it("ignores a pin that names no voicing of the chord, as after a key change", () => {
    const s = setSlotPin(verse(), 2, "3-5:10-10-9");
    expect(keys(s, "A")).toEqual(keys(verse(), "A"));
    expect(keys(setSlotPin(verse(), 2, "nonsense"))).toEqual(keys(verse()));
  });

  it("outranks the pin a repeated pattern puts on later occurrences, and leads them when it is on the first", () => {
    const twice = () => sectionFromTokens("Chorus", ["4", "5", "6m", "1", "4", "5", "6m", "1", "4", "5", "6m", "1"], "G");
    expect(twice().phrases).toHaveLength(3);
    const [a, b] = keys(twice());
    expect(b).toEqual(a); // "same" by default
    const want = candidates(chord("4")).map(candKey).find((k) => k !== a![0])!;
    const later = keys(setSlotPin(twice(), 4, want));
    expect(later[0]![0]).toBe(a![0]);
    expect(later[1]![0]).toBe(want);
    const first = keys(setSlotPin(twice(), 0, want));
    expect(first.map((p) => p![0])).toEqual([want, want, want]);
  });

  it("reports the movement's failure, not a crash, when a pin makes its rule impossible", () => {
    const descend = { ...verse(), strategyId: "descend" };
    expect(solve(descend)[0].path).not.toBeNull();
    const stuck = setSlotPin(descend, 0, "2-4:0-0-0"); // nothing sits below the open strings
    const [r] = solve(stuck);
    expect(r.path).toBeNull();
    expect(r.fail).toMatch(/Can't descend/);
    expect(solve(clearPhrasePins(stuck, 0))[0].path).not.toBeNull();
  });

  it("keeps a pin on its chord through edits, and drops it when the chord is retyped", () => {
    const pins = (s: Section) => sectionSlots(s).map((x) => x.pin ?? null);
    const s = setSlotPin(verse(), 2, "1-3:5-5-3");
    expect(pins(s)).toEqual([null, null, "1-3:5-5-3", null]);
    expect(pins(setSlotPin(s, 2, undefined))).toEqual([null, null, null, null]);
    expect(pins(splitPhraseAt(s, 2))).toEqual([null, null, "1-3:5-5-3", null]);
    expect(pins(redetectSection(splitPhraseAt(s, 2), "G"))).toEqual([null, null, "1-3:5-5-3", null]);
    expect(pins(retokenizeSection(s, ["1", "3m", "4", "5"], "G"))).toEqual([null, null, "1-3:5-5-3", null]);
    expect(pins(retokenizeSection(s, ["1", "6m", "2m", "5"], "G"))).toEqual([null, null, null, null]);
    expect(pins(retokenizeSection(splitPhraseAt(s, 2), ["1", "6m", "2m", "5"], "G"))).toEqual([null, null, null, null]);
    expect(pins(retokenizeSection(s, ["1", "6m", "4", "5", "1"], "G"))).toEqual([null, null, null, null, null]);
  });

  it("merges a chord held over two slots into one unit carrying the first slot's pin", () => {
    const s = setSlotPin(sectionFromTokens("Verse", ["1", "1", "4"], "G"), 0, "2-4:0-0-0");
    const { units } = planPhrase(s.phrases[0], "G");
    expect(units.map((u) => [u.span, u.pin])).toEqual([[2, "2-4:0-0-0"], [1, undefined]]);
  });
});

describe("voicingContext", () => {
  const verse = () => sectionFromTokens("Verse", ["1", "6m", "4", "5"], "G");
  const ctx = (s: Section, p: number, i: number) =>
    voicingContext(s, "G", solveSectionPaths(s, s.phrases.map((x) => planPhrase(x, "G")), 0), 0, p, i);

  it("compares with the chord before, reaching back into the previous phrase, and with nothing at the start", () => {
    const s = splitPhraseAt(verse(), 2);
    const paths = solve(s);
    expect(ctx(s, 0, 0).prev).toBeUndefined();
    expect(candKey(ctx(s, 0, 1).prev!)).toBe(candKey(paths[0].path![0]));
    expect(candKey(ctx(s, 1, 0).prev!)).toBe(candKey(paths[0].path![1]));
  });

  it("remembers what the path would pick once the chord is pinned", () => {
    const free = solve(verse())[0].path![2];
    const open = ctx(verse(), 0, 2);
    expect(open.pinned).toBe(false);
    expect(candKey(open.pathPick!)).toBe(candKey(free));
    const pinned = ctx(setSlotPin(verse(), 2, "3-5:10-10-9"), 0, 2);
    expect(pinned.pinned).toBe(true);
    expect(candKey(pinned.pathPick!)).toBe(candKey(free));
  });

  it("marks the voicings that would leave a hard-rule movement no path", () => {
    expect(ctx(verse(), 0, 0).blocked.size).toBe(0); // Stay put has no rule to break
    const descend = { ...verse(), strategyId: "descend" };
    const { blocked } = ctx(descend, 0, 0);
    expect(blocked.has("2-4:0-0-0")).toBe(true);
    expect(blocked.has("3-5:14-12-12")).toBe(false);
    for (const c of candidates(chord("1"))) {
      expect(solve(setSlotPin(descend, 0, candKey(c)))[0].path === null).toBe(blocked.has(candKey(c)));
    }
  });
});

describe("held voicings", () => {
  const verse = () => sectionFromTokens("Verse", ["1", "6m", "4", "5"], "G");
  const PIN = "3-5:10-10-9"; // a 4 up at the 10th fret, nowhere near the free path
  const other = (tok: string, not: string) => candidates(chord(tok)).map(candKey).find((k) => k !== not)!;

  it("pins a chord without moving the ones before it, and lets the ones after re-path", () => {
    const free = keys(verse())[0]!;
    // Pinning alone drags the whole phrase up the neck to meet the pinned shape.
    expect(keys(setSlotPin(verse(), 2, PIN))[0]!.slice(0, 2)).not.toEqual(free.slice(0, 2));

    const path = keys(pinByHand(verse(), 0, 2, PIN))[0]!;
    expect(path.slice(0, 2)).toEqual(free.slice(0, 2)); // nothing before the pin moved
    expect(path[2]).toBe(PIN);
    expect(path[3]).not.toBe(free[3]);                  // the chord after it followed the pin
  });

  it("holds the earlier chords with pins of its own, marked as the app's rather than the player's", () => {
    const free = keys(verse())[0]!;
    const held = pinByHand(verse(), 0, 2, PIN);
    expect(pinsOf(held)).toEqual([[free[0], true], [free[1], true], [PIN, false], [null, false]]);
    expect(sectionSlots(held).map(isUserPin)).toEqual([false, false, true, false]);
  });

  it("holds the earlier chords through a re-roll, as a hand-picked pin does", () => {
    const held = pinByHand(verse(), 0, 2, PIN);
    const free = keys(verse())[0]!;
    for (let alt = 0; alt < 8; alt++) expect(keys(held, "G", alt)[0]!.slice(0, 3)).toEqual([free[0], free[1], PIN]);
  });

  it("lets the held voicings go with the last hand-picked pin, back to the engine's free path", () => {
    const held = pinByHand(verse(), 0, 2, PIN);
    const loose = pinByHand(held, 0, 2, undefined);
    expect(pinsOf(loose)).toEqual([[null, false], [null, false], [null, false], [null, false]]);
    expect(keys(loose)).toEqual(keys(verse()));
  });

  it("releases only the held voicings the remaining pins no longer need", () => {
    const one = pinByHand(verse(), 0, 1, other("6m", keys(verse())[0]![1]));
    expect(pinsOf(one).map(([, held]) => held)).toEqual([true, false, false, false]);
    const two = pinByHand(one, 0, 3, other("5", keys(one)[0]![3]));
    expect(pinsOf(two).map(([, held]) => held)).toEqual([true, false, true, false]);
    // Letting the later pin go frees the chord held for it; the one before the earlier pin stays.
    const back = pinByHand(two, 0, 3, undefined);
    expect(pinsOf(back)).toEqual(pinsOf(one));
    expect(keys(back)).toEqual(keys(one));
  });

  it("lets go of every held voicing on a change of movement, keeping the hand-picked ones", () => {
    const held = pinByHand(verse(), 0, 2, PIN);
    expect(pinsOf(clearHeldPins(held))).toEqual([[null, false], [null, false], [PIN, false], [null, false]]);
    // A phrase's own movement only frees that phrase's held voicings.
    const cut = splitPhraseAt(verse(), 2);
    const one = pinByHand(cut, 0, 1, other("6m", keys(cut)[0]![1]));
    const both = pinByHand(one, 1, 1, other("5", keys(one)[1]![1]));
    expect(pinsOf(both).map(([, h]) => h)).toEqual([true, false, true, false]);
    expect(pinsOf(clearHeldPins(both, 0)).map(([, h]) => h)).toEqual([false, false, true, false]);
    expect(pinsOf(clearHeldPins(both, 1)).map(([, h]) => h)).toEqual([true, false, false, false]);
  });

  it("never reaches back into an earlier phrase: the seam only pulls forwards", () => {
    const split = splitPhraseAt(verse(), 2);
    const free = keys(split);
    const held = pinByHand(split, 1, 0, PIN);
    expect(pinsOf(held)).toEqual([[null, false], [null, false], [PIN, false], [null, false]]); // nothing to hold
    expect(keys(held)[0]).toEqual(free[0]);
    expect(keys(held)[1]![0]).toBe(PIN);
  });

  it("carries both kinds of pin through an edit, and drops the held ones it leaves without a purpose", () => {
    const held = pinByHand(verse(), 0, 2, PIN);
    expect(pinsOf(retokenizeSection(held, ["1", "6m", "4", "5"], "G"))).toEqual(pinsOf(held));
    expect(pinsOf(redetectSection(held, "G"))).toEqual(pinsOf(held));
    // Retyping the pinned chord drops its pin, and the held ones go with it.
    expect(pinsOf(retokenizeSection(held, ["1", "6m", "2m", "5"], "G"))).toEqual([[null, false], [null, false], [null, false], [null, false]]);
    // A cut that leaves the held chords a phrase of their own lets them go too.
    expect(pinsOf(splitPhraseAt(held, 2))).toEqual([[null, false], [null, false], [PIN, false], [null, false]]);
    // "Unpin this phrase's shapes" clears both kinds.
    expect(pinsOf(clearPhrasePins(held, 0))).toEqual([[null, false], [null, false], [null, false], [null, false]]);
  });

  it("does not show a held voicing as the player's pick, and still calls the engine's choice the path pick", () => {
    const held = pinByHand(verse(), 0, 2, PIN);
    const ctx = (i: number) => voicingContext(held, "G", sectionPaths(held), 0, 0, i);
    expect([ctx(0).pinned, ctx(1).pinned, ctx(2).pinned, ctx(3).pinned]).toEqual([false, false, true, false]);
    // PATH PICK still means: what the engine would choose here with this chord let go and the rest kept.
    expect(candKey(ctx(0).pathPick!)).toBe(candKey(solve(setSlotPin(held, 0, undefined))[0].path![0]));
  });

  it("turns a held voicing into the player's own once they pick in its picker", () => {
    const held = pinByHand(verse(), 0, 2, PIN);
    const [zero, one] = pinsOf(held);
    const mine = pinByHand(held, 0, 0, zero[0]!);
    expect(pinsOf(mine)).toEqual([[zero[0], false], one, [PIN, false], [null, false]]);
  });

  it("stores and reads back both kinds of pin", () => {
    const held = pinByHand(verse(), 0, 2, PIN);
    const round: unknown = JSON.parse(JSON.stringify(held));
    expect(isSection(round)).toBe(true);
    expect(pinsOf(round as Section)).toEqual(pinsOf(held));
    // A payload written before holding existed: a pin with no `held` is the player's own.
    const slot = (extra: Record<string, unknown>) => ({ token: "1", role: "structural", ...extra });
    const stored = (s: Record<string, unknown>) => ({ name: "Verse", phrases: [{ origin: "detected", slots: [s] }] });
    expect(isSection(stored(slot({ pin: PIN })))).toBe(true);
    expect(isUserPin(slot({ pin: PIN }) as Slot)).toBe(true);
    expect(isSection(stored(slot({ pin: PIN, held: true })))).toBe(true);
    expect(isSection(stored(slot({ pin: PIN, held: "yes" })))).toBe(false);
  });
});
