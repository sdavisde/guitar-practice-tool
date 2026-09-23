// Triad Paths engine — chords, voicings, path strategies, chart import.

export const SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
export const FLAT  = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
const NOTE: Record<string, number> = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
export const KEYS = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
const FLAT_KEYS = new Set(["F","Bb","Eb","Ab","Db","Gb"]);

/** Standard tuning: semitones from the open 6th string to each open string, string 1 (high e) first. */
export const OPEN_PITCH = [24, 19, 15, 10, 5, 0];
/** Pitch class of open string `s`, 1 (high e) to 6 (low E). */
export const openString = (s: number): number => (OPEN_PITCH[s - 1] + 4) % 12;
/** The three strings of a set, low to high, as pitch classes. `top` is the set's highest string. */
const setOpen = (top: number) => [openString(top + 2), openString(top + 1), openString(top)];

export type SetId = "1-3" | "2-4" | "3-5";
export const SETS: Record<SetId, { open: number[]; label: string; lane: number }> = {
  "1-3": { open: setOpen(1), label: "str 1–3", lane: 0 },
  "2-4": { open: setOpen(2), label: "str 2–4", lane: 1 },
  "3-5": { open: setOpen(3), label: "str 3–5", lane: 2 },
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
  [/^(sus4?|sus|7sus4?|9sus4?)$/, "sus4"],
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

/** `bass` is the slash-chord bass note (semitone), when it isn't the root. Voicings ignore it: the triad is the same. */
export interface Chord { root: number; q: Quality; label: string; name: string; degree: string; literal: boolean; bass?: number }

// Chromatic roots have no scale degree, so spell them as alterations of one.
const ALT_DEG: Record<number, string> = { 1: "b2", 3: "b3", 6: "#4", 8: "b6", 10: "b7" };

/**
 * The chord the key itself builds `semi` semitones above its root: 1 and 4 and 5 major, 2 and 3
 * and 6 minor, 7 diminished. A chromatic degree has no chord in the key, so it is assumed major,
 * as borrowed chords (b3, b6, b7) usually are.
 */
export function impliedQuality(semi: number): Quality {
  const d = DEG_SEMI.indexOf(((semi % 12) + 12) % 12);
  return d > 0 ? DIATONIC[d] : "maj";
}

/**
 * Scale-degree label for a chord: "1", "6m", "5M", "b7" — the number plus a
 * suffix only when the quality is not the one the key already implies.
 */
export function degreeLabel(root: number, q: Quality, ks: number): string {
  const semi = ((root - ks) % 12 + 12) % 12;
  const d = DEG_SEMI.indexOf(semi);
  const num = d > 0 ? String(d) : ALT_DEG[semi];
  const want = impliedQuality(semi);
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

/** Degree tokens: "1", "6m", "5/7", and chromatic degrees "b7", "b6", "#4" (assumed major, as borrowed chords usually are). */
const DEGREE_RE = /^([#b]?)([1-7])(.*)$/;

export function isNumToken(t: string): boolean {
  const base = t.replace(/\/[1-7]$/, "");
  const m = base.match(DEGREE_RE);
  return !!(m && normSuffix(m[3]).ok);
}

function withBass(c: Chord, bass: number | undefined): Chord {
  return bass === undefined || bass === c.root ? c : { ...c, bass };
}

function bassDegree(bass: number, ks: number): string {
  const semi = ((bass - ks) % 12 + 12) % 12;
  const d = DEG_SEMI.indexOf(semi);
  return d > 0 ? String(d) : ALT_DEG[semi];
}

export function parseProgression(text: string, key: string): { chords: Chord[]; errors: string[] } {
  const ks = keySemi(key);
  const toks = text.replace(/[|,]/g, " ").split(/\s+/).filter(Boolean);
  const chords: Chord[] = [];
  const errors: string[] = [];
  let flats = FLAT_KEYS.has(key);
  for (const tok of toks) {
    const slash = tok.match(/\/([1-7])$/);
    const base = slash ? tok.slice(0, -2) : tok;
    const m = base.match(DEGREE_RE);
    const ns = m ? normSuffix(m[3]) : { ok: false, q: null };
    if (m && ns.ok) {
      const d = +m[2];
      const acc = m[1] === "#" ? 1 : m[1] === "b" ? -1 : 0;
      const implied: Quality = acc ? "maj" : DIATONIC[d];
      const q = ns.q ?? implied;
      const root = (ks + DEG_SEMI[d] + acc + 12) % 12;
      chords.push(withBass({
        root, q,
        label: m[1] + m[2] + (q === implied && !m[3] ? "" : QUAL[q].disp || "M") + (slash ? slash[0] : ""),
        name: "", degree: degreeLabel(root, q, ks), literal: false,
      }, slash ? (ks + DEG_SEMI[+slash[1]]) % 12 : undefined));
    } else {
      const cs = parseChordSymbol(tok);
      if (!cs) { errors.push(tok); continue; }
      if (cs.flat) flats = true;
      if (cs.sharp) flats = false;
      const bass = tok.match(/\/([A-G])([#b]?)$/);
      chords.push(withBass(
        { root: cs.root, q: cs.q, label: "", name: "", degree: degreeLabel(cs.root, cs.q, ks), literal: true },
        bass ? (NOTE[bass[1]] + (bass[2] === "#" ? 1 : bass[2] === "b" ? -1 : 0) + 12) % 12 : undefined,
      ));
    }
  }
  const names = flats ? FLAT : SHARP;
  for (const c of chords) {
    c.name = names[c.root] + QUAL[c.q].disp;
    if (c.bass !== undefined) {
      c.name += "/" + names[c.bass];
      c.degree += "/" + bassDegree(c.bass, ks);
    }
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

// ---- K-best paths ----

/**
 * What a chord does in its phrase. A passing chord is glue between the chords that carry the
 * progression: it still gets a shape, but a strategy's hard rule (climb, descend) is judged
 * only between structural chords.
 */
export type Role = "structural" | "passing";

export interface PathOpts {
  /** Voicing the previous phrase ended on. The first chord is pulled toward it — a cost, never a rule. */
  prev?: Cand;
  /** Role per chord; defaults to structural. */
  roles?: Role[];
  /** Force a chord onto this voicing (repeat mode "same"). */
  pin?: (Cand | undefined)[];
  /** Penalise landing on this voicing again (repeat mode "vary"). */
  avoid?: (Cand | undefined)[];
}

export const sameCand = (a: Cand, b: Cand) => a.set === b.set && a.frets.every((f, i) => f === b.frets[i]);
/** A voicing's identity as a string ("1-3:5-5-3"): what a hand-picked shape is stored as. */
export const candKey = (c: Cand): string => `${c.set}:${c.frets.join("-")}`;
const near = (a: Cand, b: Cand) => move(a, b) + setPen(a, b);
const SEAM = 0.5;       // weight of the pull toward the previous phrase's last voicing
const AVOID_PEN = 3;    // "vary": cost of reusing the previous occurrence's voicing...
const AVOID_SPAN = 2.5; // ...within this many frets on the same string set

function applyPins(lists: Cand[][], pin?: (Cand | undefined)[]): Cand[][] {
  if (!pin) return lists;
  return lists.map((l, i) => {
    const p = pin[i];
    if (!p) return l;
    const hit = l.filter((c) => sameCand(c, p));
    return hit.length ? hit : l;
  });
}

type PathState = { cost: number; path: Cand[]; ls?: Cand }; // ls = last structural voicing on the path

// Keep the K cheapest, but never drop the only path carrying a given last-structural voicing:
// a pricier one may be the only way the next structural chord can satisfy the rule.
function prune(sorted: PathState[], K: number): PathState[] {
  const keep: PathState[] = [], rest: PathState[] = [];
  const seen = new Set<Cand>();
  for (const p of sorted) {
    if (p.ls && !seen.has(p.ls)) { seen.add(p.ls); keep.push(p); } else rest.push(p);
  }
  return keep.length >= K ? keep : [...keep, ...rest.slice(0, K - keep.length)];
}

export function kBest(lists: Cand[][], strat: Strategy, K: number, opts: PathOpts = {}): Cand[][] {
  if (!lists.length || lists.some((l) => !l.length)) return [];
  const pool = applyPins(lists, opts.pin);
  const role = (i: number): Role => opts.roles?.[i] ?? "structural";
  const extra = (c: Cand, i: number) => {
    const a = opts.avoid?.[i];
    return a && a.set === c.set && Math.abs(a.avg - c.avg) < AVOID_SPAN ? AVOID_PEN : 0;
  };
  let prev: PathState[][] = pool[0].map((c) => [{
    cost: strat.unary(c) + extra(c, 0) + (opts.prev ? SEAM * near(opts.prev, c) : 0),
    path: [c],
    ls: role(0) === "structural" ? c : undefined,
  }]);
  for (let i = 1; i < pool.length; i++) {
    const structural = role(i) === "structural";
    const both = structural && role(i - 1) === "structural";
    const cur: PathState[][] = pool[i].map((c) => {
      const acc: PathState[] = [];
      pool[i - 1].forEach((p, pi) => {
        if (both) {
          if (strat.ok && !strat.ok(p, c)) return;
          const t = strat.trans(p, c) + strat.unary(c) + extra(c, i);
          for (const pp of prev[pi]) acc.push({ cost: pp.cost + t, path: [...pp.path, c], ls: c });
          return;
        }
        // A passing chord on either side: just stay close, and let a structural chord answer to the
        // last structural one rather than to the passing chord in between.
        const t = near(p, c) + strat.unary(c) + extra(c, i);
        for (const pp of prev[pi]) {
          if (structural && strat.ok && pp.ls && !strat.ok(pp.ls, c)) continue;
          acc.push({ cost: pp.cost + t, path: [...pp.path, c], ls: structural ? c : pp.ls });
        }
      });
      acc.sort((a, b) => a.cost - b.cost);
      return prune(acc, K);
    });
    prev = cur;
  }
  const all = ([] as PathState[]).concat(...prev).sort((a, b) => a.cost - b.cost);
  let paths = all.slice(0, K).map((p) => p.path);
  if (strat.rerank) {
    const lo = (p: Cand[]) => Math.min(...p.map((c) => c.avg));
    const range = (p: Cand[]) => Math.max(...p.map((c) => c.avg)) - lo(p);
    paths = paths.slice().sort((a, b) => range(a) - range(b) || lo(a) - lo(b));
  }
  return paths;
}

export function randomPath(lists: Cand[][], pin?: (Cand | undefined)[]): Cand[] | null {
  if (!lists.length || lists.some((l) => !l.length)) return null;
  return applyPins(lists, pin).map((l) => l[Math.floor(Math.random() * l.length)]);
}

// ---- phrases ----

export type Origin = "detected" | "manual";

/**
 * One chord token in a section. `bar` marks the first chord of a bar when the chart said so.
 * `pin` is a voicing this chord is fixed to (a `candKey`); the path is solved around it. Without
 * `held` the player chose it by hand; with `held` the app wrote it to keep the chord where it
 * already was, so a hand-picked pin later in the phrase can't move the chords before it. A pin
 * that names no voicing of the chord (the key changed) is simply ignored.
 */
export interface Slot { token: string; role: Role; bar?: boolean; pin?: string; held?: boolean }

/**
 * The unit a path is chosen for. Phrases that instance the same repeated progression share a
 * `patternId`; `strategyId` overrides the section's movement for this phrase only.
 */
export interface Phrase { slots: Slot[]; patternId?: string; strategyId?: string; origin: Origin }

/** How repeated phrases relate: play every occurrence the same way, or make each one differ. */
export type RepeatMode = "same" | "vary";

/**
 * A run of lyric text that starts under one chord and ends at the next (or at the line end).
 * `slot` indexes the section's slots (`sectionSlots`); a segment without one is text before the
 * line's first chord, or a whole line sung over no chord change.
 */
export interface LyricSegment { text: string; slot?: number }
export interface LyricLine { segments: LyricSegment[] }

/** `lyrics` exists only when a chart put words under at least one chord; slots stay valid across split/join. */
export interface Section { name: string; phrases: Phrase[]; strategyId?: string; repeat?: RepeatMode; lyrics?: LyricLine[] }

export const WANDER_ID = "wander";
export const DEFAULT_STRATEGY = "stay";
export const DEFAULT_REPEAT: RepeatMode = "same";

export const phraseTokens = (p: Phrase): string[] => p.slots.map((s) => s.token);
export const sectionSlots = (s: Section): Slot[] => s.phrases.flatMap((p) => p.slots);
export const sectionTokens = (s: Section): string[] => sectionSlots(s).map((x) => x.token);
export const hasManual = (s: Section): boolean => s.phrases.some((p) => p.origin === "manual");

function toSlots(tokens: string[], role: Role, bars?: boolean[], offset = 0): Slot[] {
  return tokens.map((token, i) => (bars?.[offset + i] ? { token, role, bar: true } : { token, role }));
}

/** Tokens → one phrase, every chord structural. */
export function plainPhrase(tokens: string[], origin: Origin = "detected", bars?: boolean[]): Phrase {
  return { origin, slots: toSlots(tokens, "structural", bars) };
}

type SectionOpts = { bars?: boolean[] } & Partial<Pick<Section, "strategyId" | "repeat" | "lyrics">>;

const hasSlots = (lyrics?: LyricLine[]): lyrics is LyricLine[] =>
  !!lyrics && lyrics.some((l) => l.segments.some((s) => s.slot !== undefined));

/** Phrases follow the lyric lines when the chart had words under the chords; otherwise they are detected. */
export function sectionFromTokens(name: string, tokens: string[], key: string, opts: SectionOpts = {}): Section {
  const lyrics = hasSlots(opts.lyrics) ? opts.lyrics : undefined;
  const s: Section = {
    name,
    phrases: lyrics ? lyricPhrases(tokens, lyrics, key, opts.bars) : detectPhrases(tokens, key, { bars: opts.bars }),
  };
  if (opts.strategyId) s.strategyId = opts.strategyId;
  if (opts.repeat) s.repeat = opts.repeat;
  if (lyrics) s.lyrics = lyrics;
  return s;
}

/** Throw away hand-made boundaries and detect again; bar marks, lyrics and movement settings survive. */
export function redetectSection(section: Section, key: string): Section {
  const slots = sectionSlots(section);
  const bars = slots.map((s) => !!s.bar);
  return releaseHeldPins(carryPins(slots, sectionFromTokens(section.name, slots.map((s) => s.token), key, {
    bars: bars.some(Boolean) ? bars : undefined, strategyId: section.strategyId, repeat: section.repeat, lyrics: section.lyrics,
  })));
}

/**
 * Rebuilding a section makes fresh slots. A hand-picked voicing follows its chord across the
 * rebuild when the chord count is unchanged and the chord at that position is still the same
 * token; a retyped chord drops its pin, and a section that grew or shrank drops them all.
 */
function carryPins(old: Slot[], next: Section): Section {
  if (!old.some((s) => s.pin) || sectionSlots(next).length !== old.length) return next;
  let i = 0;
  return {
    ...next,
    phrases: next.phrases.map((p) => ({
      ...p,
      slots: p.slots.map((s) => {
        const o = old[i++];
        return o.pin && o.token === s.token ? { ...s, ...pinOf(o) } : s;
      }),
    })),
  };
}

/**
 * The section's chords were retyped. Hand-made phrases keep their boundaries when the chord
 * count is unchanged (a chord swap); otherwise the section is detected afresh. Lyrics point at
 * chords by index, so they survive only a same-length edit too.
 */
export function retokenizeSection(section: Section, tokens: string[], key: string): Section {
  const old = sectionSlots(section);
  const sameLength = old.length === tokens.length;
  if (hasManual(section) && sameLength) {
    let i = 0;
    const retype = (slot: Slot): Slot => {
      const { pin: _drop, held: _held, ...s } = slot;
      const token = tokens[i++];
      return slot.pin && token === s.token ? { ...s, ...pinOf(slot) } : { ...s, token };
    };
    return releaseHeldPins({ ...section, phrases: section.phrases.map((p) => ({ ...p, slots: p.slots.map(retype) })) });
  }
  const bars = old.map((s) => !!s.bar);
  return releaseHeldPins(carryPins(old, sectionFromTokens(section.name, tokens, key, {
    bars: sameLength && bars.some(Boolean) ? bars : undefined,
    strategyId: section.strategyId, repeat: section.repeat,
    lyrics: sameLength ? section.lyrics : undefined,
  })));
}

/** A slot's pin as something to spread, so a rebuilt slot keeps the voicing *and* how it got there. */
const pinOf = (s: Pick<Slot, "pin" | "held">): Pick<Slot, "pin" | "held"> =>
  s.pin ? (s.held ? { pin: s.pin, held: true } : { pin: s.pin }) : {};

/** This chord sits on a voicing the player chose by hand, not one the app is holding for them. */
export const isUserPin = (s: Pick<Slot, "pin" | "held">): boolean => !!s.pin && !s.held;

/** Drop a slot's pin, of either kind. */
const unpinned = ({ pin: _drop, held: _held, ...s }: Slot): Slot => s;

/**
 * Pin the chord at `slotIndex` (an index into the section's slots) to a voicing, or let it go with
 * no `key`. The pin becomes the player's: pinning a held voicing by hand makes it theirs.
 */
export function setSlotPin(section: Section, slotIndex: number, key: string | undefined): Section {
  let i = 0;
  return {
    ...section,
    phrases: section.phrases.map((p) => ({
      ...p,
      slots: p.slots.map((s) => {
        if (i++ !== slotIndex) return s;
        const rest = unpinned(s);
        return key ? { ...rest, pin: key } : rest;
      }),
    })),
  };
}

/**
 * Hold chords where they already are: `hold` maps a slot index to the voicing showing there now.
 * Only chords with no pin of their own are held — a hand-picked voicing is never written over.
 */
export function holdSlots(section: Section, hold: Map<number, string>): Section {
  if (!hold.size) return section;
  let i = 0;
  return {
    ...section,
    phrases: section.phrases.map((p) => ({
      ...p,
      slots: p.slots.map((s) => {
        const key = hold.get(i++);
        return key && !s.pin ? { ...s, pin: key, held: true } : s;
      }),
    })),
  };
}

/**
 * Let go of every held voicing that no longer sits before a hand-picked one in its phrase: holding
 * it was only ever there to stop that pin moving the chords before it. With the last hand-picked
 * pin gone, the phrase is back on the engine's free path.
 */
export function releaseHeldPins(section: Section): Section {
  if (!section.phrases.some((p) => p.slots.some((s) => s.held))) return section;
  return {
    ...section,
    phrases: section.phrases.map((p) => {
      let last = -1;
      p.slots.forEach((s, i) => { if (isUserPin(s)) last = i; });
      return { ...p, slots: p.slots.map((s, i) => (s.held && i > last ? unpinned(s) : s)) };
    }),
  };
}

/** Let go of every held voicing, in one phrase or across the section. Hand-picked pins stay. */
export function clearHeldPins(section: Section, phraseIndex?: number): Section {
  return {
    ...section,
    phrases: section.phrases.map((p, k) => (phraseIndex !== undefined && k !== phraseIndex
      ? p
      : { ...p, slots: p.slots.map((s) => (s.held ? unpinned(s) : s)) })),
  };
}

/**
 * The player pinned the chord at `slotIndex` by hand, or let it go with no `key`. `hold` names the
 * voicing each chord of the phrase shows right now (slot index → `candKey`): the unpinned ones
 * before the pin are held there first, so pinning can never move a chord earlier in the phrase —
 * only the chords after it re-path. Held voicings the remaining pins no longer need are let go.
 */
export function pinSlot(section: Section, slotIndex: number, key: string | undefined, hold?: Map<number, string>): Section {
  const earlier = key && hold ? new Map([...hold].filter(([i]) => i < slotIndex)) : undefined;
  return releaseHeldPins(setSlotPin(earlier ? holdSlots(section, earlier) : section, slotIndex, key));
}

/** Let go of every fixed voicing in one phrase, held or hand-picked: the way out when a pin leaves the movement no path. */
export function clearPhrasePins(section: Section, phraseIndex: number): Section {
  return {
    ...section,
    phrases: section.phrases.map((p, k) => (k === phraseIndex ? { ...p, slots: p.slots.map(unpinned) } : p)),
  };
}

export const phraseHasPins = (p: Phrase): boolean => p.slots.some((s) => !!s.pin);

/**
 * Where the words go: for each phrase, the lyric lines sung over it. A line whose chords were
 * cut into two phrases is split between them at the cut; chords no line mentions (an
 * instrumental turn) become a wordless line of their own; a line sung over no chord change
 * follows the nearest preceding line with chords (or leads the next one). Sections without
 * lyrics get one wordless line per phrase, so a sheet can render every section the same way.
 */
export function phraseLyrics(section: Section): LyricLine[][] {
  const owner: number[] = []; // slot → phrase index
  section.phrases.forEach((p, pi) => p.slots.forEach(() => owner.push(pi)));
  const out: LyricLine[][] = section.phrases.map(() => []);
  const referenced = new Set<number>();
  let lastPhrase = -1;
  let pending: LyricLine[] = [];
  for (const line of section.lyrics ?? []) {
    const runs: { pi: number; segments: LyricSegment[] }[] = [];
    let lead: LyricSegment[] = [];
    for (const seg of line.segments) {
      const pi = seg.slot === undefined ? undefined : owner[seg.slot];
      if (pi === undefined) {
        if (runs.length) runs[runs.length - 1].segments.push(seg); else lead.push(seg);
        continue;
      }
      referenced.add(seg.slot!);
      const last = runs[runs.length - 1];
      if (last && last.pi === pi) last.segments.push(seg);
      else { runs.push({ pi, segments: [...lead, seg] }); lead = []; }
    }
    if (!runs.length) {
      if (lastPhrase >= 0) out[lastPhrase].push(line); else pending.push(line);
      continue;
    }
    out[runs[0].pi].push(...pending);
    pending = [];
    for (const r of runs) out[r.pi].push({ segments: r.segments });
    lastPhrase = runs[runs.length - 1].pi;
  }
  if (out.length) out[0].push(...pending);
  // Chords no line mentions: a wordless line before or after the phrase's sung lines.
  let off = 0;
  section.phrases.forEach((p, pi) => {
    const first = p.slots.findIndex((_, i) => referenced.has(off + i));
    const before: LyricSegment[] = [], after: LyricSegment[] = [];
    p.slots.forEach((_, i) => {
      const slot = off + i;
      if (!referenced.has(slot)) (first < 0 || i < first ? before : after).push({ text: "", slot });
    });
    if (before.length) out[pi].unshift({ segments: before });
    if (after.length) out[pi].push({ segments: after });
    off += p.slots.length;
  });
  return out;
}

/** A phrase's words as one string (chords omitted); empty when the phrase is instrumental. */
export function lyricText(lines: LyricLine[]): string {
  return lines.map((l) => l.segments.map((s) => s.text).join("")).join(" ").replace(/\s+/g, " ").trim();
}

/**
 * One phrase per lyric line that names chords (its chords, in order), and one per run of chords
 * no line names. Lines with the same progression share a pattern id, as detected repeats do,
 * so the Repeats control applies to them.
 */
function lyricPhrases(tokens: string[], lyrics: LyricLine[], key: string, bars?: boolean[]): Phrase[] {
  const owner = new Array<number>(tokens.length).fill(-1);
  lyrics.forEach((l, li) => l.segments.forEach((s) => {
    if (s.slot !== undefined && s.slot < tokens.length && owner[s.slot] < 0) owner[s.slot] = li;
  }));
  const phrases: Phrase[] = [];
  let start = 0;
  for (let i = 1; i <= tokens.length; i++) {
    if (i === tokens.length || owner[i] !== owner[start]) {
      phrases.push({ slots: toSlots(tokens.slice(start, i), "structural", bars, start), origin: "detected" });
      start = i;
    }
  }
  const ids = phrases.map((p) => {
    const keys = toUnits(phraseTokens(p), key).map((u) => u.key);
    return keys.some((k) => k === null) ? null : patternId(keys as string[], key);
  });
  const count = new Map<string, number>();
  for (const id of ids) if (id) count.set(id, (count.get(id) ?? 0) + 1);
  phrases.forEach((p, i) => { const id = ids[i]; if (id && (count.get(id) ?? 0) > 1) p.patternId = id; });
  return phrases;
}

const manual = (p: Phrase, slots: Slot[]): Phrase => {
  const out: Phrase = { slots, origin: "manual" };
  if (p.strategyId) out.strategyId = p.strategyId;
  return out;
};

/** Cut the phrase containing `slotIndex` (an index into the section's slots) in two at that slot. */
export function splitPhraseAt(section: Section, slotIndex: number): Section {
  let off = slotIndex;
  const phrases: Phrase[] = [];
  let done = false;
  for (const p of section.phrases) {
    if (!done && off > 0 && off < p.slots.length) {
      phrases.push(manual(p, p.slots.slice(0, off)), manual(p, p.slots.slice(off)));
      done = true;
    } else {
      phrases.push(p);
    }
    off -= p.slots.length;
  }
  // A cut can leave a held voicing in a phrase with no hand-picked pin after it; let those go.
  return done ? releaseHeldPins({ ...section, phrases }) : section;
}

/** Merge phrase `phraseIndex` into the one before it. */
export function joinPhraseAt(section: Section, phraseIndex: number): Section {
  const a = section.phrases[phraseIndex - 1], b = section.phrases[phraseIndex];
  if (!a || !b) return section;
  const phrases = [...section.phrases.slice(0, phraseIndex - 1), manual(a, [...a.slots, ...b.slots]), ...section.phrases.slice(phraseIndex + 1)];
  return releaseHeldPins({ ...section, phrases });
}

// ---- phrase detection ----

export interface DetectOpts {
  /** `bars[i]` is true when token i starts a bar. A boundary on a bar line ranks higher. */
  bars?: boolean[];
  /** Most passing chords allowed between two chords of the template (default 2). */
  maxGap?: number;
  /** Share of the section's tokens the occurrences must cover (default 0.7). */
  minCoverage?: number;
  /** Longest template tried (default 8). */
  maxTemplate?: number;
}

// A run of one chord (merged unless a bar line separates the repeats), with its token span.
interface Unit { start: number; end: number; key: string | null; cadence: boolean; bar: boolean }

interface Occurrence { startU: number; endU: number; structural: number[]; skipped: number; reachedEnd: boolean }

interface Scored { T: string[]; occs: Occurrence[]; rank: number[] }

function toUnits(tokens: string[], key: string, bars?: boolean[]): Unit[] {
  const ks = keySemi(key);
  const units: Unit[] = [];
  tokens.forEach((t, i) => {
    const c = parseProgression(t, key).chords[0];
    const k = c ? `${c.root}:${c.q}` : null;
    const bar = !!bars?.[i];
    const last = units[units.length - 1];
    if (last && k !== null && last.key === k && !bar) { last.end = i + 1; return; }
    const semi = c ? ((c.root - ks) % 12 + 12) % 12 : -1;
    units.push({ start: i, end: i + 1, key: k, cadence: semi === 0 || semi === 7, bar });
  });
  return units;
}

// Match the template as a subsequence starting at unit p, skipping up to maxGap passing units
// between template chords. With `skips`, that many template chords may be left out (the closing
// "4 5 1" of a 4-5-6m-1 pattern). Returns however much of it matched, possibly all of it.
function matchFrom(units: Unit[], T: string[], p: number, maxGap: number, skips = 0): Occurrence | null {
  const structural = [p];
  let cur = p, passing = 0, skipped = 0, lastJ = 0;
  for (let j = 1; j < T.length; j++) {
    let q = -1;
    for (let g = cur + 1; g <= cur + 1 + maxGap && g < units.length; g++) if (units[g].key === T[j]) { q = g; break; }
    if (q < 0) {
      if (skipped < skips) { skipped++; continue; }
      break;
    }
    passing += q - cur - 1;
    structural.push(q);
    cur = q;
    lastJ = j;
  }
  if (passing > T.length - 1) return null; // more glue than progression: not this template
  if (structural.length < 2 + skipped) return null;
  return { startU: p, endU: cur, structural, skipped, reachedEnd: lastJ === T.length - 1 };
}

function scoreTemplate(units: Unit[], T: string[], nTok: number, maxGap: number, minCov: number): Scored | null {
  const L = T.length;
  const occs: Occurrence[] = [];
  let p = 0;
  while (p < units.length) {
    if (units[p].key === T[0]) {
      const o = matchFrom(units, T, p, maxGap);
      if (o && o.structural.length === L) { occs.push(o); p = o.endU + 1; continue; }
    }
    p++;
  }
  if (!occs.length) return null;
  // One shortened occurrence may close the section: a prefix of the template ("4 5 6m 1 … 4 5"),
  // or the template with one chord left out, provided it still reaches the end ("… 4 5 1").
  for (let q = occs[occs.length - 1].endU + 1; q < units.length; q++) {
    if (units[q].key !== T[0]) continue;
    const o = matchFrom(units, T, q, maxGap, 1);
    if (o && o.structural.length >= Math.ceil(L / 2) && (!o.skipped || o.reachedEnd)) { occs.push(o); break; }
  }
  if (occs.length < 2) return null;
  const span = (a: number, b: number) => units[b - 1].end - units[a].start; // tokens in units [a, b)
  const covered = occs.reduce((s, o) => s + span(o.startU, o.endU + 1), 0);
  // Runs of chords too long to be passing chords become phrases of their own and don't count
  // against the template; everything else between and around occurrences does.
  let judged = nTok, pos = 0;
  for (const o of [...occs, { startU: units.length, endU: units.length } as Occurrence]) {
    if (o.startU - pos > maxGap) judged -= span(pos, o.startU);
    pos = o.endU + 1;
  }
  if (covered / judged < minCov || covered / nTok < 0.4) return null;
  const structuralTok = occs.reduce((s, o) => s + o.structural.reduce((a, u) => a + units[u].end - units[u].start, 0), 0);
  let bar = 0, cadence = 0;
  for (const o of occs.slice(1)) {
    if (units[o.startU].bar) bar++;
    if (units[o.startU - 1].cadence) cadence++;
  }
  const leading = units[occs[0].startU].start;
  // Lexicographic: the most chords carried by the template itself, then the most covered, in the
  // most phrases; then boundaries on bar lines, a phrase opening the section, boundaries after a
  // 1 or 5, and the longer template.
  return { T, occs, rank: [structuralTok, Math.round((covered / judged) * 100), occs.length, bar, -leading, cadence, L] };
}

function better(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

function patternId(T: string[], key: string): string {
  const ks = keySemi(key);
  return T.map((k) => { const [r, q] = k.split(":"); return degreeLabel(+r, q as Quality, ks); }).join("-");
}

/**
 * Find the progression a section repeats and cut the section into one phrase per repeat.
 * Chords between the template's chords (at most `maxGap` in a row) are passing chords; short
 * runs of chords between or around occurrences attach to the neighbouring phrase as passing
 * chords, longer ones become a phrase of their own. With no convincing repeat, the whole
 * section is one phrase.
 */
export function detectPhrases(tokens: string[], key: string, opts: DetectOpts = {}): Phrase[] {
  const maxGap = opts.maxGap ?? 2, minCov = opts.minCoverage ?? 0.7, maxT = opts.maxTemplate ?? 8;
  const bars = opts.bars;
  const whole = () => (tokens.length ? [plainPhrase(tokens, "detected", bars)] : []);
  const units = toUnits(tokens, key, bars);
  if (units.length < 4) return whole();

  const seen = new Set<string>();
  let best: Scored | null = null;
  for (let L = 2; L <= Math.min(maxT, Math.floor(units.length / 2)); L++) {
    for (let s = 0; s + L <= units.length; s++) {
      const T = units.slice(s, s + L).map((u) => u.key);
      if (T.some((k) => k === null)) continue;
      const id = T.join("|");
      if (seen.has(id)) continue;
      seen.add(id);
      const sc = scoreTemplate(units, T as string[], tokens.length, maxGap, minCov);
      if (sc && (!best || better(sc.rank, best.rank))) best = sc;
    }
  }
  if (!best) return whole();

  const pid = patternId(best.T, key);
  const slotsOf = (from: number, to: number, role: Role) =>
    toSlots(tokens.slice(units[from].start, units[to - 1].end), role, bars, units[from].start);
  const phrases: Phrase[] = [];
  let pos = 0;
  for (const o of best.occs) {
    let lead: Slot[] = [];
    if (o.startU > pos) {
      if (o.startU - pos > maxGap) phrases.push({ slots: slotsOf(pos, o.startU, "structural"), origin: "detected" });
      else lead = slotsOf(pos, o.startU, "passing");
    }
    const inside = new Set(o.structural);
    const body: Slot[] = [];
    for (let u = o.startU; u <= o.endU; u++) body.push(...slotsOf(u, u + 1, inside.has(u) ? "structural" : "passing"));
    phrases.push({ slots: [...lead, ...body], patternId: pid, origin: "detected" });
    pos = o.endU + 1;
  }
  if (pos < units.length) {
    if (units.length - pos > maxGap) phrases.push({ slots: slotsOf(pos, units.length, "structural"), origin: "detected" });
    else phrases[phrases.length - 1].slots.push(...slotsOf(pos, units.length, "passing"));
  }
  return phrases;
}

// ---- solving a section ----

/** One shape to find: a chord and its role, mapped back to the slot(s) it came from. `pin`/`held` are its first slot's. */
export interface PhraseUnit { chord: Chord; role: Role; slot: number; span: number; pin?: string; held?: boolean }
export interface PhrasePlan { units: PhraseUnit[]; errors: string[] }

const sameChord = (a: Chord, b: Chord) => a.root === b.root && a.q === b.q;

/** Parse a phrase into chords, merging a chord repeated in consecutive slots (two bars of 1 is one shape). */
export function planPhrase(phrase: Phrase, key: string): PhrasePlan {
  const { chords, errors } = parseProgression(phraseTokens(phrase).join(" "), key);
  const units: PhraseUnit[] = [];
  let ci = 0;
  phrase.slots.forEach((s, i) => {
    if (!parseProgression(s.token, key).chords.length) return;
    const chord = chords[ci++];
    const last = units[units.length - 1];
    if (last && last.slot + last.span === i && last.role === s.role && sameChord(last.chord, chord)) { last.span++; return; }
    units.push({ chord, role: s.role, slot: i, span: 1, ...pinOf(s) });
  });
  return { units, errors };
}

export interface PhraseResult { path: Cand[] | null; count: number; strategyId: string; fail?: string }

/**
 * Choose a path for every phrase in turn. Each phrase starts near where the last one ended;
 * repeats of a pattern are pinned to the first occurrence ("same") or pushed away from the
 * previous one ("vary"). A slot's own pin — hand-picked or held — outranks both. `alt` picks
 * among each phrase's K-best alternatives.
 *
 * Phrases are solved front to back and each one only ever reads the phrase before it (the seam
 * pull, `opts.prev`), so nothing done to one phrase can move an earlier one.
 */
export function solveSection(section: Section, plans: PhrasePlan[], opts: { alt: number; K: number }): PhraseResult[] {
  const mode = section.repeat ?? DEFAULT_REPEAT;
  const first = new Map<string, Cand[]>(); // pattern → structural voicings of its first occurrence
  const last = new Map<string, Cand[]>();  // pattern → structural voicings of its latest occurrence
  let prev: Cand | undefined;
  return section.phrases.map((phrase, i) => {
    const sid = phrase.strategyId ?? section.strategyId ?? DEFAULT_STRATEGY;
    const units = plans[i]?.units ?? [];
    const roles = units.map((u) => u.role);
    const lists = units.map((u) => candidates(u.chord));
    const pid = phrase.patternId;
    // Line the reference's structural voicings up with this phrase's structural chords, in order.
    const byPos = (src?: Cand[]) => {
      if (!src) return undefined;
      let j = 0;
      return roles.map((r) => (r === "structural" ? src[j++] : undefined));
    };
    const same = pid && mode === "same" ? byPos(first.get(pid)) : undefined;
    const fixed = units.map((u, k) => (u.pin ? lists[k].find((c) => candKey(c) === u.pin) : undefined));
    const pin = fixed.some(Boolean) || same ? units.map((_, k) => fixed[k] ?? same?.[k]) : undefined;
    const avoid = pid && mode === "vary" ? byPos(last.get(pid)) : undefined;
    let path: Cand[] | null = null, count = 0, fail: string | undefined;
    if (sid === WANDER_ID) {
      path = randomPath(lists, pin);
    } else {
      const strat = STRATEGIES.find((s) => s.id === sid) ?? STRATEGIES[0];
      const paths = kBest(lists, strat, opts.K, { prev, roles, pin, avoid });
      count = paths.length;
      path = paths[opts.alt % Math.max(1, count)] ?? null;
      fail = strat.fail;
    }
    if (path) {
      prev = path[path.length - 1];
      if (pid) {
        const structural = path.filter((_, k) => roles[k] === "structural");
        if (!first.has(pid)) first.set(pid, structural);
        last.set(pid, structural);
      }
    }
    return { path, count, strategyId: sid, fail };
  });
}

// ---- chart import ----

const SECTION_RE = /^\s*(?:\[|\{start_of_)?\s*(verse|chorus|pre[- ]?chorus|bridge|intro|outro|tag|turnaround|interlude|instrumental|solo|breakdown|vamp|ending|refrain)\s*(\d*)\s*(?:\]|\})?\s*:?\s*$/i;
const NOISE_RE = /^(-+|x\d+)$/i;
/** An ASCII tablature staff line (`B|-3-2-3---|`, `G|-----| x8`): an optional string name, then only dashes, frets and technique marks. */
const STAFF_RE = /^\s*(?:[A-Ga-g][#b]?)?\s*\|?(?=.*-{3,})[-\d|hpbrsxtv/\\~^()*.,\s]*$/i;

/**
 * Chords of one chart section, with `bars[i]` true where chord i starts a bar. `lyrics` are the
 * section's words in chart order, each segment's `slot` an index into `chords`; present only
 * when at least one line sits under chords.
 */
export interface RawSection { name: string; chords: string[]; bars: boolean[]; lyrics?: LyricLine[] }

const isChordToken = (t: string) => isNumToken(t) || !!parseChordSymbol(t);

/** Chords of one line, with the column each was written at (none for chords added by `%` or `x2`). */
interface LineChords { chords: string[]; bars: boolean[]; cols: (number | undefined)[] }

/**
 * One chart line → its chords. Bar lines mark bar starts, `%` repeats the previous bar,
 * a trailing `x2` repeats the line. Lines that are mostly not chords (lyrics) yield null.
 * Works on the untrimmed line so the columns line up with the lyric line beneath.
 */
function lineChords(line: string): LineChords | null {
  // Blank "N.C." in place so every other token keeps its column.
  const clean = line.replace(/\bN\.?C\.?(?=\s|$)/gi, (m) => " ".repeat(m.length));
  const toks: { t: string; col: number }[] = [];
  const re = /\||[^\s.|]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean))) { const t = m[0].replace(/[(),]/g, ""); if (t) toks.push({ t, col: m.index }); }
  if (!toks.length) return null;
  const good = toks.filter(({ t }) => isChordToken(t)).length;
  const noise = toks.filter(({ t }) => t === "|" || t === "%" || NOISE_RE.test(t)).length;
  if (!good || (good + noise) / toks.length < 0.7) return null;
  const hasBars = toks.some(({ t }) => t === "|");
  const chords: string[] = [], bars: boolean[] = [], cols: (number | undefined)[] = [];
  let pending = hasBars, times = 1;
  for (const { t, col } of toks) {
    if (t === "|") { pending = true; continue; }
    if (t === "%") {
      if (!chords.length) continue;
      const from = hasBars ? bars.lastIndexOf(true) : chords.length - 1;
      const n = chords.length;
      for (let i = Math.max(0, from); i < n; i++) { chords.push(chords[i]); bars.push(i === from); cols.push(undefined); }
      pending = false;
      continue;
    }
    const rep = t.match(/^x(\d+)$/i);
    if (rep) { times = Math.max(times, Math.min(8, +rep[1])); continue; }
    if (!isChordToken(t)) continue;
    chords.push(t);
    bars.push(pending);
    cols.push(col);
    pending = false;
  }
  if (!chords.length) return null;
  const c = chords.slice(), b = bars.slice();
  for (let i = 1; i < times; i++) { chords.push(...c); bars.push(...b); cols.push(...c.map(() => undefined)); }
  return { chords, bars, cols };
}

const INLINE_RE = /\[([A-G][#b]?[^\[\]\s]*)\]/g;

/**
 * A ChordPro line (`[G]Hello [D]there`) → its chords and the words after each one. Slots are
 * line-local; `line` is null when no chord has words after it (an instrumental line).
 */
function chordProLine(raw: string): { chords: string[]; line: LyricLine | null } | null {
  const text = raw.trimEnd();
  const chords: string[] = [], segments: LyricSegment[] = [];
  let m: RegExpExecArray | null, last = 0;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(text))) {
    const before = text.slice(last, m.index);
    if (chords.length) segments.push({ text: before, slot: chords.length - 1 });
    else if (before.trim()) segments.push({ text: before });
    chords.push(m[1]);
    last = m.index + m[0].length;
  }
  if (!chords.length) return null;
  segments.push({ text: text.slice(last), slot: chords.length - 1 });
  return { chords, line: segments.some((s) => s.text.trim()) ? { segments } : null };
}

/**
 * The words under a chord line: segment i runs from chord i's column to the next chord's; what
 * comes before the first chord is a leading segment with no slot (dropped when blank). A chord
 * with no column (added by `%` or `x2`) gets an empty segment.
 */
function lyricUnder(cols: (number | undefined)[], lyric: string, offset: number): LyricLine {
  const segments: LyricSegment[] = [];
  const first = cols.find((c) => c !== undefined);
  if (first !== undefined && first > 0) { const lead = lyric.slice(0, first); if (lead.trim()) segments.push({ text: lead }); }
  cols.forEach((c, i) => {
    if (c === undefined) { segments.push({ text: "", slot: offset + i }); return; }
    const next = cols.slice(i + 1).find((x) => x !== undefined);
    segments.push({ text: lyric.slice(c, next), slot: offset + i });
  });
  return { segments };
}

const isSectionHeader = (line: string) => SECTION_RE.test(line.replace(/\./g, " ").trim());

/** Words: not blank, not chords, not a header or a staff line, and not just `x2` / `----`. */
function isLyricLine(raw: string): boolean {
  const line = raw.trim();
  return !!line && /[a-z]/i.test(line) && !NOISE_RE.test(line.replace(/[()]/g, "")) && !STAFF_RE.test(line)
    && !isSectionHeader(line) && !chordProLine(raw) && !lineChords(raw);
}

export function importChart(text: string): RawSection[] {
  type Building = RawSection & { lyrics: LyricLine[] };
  const sections: Building[] = [];
  let cur: Building | null = null;
  const push = (n: string): Building => { const s: Building = { name: n, chords: [], bars: [], lyrics: [] }; sections.push(s); return s; };
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line || STAFF_RE.test(line)) continue;
    const sm = line.replace(/\./g, " ").trim().match(SECTION_RE);
    if (sm) { const n = sm[1][0].toUpperCase() + sm[1].slice(1).toLowerCase(); cur = push(n + (sm[2] ? " " + sm[2] : "")); continue; }
    const pro = chordProLine(raw);
    if (pro) {
      cur ??= push("Song");
      const offset = cur.chords.length;
      cur.chords.push(...pro.chords);
      cur.bars.push(...pro.chords.map(() => false));
      if (pro.line) cur.lyrics.push({ segments: pro.line.segments.map((s) => (s.slot === undefined ? s : { ...s, slot: s.slot + offset })) });
      continue;
    }
    const got = lineChords(raw);
    if (got) {
      cur ??= push("Song");
      const offset = cur.chords.length;
      cur.chords.push(...got.chords);
      cur.bars.push(...got.bars);
      const next = lines[i + 1];
      if (next !== undefined && isLyricLine(next)) { cur.lyrics.push(lyricUnder(got.cols, next.trimEnd(), offset)); i++; }
      continue;
    }
    if (cur && isLyricLine(raw)) cur.lyrics.push({ segments: [{ text: raw.trimEnd() }] });
  }
  return sections.filter((s) => s.chords.length).map(({ lyrics, ...s }) => (hasSlots(lyrics) ? { ...s, lyrics } : s));
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

/**
 * Chart text → sections in number notation. Letter charts get their key detected unless
 * `opts.key` names one (e.g. the key a tab site reports); number charts keep `currentKey`.
 */
export function chartToSections(text: string, currentKey: string, opts: { key?: string } = {}): { sections: Section[]; key: string } {
  const secs = importChart(text);
  const flat = secs.flatMap((x) => x.chords);
  if (!flat.length) return { sections: [], key: currentKey };
  const numeric = flat.filter(isNumToken).length;
  let key = currentKey;
  let convert = (t: string): string | null => t;
  if (numeric < flat.length / 2) {
    key = opts.key && KEYS.includes(opts.key)
      ? opts.key
      : detectKey(flat.map(parseChordSymbol).filter((x): x is ParsedSymbol => !!x));
    const k = key;
    convert = (t) => toNumberToken(t, k);
  }
  const sections = secs.map((x) => {
    const tokens: string[] = [], bars: boolean[] = [];
    const slotMap: (number | undefined)[] = []; // chart chord index → token index (none when dropped)
    x.chords.forEach((t, i) => {
      const n = convert(t);
      slotMap.push(n ? tokens.length : undefined);
      if (n) { tokens.push(n); bars.push(x.bars[i]); }
    });
    return sectionFromTokens(x.name, tokens, key, {
      bars: bars.some(Boolean) ? bars : undefined,
      lyrics: x.lyrics?.map((l) => remapLine(l, slotMap)),
    });
  }).filter((s) => s.phrases.length);
  return { sections, key };
}

/** Point a line's segments at the surviving chords; words under a dropped chord join the segment before them. */
function remapLine(line: LyricLine, slotMap: (number | undefined)[]): LyricLine {
  const segments: LyricSegment[] = [];
  for (const s of line.segments) {
    const slot = s.slot === undefined ? undefined : slotMap[s.slot];
    if (s.slot !== undefined && slot === undefined) {
      const prev = segments[segments.length - 1];
      if (prev) prev.text += s.text;
      else if (s.text.trim()) segments.push({ text: s.text });
      continue;
    }
    segments.push(slot === undefined ? { text: s.text } : { text: s.text, slot });
  }
  return { segments };
}
