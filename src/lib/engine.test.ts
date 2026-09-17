import { describe, expect, it } from "vitest";
import {
  detectPhrases, phraseTokens, kBest, candidates, parseProgression, STRATEGIES, solveSection, planPhrase,
  importChart, chartToSections, sectionTokens, splitPhraseAt, joinPhraseAt, retokenizeSection, redetectSection,
  phraseLyrics, lyricText, Section, Role,
} from "./engine";
import { ugContentToChart, ugKeyToSongKey } from "./ug-chart";
import { formatCount, groupResults, popularity, type UgResult } from "./ug-group";

const toks = (s: string) => s.split(/\s+/).filter(Boolean);
const shape = (phrases: ReturnType<typeof detectPhrases>) =>
  phrases.map((p) => p.slots.map((s) => (s.role === "passing" ? `(${s.token})` : s.token)).join(" "));

describe("parseProgression chromatic degrees", () => {
  it("reads b7, b6, b3 and #4 as major chords on the altered degree", () => {
    const { chords, errors } = parseProgression("1 b7 4 b6 b3 #4", "G");
    expect(errors).toEqual([]);
    expect(chords.map((c) => c.name)).toEqual(["G", "F", "C", "D#", "A#", "C#"]);
    expect(chords.map((c) => c.degree)).toEqual(["1", "b7", "4", "b6", "b3", "#4"]);
    expect(chords.map((c) => c.label)).toEqual(["1", "b7", "4", "b6", "b3", "#4"]);
    expect(chords.every((c) => c.q === "maj")).toBe(true);
  });

  it("takes a suffix and a slash bass on an altered degree, and spells flat keys flat", () => {
    const { chords } = parseProgression("b7sus4 b7/1 b3m", "F");
    expect(chords.map((c) => c.name)).toEqual(["Ebsus4", "Eb/F", "Abm"]);
    expect(chords.map((c) => c.label)).toEqual(["b7sus4", "b7/1", "b3m"]);
    expect(chords.map((c) => c.degree)).toEqual(["b7sus4", "b7/1", "b3m"]);
  });

  it("counts altered degrees as number tokens, so a number chart stays a number chart", () => {
    const { sections, key } = chartToSections("[Verse]\n1 b7 4 1\n[Chorus]\n4 5 1 b7", "A");
    expect(key).toBe("A");
    expect(sections.map((s) => sectionTokens(s))).toEqual([["1", "b7", "4", "1"], ["4", "5", "1", "b7"]]);
  });

  it("still rejects junk", () => {
    expect(parseProgression("b8 #x bb7 h7", "C").errors).toEqual(["b8", "#x", "bb7", "h7"]);
  });
});

