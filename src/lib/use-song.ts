"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Section, Phrase, Slot, RepeatMode, LyricLine, LyricSegment, chartToSections, sectionFromTokens, plainPhrase,
  splitPhraseAt, joinPhraseAt, redetectSection, retokenizeSection,
} from "@/lib/engine";
import { DEFAULT_MOOD, MoodId, MOODS, moodById, randomKey, randomProgression, randomSong } from "@/lib/random-progression";

export type Notation = "numbers" | "names";

const DEFAULT_KEY = "G";
const DEFAULT_PROGRESSION = "1 5 6m 4";

const STORAGE_KEY = "triad-paths:song";

export type SongSource = "ultimate-guitar" | "paste" | "random";

/** Where an imported chart came from and what it's called. All optional: typed progressions have none. */
export type SongMeta = {
  title?: string;
  artist?: string;
  capo?: number;
  source?: SongSource;
};

type StoredSong = {
  v: 2;
  songKey: string;
  notation: Notation;
  /** True once a chart has been pasted; a typed progression is a single "Song" section. */
  imported: boolean;
  sections: Section[];
  /** Added after v2 shipped; older v2 payloads simply lack it. */
  meta?: SongMeta;
  /** The mood the Randomize buttons use; added after v2 shipped too. */
  mood?: MoodId;
};

const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

function isSlot(x: unknown): x is Slot {
  return isRecord(x) && typeof x.token === "string" && (x.role === "structural" || x.role === "passing")
    && (x.bar === undefined || typeof x.bar === "boolean");
}

function isPhrase(x: unknown): x is Phrase {
  return isRecord(x) && Array.isArray(x.slots) && x.slots.every(isSlot)
    && (x.origin === "detected" || x.origin === "manual")
    && (x.patternId === undefined || typeof x.patternId === "string")
    && (x.strategyId === undefined || typeof x.strategyId === "string");
}

function isSegment(x: unknown): x is LyricSegment {
  return isRecord(x) && typeof x.text === "string"
    && (x.slot === undefined || (typeof x.slot === "number" && Number.isInteger(x.slot) && x.slot >= 0));
}

function isLine(x: unknown): x is LyricLine {
  return isRecord(x) && Array.isArray(x.segments) && x.segments.every(isSegment);
}

function isSection(x: unknown): x is Section {
  return isRecord(x) && typeof x.name === "string" && Array.isArray(x.phrases) && x.phrases.every(isPhrase)
    && (x.strategyId === undefined || typeof x.strategyId === "string")
    && (x.repeat === undefined || x.repeat === "same" || x.repeat === "vary")
    && (x.lyrics === undefined || (Array.isArray(x.lyrics) && x.lyrics.every(isLine)));
}

const isNotation = (x: unknown): x is Notation => x === "numbers" || x === "names";
const isMood = (x: unknown): x is MoodId => MOODS.some((m) => m.id === x);

function readMeta(x: unknown): SongMeta | undefined {
  if (!isRecord(x)) return undefined;
  const meta: SongMeta = {};
  if (typeof x.title === "string") meta.title = x.title;
  if (typeof x.artist === "string") meta.artist = x.artist;
  if (typeof x.capo === "number" && Number.isInteger(x.capo)) meta.capo = x.capo;
  if (x.source === "ultimate-guitar" || x.source === "paste" || x.source === "random") meta.source = x.source;
  return Object.keys(meta).length ? meta : undefined;
}

/**
 * v1 stored the typed text plus optional imported `{name, tokens}` sections, and hand-made
 * cuts as `splits[sectionIndex] = tokenIndex[]`. Cuts become manual phrases; everything
 * else is detected.
 */
