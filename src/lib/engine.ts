// Triad Paths engine — chords, voicings, path strategies, chart import.

export const SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
export const FLAT  = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
const NOTE: Record<string, number> = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
export const KEYS = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
const FLAT_KEYS = new Set(["F","Bb","Eb","Ab","Db","Gb"]);

export type SetId = "1-3" | "2-4" | "3-5";
export const SETS: Record<SetId, { open: number[]; label: string; lane: number }> = {
  "1-3": { open: [7, 11, 4], label: "str 1–3", lane: 0 },
  "2-4": { open: [2, 7, 11], label: "str 2–4", lane: 1 },
  "3-5": { open: [9, 2, 7], label: "str 3–5", lane: 2 },
};
export const MAX_FRET = 15;

const DEG_SEMI = [NaN, 0, 2, 4, 5, 7, 9, 11];
export type Quality = "maj" | "min" | "dim" | "sus2" | "sus4" | "7" | "maj7" | "m7" | "m7b5";
const DIATONIC: Quality[] = ["maj", "maj", "min", "min", "maj", "maj", "min", "dim"]; // index by degree, 0 unused

export const QUAL: Record<Quality, { ints: number[]; fam: "maj" | "min" | "dim" | "sus"; disp: string }> = {
  maj:  { ints: [0, 4, 7],  fam: "maj", disp: "" },
  min:  { ints: [0, 3, 7],  fam: "min", disp: "m" },
  dim:  { ints: [0, 3, 6],  fam: "dim", disp: "°" },
  sus2: { ints: [0, 2, 7],  fam: "sus", disp: "sus2" },
  sus4: { ints: [0, 5, 7],  fam: "sus", disp: "sus4" },
  "7":  { ints: [0, 4, 10], fam: "maj", disp: "7" },
  maj7: { ints: [0, 4, 11], fam: "maj", disp: "maj7" },
  m7:   { ints: [0, 3, 10], fam: "min", disp: "m7" },
  m7b5: { ints: [0, 3, 10], fam: "dim", disp: "ø7" },
};

const SUFFIX: [RegExp, Quality | null][] = [
  [/^$/, null],
  [/^(m|min|-)$/, "min"],
  [/^(M|Maj)$/, "maj"],
  [/^(dim7?|°|o)$/, "dim"],
  [/^sus2$/, "sus2"],
  [/^(sus4?|sus)$/, "sus4"],
  [/^(2|add2|add9)$/, "sus2"],
  [/^(7|9|11|13)$/, "7"],
  [/^(maj7|maj9|M7|M9|Δ)$/, "maj7"],
  [/^(m7|min7|-7|m9|min9|m11|m13)$/, "m7"],
  [/^(m7b5|ø7?|m7-5)$/, "m7b5"],
  [/^(6|69|6\/9)$/, "maj"],
  [/^m6$/, "min"],
  [/^(aug|\+)$/, "maj"],
];

function normSuffix(str: string): { ok: boolean; q: Quality | null } {
  for (const [re, q] of SUFFIX) if (re.test(str)) return { ok: true, q };
  return { ok: false, q: null };
}