describe("detectPhrases", () => {
  it("cuts an exact 3x repeat into three phrases sharing a pattern", () => {
    const ph = detectPhrases(toks("4 5 6m 1 4 5 6m 1 4 5 6m 1"), "G");
    expect(shape(ph)).toEqual(["4 5 6m 1", "4 5 6m 1", "4 5 6m 1"]);
    expect(new Set(ph.map((p) => p.patternId))).toEqual(new Set(["4-5-6m-1"]));
    expect(ph.every((p) => p.origin === "detected")).toBe(true);
  });

  it("finds the repeat through passing chords (4-5-6-1 three times, extras in between)", () => {
    const ph = detectPhrases(toks("4 5 6m 1 4 5 6m 1 2m 4 5 6m 1 5"), "G");
    expect(shape(ph)).toEqual(["4 5 6m 1", "4 5 6m 1", "(2m) 4 5 6m 1 (5)"]);
    expect(ph.map((p) => p.patternId)).toEqual(["4-5-6m-1", "4-5-6m-1", "4-5-6m-1"]);
  });

  it("marks a chord inside the template as passing", () => {
    const ph = detectPhrases(toks("1 5 6m 4 1 5 3m 6m 4 1 5 6m 4"), "C");
    expect(shape(ph)).toEqual(["1 5 6m 4", "1 5 (3m) 6m 4", "1 5 6m 4"]);
  });

  it("accepts a truncated final occurrence", () => {
    const ph = detectPhrases(toks("4 5 6m 1 4 5 6m 1 4 5 1"), "G");
    expect(shape(ph)).toEqual(["4 5 6m 1", "4 5 6m 1", "4 5 1"]);
    expect(ph[2].patternId).toBe("4-5-6m-1");
  });

  it("leaves a section with no repeat as a single structural phrase", () => {
    const ph = detectPhrases(toks("1 5 6m 4"), "G");
    expect(shape(ph)).toEqual(["1 5 6m 4"]);
    expect(ph[0].patternId).toBeUndefined();
    expect(shape(detectPhrases(toks("1 4 2m 5 3m 6m 7° 1"), "C"))).toEqual(["1 4 2m 5 3m 6m 7° 1"]);
  });

  it("treats consecutive duplicate tokens as one chord when matching", () => {
    const ph = detectPhrases(toks("1 1 5 5 6m 6m 4 4 1 1 5 5 6m 6m 4 4"), "G");
    expect(shape(ph)).toEqual(["1 1 5 5 6m 6m 4 4", "1 1 5 5 6m 6m 4 4"]);
  });

  it("matches numbers against letter names in the same key", () => {
    const ph = detectPhrases(toks("G D Em C 1 5 6m 4"), "G");
    expect(ph).toHaveLength(2);
    expect(ph[0].patternId).toBe(ph[1].patternId);
  });

  it("prefers a boundary on a bar line and keeps bar marks on slots", () => {
    const tokens = toks("1 5 6m 4 1 5 6m 4");
    const bars = [true, false, false, false, true, false, false, false];
    const ph = detectPhrases(tokens, "G", { bars });
    expect(ph.map(phraseTokens)).toEqual([["1", "5", "6m", "4"], ["1", "5", "6m", "4"]]);
    expect(ph[1].slots[0].bar).toBe(true);
    expect(ph[1].slots[1].bar).toBeUndefined();
  });

  it("puts a long run of unrelated chords in its own phrase", () => {
    const ph = detectPhrases(toks("1 5 6m 4 1 5 6m 4 2m 3m 4 5 6m 7°"), "C");
    expect(shape(ph)).toEqual(["1 5 6m 4", "1 5 6m 4", "2m 3m 4 5 6m 7°"]);
    expect(ph[2].patternId).toBeUndefined();
  });
});

describe("kBest with roles", () => {
  const strat = (id: string) => STRATEGIES.find((s) => s.id === id)!;
  const lists = (text: string, key = "G") => parseProgression(text, key).chords.map(candidates);

  // Hand-built voicings with chosen heights, so the rule itself is what's under test.
  const fake = (avg: number, token = "1") => ({ set: "1-3" as const, frets: [avg, avg, avg], tones: [0, 4, 7], avg, chord: parseProgression(token, "C").chords[0] });

  it("judges climb between structural chords only, skipping passing ones", () => {
    const climb = strat("climb");
    const a = [fake(5)], dip = [fake(3, "5")], up = [fake(6)], down = [fake(4)];
    expect(kBest([a, dip, up], climb, 4)).toEqual([]);                                     // 5 → 3 breaks the climb
    expect(kBest([a, dip, up], climb, 4, { roles: ["structural", "passing", "structural"] })).toHaveLength(1); // 3 is glue
    expect(kBest([a, dip, down], climb, 4, { roles: ["structural", "passing", "structural"] })).toEqual([]);   // 5 → 4 still checked across the glue
  });

  it("climbs through a real passing chord", () => {
    const text = "4 5 6m 1 2m 4 5 6m 1";
    const roles: Role[] = text.split(" ").map((t) => (t === "2m" ? "passing" : "structural"));
    const paths = kBest(lists(text), strat("climb"), 4, { roles });
    expect(paths.length).toBeGreaterThan(0);
    const structural = paths[0].filter((_, i) => roles[i] === "structural").map((c) => c.avg);
    expect(structural.every((v, i) => i === 0 || v > structural[i - 1])).toBe(true);
  });

  it("pins structural chords to the reference voicings", () => {
    const l = lists("4 5 6m 1");
    const ref = kBest(l, strat("stay"), 1)[0];
    const pinned = kBest(l, strat("high"), 3, { pin: ref });
    expect(pinned[0].map((c) => c.frets)).toEqual(ref.map((c) => c.frets));
  });
});