function migrateV1(data: Record<string, unknown>): StoredSong | null {
  if (typeof data.songKey !== "string" || typeof data.text !== "string" || !isNotation(data.notation)) return null;
  type V1Section = { name: string; tokens: string[] };
  const isV1 = (x: unknown): x is V1Section =>
    isRecord(x) && typeof x.name === "string" && Array.isArray(x.tokens) && x.tokens.every((t) => typeof t === "string");
  const imported = Array.isArray(data.imported) && data.imported.every(isV1) ? (data.imported as V1Section[]) : null;
  const base: V1Section[] = imported?.length ? imported : [{ name: "Song", tokens: tokenize(data.text) }];
  const splits = isRecord(data.splits) ? data.splits : {};
  const key = data.songKey;
  const sections = base.map((s, i) => {
    const raw = splits[String(i)];
    const cuts = Array.isArray(raw)
      ? [...new Set(raw.filter((c): c is number => Number.isInteger(c) && c > 0 && c < s.tokens.length))].sort((a, b) => a - b)
      : [];
    if (!cuts.length) return sectionFromTokens(s.name, s.tokens, key);
    const bounds = [0, ...cuts, s.tokens.length];
    return { name: s.name, phrases: bounds.slice(1).map((end, k) => plainPhrase(s.tokens.slice(bounds[k], end), "manual")) };
  });
  return { v: 2, songKey: key, notation: data.notation, imported: !!imported?.length, sections };
}

function loadStoredSong(): StoredSong | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data)) return null;
    if (data.v === 1) return migrateV1(data);
    if (
      data.v === 2 && typeof data.songKey === "string" && isNotation(data.notation) &&
      typeof data.imported === "boolean" && Array.isArray(data.sections) && data.sections.every(isSection)
    ) {
      const song = { v: 2, songKey: data.songKey, notation: data.notation, imported: data.imported, sections: data.sections } as StoredSong;
      const meta = readMeta(data.meta);
      if (meta) song.meta = meta;
      if (isMood(data.mood)) song.mood = data.mood;
      return song;
    }
  } catch {
    // ignore (parse error, storage disabled, etc.)
  }
  return null;
}

export function tokenize(text: string): string[] {
  return text.replace(/[|,]/g, " ").split(/\s+/).filter(Boolean);
}

const defaultSections = (key: string): Section[] => [sectionFromTokens("Song", tokenize(DEFAULT_PROGRESSION), key)];

/**
 * Page-level song state: key, the sections with their phrases, and display notation.
 * Persisted to localStorage (see STORAGE_KEY) so a refresh doesn't lose it;
 * loaded after mount to stay hydration-safe.
 */