export function keySemi(k: string): number {
  const m = k.match(/^([A-G])([#b]?)$/)!;
  return (NOTE[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + 12) % 12;
}

export interface Chord { root: number; q: Quality; label: string; name: string; degree: string; literal: boolean }

// Chromatic roots have no scale degree, so spell them as alterations of one.
const ALT_DEG: Record<number, string> = { 1: "b2", 3: "b3", 6: "#4", 8: "b6", 10: "b7" };

/**
 * Scale-degree label for a chord: "1", "6m", "5M", "b7" — the number plus a
 * suffix only when the quality is not the one the key already implies
 * (chromatic roots are assumed major, as borrowed chords usually are).
 */
export function degreeLabel(root: number, q: Quality, ks: number): string {
  const semi = ((root - ks) % 12 + 12) % 12;
  const d = DEG_SEMI.indexOf(semi);
  const num = d > 0 ? String(d) : ALT_DEG[semi];
  const want: Quality = d > 0 ? DIATONIC[d] : "maj";
  if (q === want) return num + (want === "min" ? "m" : want === "dim" ? "°" : "");
  return num + (QUAL[q].disp || "M");
}

interface ParsedSymbol { root: number; q: Quality; flat: boolean; sharp: boolean }

export function parseChordSymbol(tok: string): ParsedSymbol | null {
  const base = tok.replace(/\/[A-G][#b]?$/, "");
  const m = base.match(/^([A-G])([#b]?)(.*)$/);
  if (!m) return null;
  const n = normSuffix(m[3]);
  if (!n.ok) return null;
  return {
    root: (NOTE[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + 12) % 12,
    q: n.q ?? "maj", flat: m[2] === "b", sharp: m[2] === "#",
  };
}

export function isNumToken(t: string): boolean {
  const base = t.replace(/\/[1-7]$/, "");
  const m = base.match(/^([1-7])(.*)$/);
  return !!(m && normSuffix(m[2]).ok);
}

export function parseProgression(text: string, key: string): { chords: Chord[]; errors: string[] } {
  const ks = keySemi(key);
  const toks = text.replace(/[|,]/g, " ").split(/\s+/).filter(Boolean);
  const chords: Chord[] = [];
  const errors: string[] = [];
  let flats = FLAT_KEYS.has(key);
  for (const tok of toks) {
    const base = tok.replace(/\/[1-7]$/, "");
    const m = base.match(/^([1-7])(.*)$/);
    const ns = m ? normSuffix(m[2]) : { ok: false, q: null };
    if (m && ns.ok) {
      const d = +m[1];
      const q = ns.q ?? DIATONIC[d];
      const root = (ks + DEG_SEMI[d]) % 12;
      chords.push({
        root, q,
        label: m[1] + (q === DIATONIC[d] && !m[2] ? "" : QUAL[q].disp || "M"),
        name: "", degree: degreeLabel(root, q, ks), literal: false,
      });
    } else {
      const cs = parseChordSymbol(tok);
      if (!cs) { errors.push(tok); continue; }
      if (cs.flat) flats = true;
      if (cs.sharp) flats = false;
      chords.push({ root: cs.root, q: cs.q, label: "", name: "", degree: degreeLabel(cs.root, cs.q, ks), literal: true });
    }
  }
  const names = flats ? FLAT : SHARP;
  for (const c of chords) {
    c.name = names[c.root] + QUAL[c.q].disp;
    if (!c.label) c.label = c.name;
  }
  return { chords, errors };
}

export function noteNames(key: string): string[] {
  return FLAT_KEYS.has(key) ? FLAT : SHARP;
}

// ---- voicings ----

export interface Cand { set: SetId; frets: number[]; tones: number[]; avg: number; chord: Chord }

function chordTones(root: number, q: Quality): number[][] {
  const [a, b, c] = QUAL[q].ints.map((iv) => (root + iv) % 12);
  return [[a, b, c], [b, c, a], [c, a, b]];
}

export function candidates(chord: Chord): Cand[] {
  const out: Cand[] = [];
  for (const sid of Object.keys(SETS) as SetId[]) {
    const set = SETS[sid];
    for (const tones of chordTones(chord.root, chord.q)) {
      let frets = tones.map((t, i) => ((t - set.open[i]) % 12 + 12) % 12);
      if (Math.max(...frets) - Math.min(...frets) > 6) frets = frets.map((f) => (f < 6 ? f + 12 : f));
      for (const o of [0, 12]) {
        const fr = frets.map((f) => f + o);
        if (Math.max(...fr) <= MAX_FRET)
          out.push({ set: sid, frets: fr, tones, avg: (fr[0] + fr[1] + fr[2]) / 3, chord });
      }
    }
  }
  return out;
}

// ---- path strategies ----

export interface Strategy {
  id: string; name: string; blurb: string;
  ok?: (a: Cand, b: Cand) => boolean;
  unary: (c: Cand) => number;
  trans: (a: Cand, b: Cand) => number;
  rerank?: boolean; fail?: string;
}

const lane = (c: Cand) => SETS[c.set].lane;
// The engine, not the user, picks string sets: hopping between adjacent sets
// (1-3 <-> 2-4) is cheap, reaching down to 3-5 costs a little more.
const setPen = (a: Cand, b: Cand) => 1.1 * Math.abs(lane(a) - lane(b));
const deepPen = (c: Cand) => (c.set === "3-5" ? 0.5 : 0);
const move = (a: Cand, b: Cand) => Math.abs(a.avg - b.avg);

export const STRATEGIES: Strategy[] = [
  { id: "stay", name: "Stay put", blurb: "Every chord within reach of the last.",
    unary: (c) => 0.01 * c.avg + deepPen(c), trans: (a, b) => move(a, b) + setPen(a, b), rerank: true },
  { id: "climb", name: "Climb", blurb: "Each chord higher than the one before.",
    ok: (a, b) => b.avg > a.avg + 0.01, unary: (c) => 0.02 * c.avg + deepPen(c),
    trans: (a, b) => (b.avg - a.avg) + setPen(a, b),
    fail: "Can't climb strictly through this many chords within 15 frets." },
  { id: "descend", name: "Descend", blurb: "Each chord lower than the one before.",
    ok: (a, b) => b.avg < a.avg - 0.01, unary: (c) => -0.02 * c.avg + deepPen(c),
    trans: (a, b) => (a.avg - b.avg) + setPen(a, b),
    fail: "Can't descend strictly through this many chords within 15 frets." },
  { id: "smooth", name: "Smooth", blurb: "Each string moves as little as possible; common tones stay.",
    unary: (c) => 0.01 * c.avg + deepPen(c),
    trans: (a, b) => a.set === b.set
      ? a.frets.reduce((s, f, i) => s + Math.abs(f - b.frets[i]), 0)
      : 6 + move(a, b) + setPen(a, b) },
  { id: "low", name: "Low", blurb: "Down near the nut — sits under an acoustic.",
    unary: (c) => c.avg + deepPen(c) * 0.3, trans: (a, b) => 0.3 * move(a, b) + setPen(a, b) },
  { id: "high", name: "High", blurb: "Past the 7th fret — cuts through a chorus.",
    unary: (c) => -c.avg + deepPen(c), trans: (a, b) => 0.3 * move(a, b) + setPen(a, b) },
];

export function kBest(lists: Cand[][], strat: Strategy, K: number): Cand[][] {
  if (!lists.length || lists.some((l) => !l.length)) return [];
  type P = { cost: number; path: Cand[] };
  let prev: P[][] = lists[0].map((c) => [{ cost: strat.unary(c), path: [c] }]);
  for (let i = 1; i < lists.length; i++) {
    const cur: P[][] = lists[i].map((c) => {
      const acc: P[] = [];
      lists[i - 1].forEach((p, pi) => {
        if (strat.ok && !strat.ok(p, c)) return;
        const t = strat.trans(p, c) + strat.unary(c);
        for (const pp of prev[pi]) acc.push({ cost: pp.cost + t, path: [...pp.path, c] });
      });
      acc.sort((a, b) => a.cost - b.cost);
      return acc.slice(0, K);
    });
    prev = cur;
  }
  const all = ([] as P[]).concat(...prev).sort((a, b) => a.cost - b.cost);
  let paths = all.slice(0, K).map((p) => p.path);
  if (strat.rerank) {
    const lo = (p: Cand[]) => Math.min(...p.map((c) => c.avg));
    const range = (p: Cand[]) => Math.max(...p.map((c) => c.avg)) - lo(p);
    paths = paths.slice().sort((a, b) => range(a) - range(b) || lo(a) - lo(b));
  }
  return paths;
}

export function randomPath(lists: Cand[][]): Cand[] | null {
  if (!lists.length || lists.some((l) => !l.length)) return null;
  return lists.map((l) => l[Math.floor(Math.random() * l.length)]);
}

// ---- chart import ----

const SECTION_RE = /^\s*(?:\[|\{start_of_)?\s*(verse|chorus|pre[- ]?chorus|bridge|intro|outro|tag|turnaround|interlude|instrumental|vamp|ending|refrain)\s*(\d*)\s*(?:\]|\})?\s*:?\s*$/i;

export interface RawSection { name: string; chords: string[] }

export function importChart(text: string): RawSection[] {
  const sections: RawSection[] = [];
  let cur: RawSection | null = null;
  const push = (n: string) => { cur = { name: n, chords: [] }; sections.push(cur); };
  const inline = /\[([A-G][#b]?[^\[\]\s]*)\]/g;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const sm = line.replace(/\./g, " ").trim().match(SECTION_RE);
    if (sm) { const n = sm[1][0].toUpperCase() + sm[1].slice(1).toLowerCase(); push(n + (sm[2] ? " " + sm[2] : "")); continue; }
    let found: string[] = []; let m2: RegExpExecArray | null;
    inline.lastIndex = 0;
    while ((m2 = inline.exec(line))) found.push(m2[1]);
    if (!found.length) {
      const toks = line.split(/[\s.]+/).map((t) => t.replace(/[(),]/g, "")).filter(Boolean);
      if (toks.length) {
        const good = toks.filter((t) => isNumToken(t) || parseChordSymbol(t));
        const noise = toks.filter((t) => /^(\||%|-+|x\d+|N\.?C\.?)$/i.test(t)).length;
        if (good.length && (good.length + noise) / toks.length >= 0.7) found = good;
      }
    }
    if (found.length) { if (!cur) push("Song"); cur!.chords.push(...found); }
  }
  return sections.filter((s) => s.chords.length);
}

export function detectKey(symbols: ParsedSymbol[]): string {
  let best = { score: -1, key: "C" };
  for (const k of KEYS) {
    const ks = keySemi(k); let sc = 0;
    for (const c of symbols) {
      const d = DEG_SEMI.indexOf(((c.root - ks) % 12 + 12) % 12);
      if (d > 0) {
        sc += 1;
        const fam = QUAL[c.q].fam, want = QUAL[DIATONIC[d]].fam;
        if (fam === want || fam === "sus") sc += 1;
        if (d === 1) sc += 0.5;
      }
    }
    const f = symbols[0], l = symbols[symbols.length - 1];
    if (f && (f.root - ks + 12) % 12 === 0) sc += 2;
    if (l && (l.root - ks + 12) % 12 === 0) sc += 3;
    if (sc > best.score) best = { score: sc, key: k };
  }
  return best.key;
}

export function toNumberToken(tok: string, key: string): string | null {
  const c = parseChordSymbol(tok);
  if (!c) return null;
  const ks = keySemi(key);
  const d = DEG_SEMI.indexOf(((c.root - ks) % 12 + 12) % 12);
  if (d < 1) return tok.replace(/\/[A-G][#b]?$/, "");
  return degreeLabel(c.root, c.q, ks);
}

export function collapseTokens(arr: string[]): string[] {
  const o: string[] = [];
  for (const t of arr) if (t !== o[o.length - 1]) o.push(t);
  return o;
}

export interface Section { name: string; tokens: string[] }

// ---- section naming (split / join) ----

// "Verse 2 (3)" -> "Verse 2". Only a trailing " (n)" counts as a split marker.
export function sectionBase(name: string): string {
  return name.replace(/ \(\d+\)$/, "");
}

// Number every section sharing `base` sequentially by position; a lone one loses its suffix.
export function renumberSections(secs: Section[], base: string): Section[] {
  const hits = secs.reduce<number[]>((a, s, i) => (sectionBase(s.name) === base ? [...a, i] : a), []);
  const out = secs.slice();
  hits.forEach((si, k) => {
    out[si] = { ...out[si], name: hits.length > 1 ? `${base} (${k + 1})` : base };
  });
  return out;
}

export function splitSectionAt(secs: Section[], sectionIndex: number, tokenIndex: number): Section[] {
  const s = secs[sectionIndex];
  if (!s) return secs;
  const a = s.tokens.slice(0, tokenIndex), b = s.tokens.slice(tokenIndex);
  if (!a.length || !b.length) return secs;
  const base = sectionBase(s.name);
  return renumberSections(
    [...secs.slice(0, sectionIndex), { name: base, tokens: a }, { name: base, tokens: b }, ...secs.slice(sectionIndex + 1)],
    base
  );
}

export function joinSectionAt(secs: Section[], sectionIndex: number): Section[] {
  const cur = secs[sectionIndex], before = secs[sectionIndex - 1];
  if (!cur || !before) return secs;
  const base = sectionBase(before.name);
  if (sectionBase(cur.name) !== base) return secs;
  return renumberSections(
    [
      ...secs.slice(0, sectionIndex - 1),
      { name: before.name, tokens: [...before.tokens, ...cur.tokens] },
      ...secs.slice(sectionIndex + 1),
    ],
    base
  );
}

export function chartToSections(text: string, currentKey: string): { sections: Section[]; key: string } {
  const secs = importChart(text);
  const flat = ([] as string[]).concat(...secs.map((x) => x.chords));
  if (!flat.length) return { sections: [], key: currentKey };
  const numeric = flat.filter(isNumToken).length;
  if (numeric >= flat.length / 2) {
    return { key: currentKey, sections: secs.map((x) => ({ name: x.name, tokens: collapseTokens(x.chords) })).filter((x) => x.tokens.length) };
  }
  const all = flat.map(parseChordSymbol).filter((x): x is ParsedSymbol => !!x);
  const key = detectKey(all);
  return {
    key,
    sections: secs.map((x) => ({
      name: x.name,
      tokens: collapseTokens(x.chords.map((t) => toNumberToken(t, key)).filter((t): t is string => !!t)),
    })).filter((x) => x.tokens.length),
  };
}