describe("solveSection", () => {
  const section = (text: string, repeat: "same" | "vary", strategyId = "stay"): Section => ({
    name: "Chorus", phrases: detectPhrases(toks(text), "G"), repeat, strategyId,
  });
  const solve = (s: Section) => solveSection(s, s.phrases.map((p) => planPhrase(p, "G")), { alt: 0, K: 8 });
  const structural = (s: Section, i: number, r: ReturnType<typeof solve>) => {
    const roles = planPhrase(s.phrases[i], "G").units.map((u) => u.role);
    return r[i].path!.filter((_, k) => roles[k] === "structural").map((c) => c.frets.join("."));
  };

  it("'same' plays every occurrence with the first one's structural shapes", () => {
    const s = section("4 5 6m 1 4 5 6m 1 2m 4 5 6m 1 5", "same");
    const r = solve(s);
    expect(r).toHaveLength(3);
    expect(structural(s, 1, r)).toEqual(structural(s, 0, r));
    expect(structural(s, 2, r)).toEqual(structural(s, 0, r));
  });

  it("'vary' makes the second occurrence differ from the first", () => {
    const s = section("4 5 6m 1 4 5 6m 1 4 5 6m 1", "vary");
    const r = solve(s);
    expect(structural(s, 1, r)).not.toEqual(structural(s, 0, r));
  });

  it("climb succeeds per phrase where it failed for the whole section", () => {
    const s = section("4 5 6m 1 4 5 6m 1 2m 4 5 6m 1 5", "vary", "climb");
    const r = solve(s);
    expect(r.every((x) => x.path && x.count > 0)).toBe(true);
  });
});

describe("chart import", () => {
  it("keeps bar lines, expands % and x2, and no longer collapses repeats", () => {
    const secs = importChart("Verse\n| G | G | C | % | x2");
    expect(secs).toHaveLength(1);
    expect(secs[0].chords).toEqual(["G", "G", "C", "C", "G", "G", "C", "C"]);
    expect(secs[0].bars).toEqual([true, true, true, true, true, true, true, true]);
  });

  it("gives ChordPro lines chords without bar marks", () => {
    const secs = importChart("[G]Hello [D]there [Em]friend");
    expect(secs[0].chords).toEqual(["G", "D", "Em"]);
    expect(secs[0].bars).toEqual([false, false, false]);
  });

  it("builds sections with detected phrases and bar-marked slots", () => {
    const { sections, key } = chartToSections("Chorus\n| C | G | Am | F |\n| C | G | Am | F |", "G");
    expect(key).toBe("C");
    expect(sections[0].phrases).toHaveLength(2);
    expect(sectionTokens(sections[0])).toEqual(["1", "5", "6m", "4", "1", "5", "6m", "4"]);
    expect(sections[0].phrases[1].slots[0].bar).toBe(true);
  });
});

describe("manual phrase edits", () => {
  const sec: Section = { name: "Song", phrases: detectPhrases(toks("1 5 6m 4 1 5 6m 4"), "G") };

  it("splits and rejoins on phrase boundaries, marking them manual", () => {
    const split = splitPhraseAt(sec, 2);
    expect(split.phrases.map(phraseTokens)).toEqual([["1", "5"], ["6m", "4"], ["1", "5", "6m", "4"]]);
    expect(split.phrases[0].origin).toBe("manual");
    expect(split.phrases[0].patternId).toBeUndefined();
    expect(split.phrases[2].origin).toBe("detected");
    const joined = joinPhraseAt(split, 1);
    expect(joined.phrases.map(phraseTokens)).toEqual([["1", "5", "6m", "4"], ["1", "5", "6m", "4"]]);
    expect(joined.phrases[0].origin).toBe("manual");
    expect(splitPhraseAt(sec, 0)).toBe(sec);
    expect(splitPhraseAt(sec, 4)).toBe(sec);
  });

  it("retokenizing keeps manual boundaries for a same-length edit, redetects otherwise", () => {
    const split = splitPhraseAt(sec, 2);
    const swapped = retokenizeSection(split, toks("1 4 6m 4 1 5 6m 4"), "G");
    expect(swapped.phrases.map(phraseTokens)).toEqual([["1", "4"], ["6m", "4"], ["1", "5", "6m", "4"]]);
    const grown = retokenizeSection(split, toks("1 5 6m 4 1 5 6m 4 1 5 6m 4"), "G");
    expect(grown.phrases).toHaveLength(3);
    expect(grown.phrases.every((p) => p.origin === "detected")).toBe(true);
  });
});