export function useSong() {
  const [songKey, setSongKey] = useState(DEFAULT_KEY);
  const [sections, setSections] = useState<Section[]>(() => defaultSections(DEFAULT_KEY));
  const [imported, setImported] = useState(false);
  const [meta, setMeta] = useState<SongMeta>({});
  const [notation, setNotation] = useState<Notation>("numbers");
  const [mood, setMood] = useState<MoodId>(DEFAULT_MOOD);
  /** True once localStorage has been read, so a page can hold off showing the default song. */
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  // Load persisted state once on mount (client-only, after first render).
  useEffect(() => {
    const stored = loadStoredSong();
    if (stored) {
      setSongKey(stored.songKey);
      setSections(stored.sections);
      setImported(stored.imported);
      setMeta(stored.meta ?? {});
      setNotation(stored.notation);
      setMood(stored.mood ?? DEFAULT_MOOD);
    }
    setReady(true);
  }, []);

  // Save on every change. The first run happens in the same commit as the load
  // above (before its setters re-render), so skip it to avoid writing defaults.
  useEffect(() => {
    if (!hydrated.current) { hydrated.current = true; return; }
    try {
      const payload: StoredSong = { v: 2, songKey, notation, imported, sections };
      if (Object.keys(meta).length) payload.meta = meta;
      if (mood !== DEFAULT_MOOD) payload.mood = mood;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore (quota, private mode, storage disabled, etc.)
    }
  }, [songKey, notation, imported, sections, meta, mood]);

  const patch = useCallback((index: number, fn: (s: Section) => Section) => {
    setSections((prev) => prev.map((s, i) => (i === index ? fn(s) : s)));
  }, []);

  /** Retype one section's progression. Hand-made phrases survive a same-length edit. */
  const updateSection = useCallback((index: number, progression: string) => {
    patch(index, (s) => retokenizeSection(s, tokenize(progression), songKey));
  }, [patch, songKey]);

  /** Cut the phrase containing slot `slotIndex` (an index into the section's chords) in two there. */
  const splitPhrase = useCallback((index: number, slotIndex: number) => {
    patch(index, (s) => splitPhraseAt(s, slotIndex));
  }, [patch]);

  /** Merge phrase `phraseIndex` back into the one before it. */
  const joinPhrase = useCallback((index: number, phraseIndex: number) => {
    patch(index, (s) => joinPhraseAt(s, phraseIndex));
  }, [patch]);

  /** Drop hand-made boundaries and let detection cut the section again. */
  const redetect = useCallback((index: number) => {
    patch(index, (s) => redetectSection(s, songKey));
  }, [patch, songKey]);

  /** The section's movement; clears any per-phrase overrides so the choice visibly applies. */
  const setSectionStrategy = useCallback((index: number, strategyId: string) => {
    patch(index, (s) => ({ ...s, strategyId, phrases: s.phrases.map(({ strategyId: _drop, ...p }) => p) }));
  }, [patch]);

  const setPhraseStrategy = useCallback((index: number, phraseIndex: number, strategyId: string | undefined) => {
    patch(index, (s) => ({
      ...s,
      phrases: s.phrases.map((p, k) => {
        if (k !== phraseIndex) return p;
        const { strategyId: _drop, ...rest } = p;
        return strategyId ? { ...rest, strategyId } : rest;
      }),
    }));
  }, [patch]);

  const setRepeat = useCallback((index: number, repeat: RepeatMode) => {
    patch(index, (s) => ({ ...s, repeat }));
  }, [patch]);

  /**
   * Replace the song with a parsed chart. `info.key` (a major key from KEYS) overrides key
   * detection for letter charts; the rest is remembered as the song's metadata.
   * Returns an error message, or null on success.
   */
  const importChart = useCallback((chart: string, info: SongMeta & { key?: string } = {}): string | null => {
    const { key: forcedKey, ...rest } = info;
    const { sections: secs, key } = chartToSections(chart, songKey, { key: forcedKey });
    if (!secs.length) return "No chords found in that chart.";
    setSections(secs);
    setImported(true);
    setSongKey(key);
    setMeta({ source: "paste", ...rest });
    return null;
  }, [songKey]);

  /** Start over with a fresh loop in the current mood, in a new random key. */
  const randomizeSong = useCallback(() => {
    const key = randomKey(songKey);
    setSongKey(key);
    setSections([sectionFromTokens("Song", randomProgression(Math.random, { mood }), key)]);
    setImported(false);
    setMeta({});
  }, [songKey, mood]);

  /** Start over with a made-up song in the current mood: verse, chorus and friends, each with its own movement. */
  const randomizeFullSong = useCallback(() => {
    const key = randomKey(songKey);
    setSongKey(key);
    setSections(randomSong(mood).map((s) => sectionFromTokens(s.name, s.tokens, key, { strategyId: s.strategyId })));
    setImported(true);
    setMeta({ title: `Random ${moodById(mood).name.toLowerCase()} song`, source: "random" });
  }, [songKey, mood]);

  const clearSong = useCallback(() => {
    setSections(defaultSections(songKey));
    setImported(false);
    setMeta({});
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, [songKey]);

  return {
    ready, songKey, setSongKey, sections, imported, meta, updateSection,
    splitPhrase, joinPhrase, redetect, setSectionStrategy, setPhraseStrategy, setRepeat,
    importChart, randomizeSong, randomizeFullSong, mood, setMood, clearSong, notation, setNotation,
  };
}