describe("Ultimate Guitar import", () => {
  const UG_CONTENT = [
    "[Intro]",
    "[ch]F#m7[/ch] [ch]A[/ch]  [ch]Esus4[/ch]  [ch]B7sus4[/ch]",
    "[ch]F#m7[/ch] [ch]A[/ch]  [ch]Esus4[/ch]  [ch]B7sus4[/ch]",
    "",
    "[Verse 1]",
    "[tab][ch]F#m7[/ch]          [ch]A[/ch]",
    "    Today is gonna be the day[/tab]",
    "[tab]              [ch]Esus4[/ch]                  [ch]B7sus4[/ch]",
    "That they're gonna throw it back to you[/tab]",
    "",
    "[Verse 2]",
    "[tab][ch]F#m7[/ch]              [ch]A[/ch]",
    "    Backbeat the word is on the street[/tab]",
    "[tab]          [ch]Esus4[/ch]                 [ch]B7sus4[/ch]",
    "That the fire in your heart is out[/tab]",
    "",
    "[Pre-chorus]",
    "[tab]     [ch]D[/ch]                [ch]Esus4[/ch]            [ch]F#m[/ch]",
    "And all the roads we have to walk are winding[/tab]",
  ].join("\r\n");

  it("strips [ch] and [tab] markup and normalises line endings", () => {
    const chart = ugContentToChart(UG_CONTENT);
    expect(chart).not.toMatch(/\[\/?(ch|tab)\]/);
    expect(chart).not.toContain("\r");
    expect(chart.split("\n")[1]).toBe("F#m7 A  Esus4  B7sus4");
    expect(chart).toContain("[Verse 1]");
  });

  it("imports UG sections with their chords", () => {
    const secs = importChart(ugContentToChart(UG_CONTENT));
    expect(secs.map((s) => s.name)).toEqual(["Intro", "Verse 1", "Verse 2", "Pre-chorus"]);
    expect(secs[0].chords.slice(0, 4)).toEqual(["F#m7", "A", "Esus4", "B7sus4"]);
    expect(secs[1].chords).toEqual(["F#m7", "A", "Esus4", "B7sus4"]);
    expect(secs[3].chords).toEqual(["D", "Esus4", "F#m"]);
  });

  it("keeps the words under the chords, split at the chord columns", () => {
    const secs = importChart(ugContentToChart(UG_CONTENT));
    expect(secs[0].lyrics).toBeUndefined(); // the Intro has no words
    expect(secs[1].lyrics).toEqual([
      { segments: [{ text: "    Today is g", slot: 0 }, { text: "onna be the day", slot: 1 }] },
      { segments: [{ text: "That they're g" }, { text: "onna throw it back to y", slot: 2 }, { text: "ou", slot: 3 }] },
    ]);
    expect(secs[3].lyrics).toEqual([
      { segments: [{ text: "And a" }, { text: "ll the roads we h", slot: 0 }, { text: "ave to walk are w", slot: 1 }, { text: "inding", slot: 2 }] },
    ]);
  });

  it("uses the key UG reports instead of detecting one", () => {
    const chart = ugContentToChart(UG_CONTENT);
    const forced = chartToSections(chart, "G", { key: ugKeyToSongKey("F#m") ?? undefined });
    expect(forced.key).toBe("A");
    expect(sectionTokens(forced.sections[0]).slice(0, 4)).toEqual(["6m7", "1", "5sus4", "2sus4"]);
    // Nonsense keys fall back to detection rather than breaking the import.
    expect(chartToSections(chart, "G", { key: undefined }).sections).toHaveLength(4);
  });

  it("maps UG tonality names onto the app's major keys", () => {
    expect(ugKeyToSongKey("F#m")).toBe("A");
    expect(ugKeyToSongKey("Bb")).toBe("Bb");
    expect(ugKeyToSongKey("A#")).toBe("Bb");
    expect(ugKeyToSongKey("Ebm")).toBe("Gb");
    expect(ugKeyToSongKey("")).toBeNull();
    expect(ugKeyToSongKey(null)).toBeNull();
    expect(ugKeyToSongKey("H")).toBeNull();
  });

  it("skips ASCII tab staff lines instead of reading them as chords", () => {
    const staff = [
      "[Outro]",
      "[tab]e|-------5-2-------|",
      "B|-3-2-3-----------|",
      "G|-----------------| x8",
      "D|-----------------|",
      "A|-----------------|",
      "E|-----------------|[/tab]",
      "",
      "[ch]D[/ch]  [ch]F#m7[/ch] [ch]A[/ch]  [ch]F#m7[/ch]",
    ].join("\n");
    const secs = importChart(ugContentToChart(staff));
    expect(secs).toHaveLength(1);
    expect(secs[0].chords).toEqual(["D", "F#m7", "A", "F#m7"]);
    // Bar-line chord charts and plain chord lines are not staff lines.
    expect(importChart("| G | G | C | % |")[0].chords).toEqual(["G", "G", "C", "C"]);
    expect(importChart("B A E")[0].chords).toEqual(["B", "A", "E"]);
  });

  it("recognises [Solo] as a section header", () => {
    const secs = importChart("[Solo]\nA D E\n[Outro]\nA");
    expect(secs.map((s) => s.name)).toEqual(["Solo", "Outro"]);
  });
});

describe("Ultimate Guitar result grouping", () => {
  const r = (id: number, songName: string, artistName: string, version: number, votes: number, rating = 4.5): UgResult =>
    ({ id, songName, artistName, version, votes, rating, key: null, cover: null, url: `https://tabs.ultimate-guitar.com/tab/x/${id}` });

  it("groups versions of one song, picks the most-voted primary, keeps first-seen order", () => {
    const groups = groupResults([
      r(1, "The Transformers Theme", "Lion", 1, 0),
      r(2, "Lion", "Elevation Worship", 1, 229),
      r(3, "Lion", "Elevation Worship", 2, 19),
      r(4, "Lion", "elevation worship ", 3, 36),
      r(5, "Lion", "Camelione", 1, 0),
    ]);
    expect(groups.map((g) => g.songName + "/" + g.artistName)).toEqual([
      "The Transformers Theme/Lion", "Lion/Elevation Worship", "Lion/Camelione",
    ]);
    expect(groups[1].primary.id).toBe(2);
    expect(groups[1].versions.map((v) => v.version)).toEqual([1, 2, 3]);
    expect(groups[1].votes).toBe(229);
  });

  it("breaks vote ties by rating then lowest version, and ignores duplicate ids", () => {
    const groups = groupResults([r(1, "A", "B", 3, 10, 4.0), r(2, "A", "B", 1, 10, 4.0), r(3, "A", "B", 2, 10, 4.8), r(3, "A", "B", 2, 10, 4.8)]);
    expect(groups).toHaveLength(1);
    expect(groups[0].primary.id).toBe(3);
    expect(groups[0].versions).toHaveLength(3);
  });

  it("scales popularity logarithmically and formats counts", () => {
    expect(popularity(2497, 2497)).toBe(1);
    expect(popularity(0, 2497)).toBe(0);
    expect(popularity(3, 2497)).toBeGreaterThan(0.1);
    expect(popularity(3, 2497)).toBeLessThan(0.25);
    expect(formatCount(229)).toBe("229");
    expect(formatCount(2497)).toBe("2.5k");
    expect(formatCount(12000)).toBe("12k");
  });
});

describe("lyrics", () => {
  const verse = [
    "[Verse]",
    "G    C",
    "Hello there",
    "G    C",
    "How are you",
    "la la la",
    "D Em",
  ].join("\n");

  it("reads ChordPro words as the text after each chord, with a leading segment", () => {
    expect(importChart("[G]Hello [D]there [Em]friend")[0].lyrics).toEqual([
      { segments: [{ text: "Hello ", slot: 0 }, { text: "there ", slot: 1 }, { text: "friend", slot: 2 }] },
    ]);
    expect(importChart("Oh [G]hello")[0].lyrics).toEqual([{ segments: [{ text: "Oh " }, { text: "hello", slot: 0 }]}]);
    expect(importChart("[G] [D]")[0].lyrics).toBeUndefined();
  });

  it("keeps chordless lines and gives instrumental chord lines no line", () => {
    const [sec] = importChart(verse);
    expect(sec.chords).toEqual(["G", "C", "G", "C", "D", "Em"]);
    expect(sec.lyrics).toEqual([
      { segments: [{ text: "Hello", slot: 0 }, { text: " there", slot: 1 }] },
      { segments: [{ text: "How a", slot: 2 }, { text: "re you", slot: 3 }] },
      { segments: [{ text: "la la la" }] },
    ]);
    expect(importChart("[Verse]\nG C\nD Em")[0].lyrics).toBeUndefined();
    // Words only count when they sit under chords or inside a section.
    expect(importChart("Just words\n[Verse]\nG C")[0].lyrics).toBeUndefined();
  });

  it("gives chords added by x2 empty segments", () => {
    const [sec] = importChart("[Verse]\nG    C  x2\nHello there");
    expect(sec.chords).toEqual(["G", "C", "G", "C"]);
    expect(sec.lyrics).toEqual([{ segments: [
      { text: "Hello", slot: 0 }, { text: " there", slot: 1 }, { text: "", slot: 2 }, { text: "", slot: 3 },
    ] }]);
  });

  it("remaps slots when a chord is dropped on conversion, merging its words into the previous segment", () => {
    const { sections } = chartToSections("[Verse]\nG   1   C\nHello there friend", "C", { key: "G" });
    expect(sectionTokens(sections[0])).toEqual(["1", "4"]);
    expect(sections[0].lyrics).toEqual([{ segments: [{ text: "Hello th", slot: 0 }, { text: "ere friend", slot: 1 }] }]);
  });

  it("cuts phrases at the lyric lines and shares a pattern between repeated lines", () => {
    const { sections: [sec] } = chartToSections(verse, "C", { key: "G" });
    expect(sec.phrases.map(phraseTokens)).toEqual([["1", "4"], ["1", "4"], ["5", "6m"]]);
    expect(sec.phrases.map((p) => p.patternId)).toEqual(["1-4", "1-4", undefined]);
    expect(sec.phrases.every((p) => p.origin === "detected")).toBe(true);
    expect(redetectSection(splitPhraseAt(sec, 1), "G")).toEqual(sec);
  });

  it("keeps lyrics through a same-length retokenize and drops them otherwise", () => {
    const { sections: [sec] } = chartToSections(verse, "C", { key: "G" });
    const swapped = retokenizeSection(sec, ["1", "4", "1", "4", "5", "3m"], "G");
    expect(swapped.lyrics).toEqual(sec.lyrics);
    expect(swapped.phrases.map(phraseTokens)).toEqual([["1", "4"], ["1", "4"], ["5", "3m"]]);
    const grown = retokenizeSection(sec, ["1", "4", "5", "6m", "1"], "G");
    expect(grown.lyrics).toBeUndefined();
    expect(grown.phrases.map(phraseTokens)).toEqual([["1", "4", "5", "6m", "1"]]);
  });

  it("lays lines onto phrases, splitting a line at a manual cut and joining it back", () => {
    const { sections: [sec] } = chartToSections(verse, "C", { key: "G" });
    expect(phraseLyrics(sec)).toEqual([
      [{ segments: [{ text: "Hello", slot: 0 }, { text: " there", slot: 1 }] }],
      [{ segments: [{ text: "How a", slot: 2 }, { text: "re you", slot: 3 }] }, { segments: [{ text: "la la la" }] }],
      [{ segments: [{ text: "", slot: 4 }, { text: "", slot: 5 }] }],
    ]);
    const split = splitPhraseAt(sec, 1);
    expect(split.lyrics).toBe(sec.lyrics);
    expect(split.phrases.map(phraseTokens)).toEqual([["1"], ["4"], ["1", "4"], ["5", "6m"]]);
    expect(phraseLyrics(split).slice(0, 2)).toEqual([
      [{ segments: [{ text: "Hello", slot: 0 }] }],
      [{ segments: [{ text: " there", slot: 1 }] }],
    ]);
    expect(phraseLyrics(joinPhraseAt(split, 1))[0]).toEqual(phraseLyrics(sec)[0]);
    expect(lyricText(phraseLyrics(sec)[1])).toBe("How are you la la la");
    expect(lyricText(phraseLyrics(sec)[2])).toBe("");
  });

  it("gives sections without lyrics one wordless line per phrase", () => {
    const sec: Section = { name: "Song", phrases: detectPhrases(toks("1 5 6m 4 1 5 6m 4"), "G") };
    expect(phraseLyrics(sec)).toEqual([
      [{ segments: [0, 1, 2, 3].map((slot) => ({ text: "", slot })) }],
      [{ segments: [4, 5, 6, 7].map((slot) => ({ text: "", slot })) }],
    ]);
  });
});
