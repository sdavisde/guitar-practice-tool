"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Section, SplitMap, chartToSections, addCut, expandSplits, normalizeCuts, removeCut, shiftCuts,
} from "@/lib/engine";

export type Notation = "numbers" | "names";

const DEFAULT_KEY = "G";
const DEFAULT_PROGRESSION = "1 5 6m 4";

const STORAGE_KEY = "triad-paths:song";

type StoredSong = {
  v: 1;
  songKey: string;
  text: string;
  imported: Section[] | null;
  notation: Notation;
  // Added after v1 shipped: songs stored before splits existed simply have no cuts.
  splits: SplitMap;
};

function isSection(x: unknown): x is Section {
  return (
    !!x &&
    typeof x === "object" &&
    typeof (x as Section).name === "string" &&
    Array.isArray((x as Section).tokens) &&
    (x as Section).tokens.every((t) => typeof t === "string")
  );
}

/** Loose: anything that isn't a {sectionIndex: number[]} entry is dropped, not rejected. */
function toSplitMap(x: unknown): SplitMap {
  if (!x || typeof x !== "object" || Array.isArray(x)) return {};
  const out: SplitMap = {};
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    const i = Number(k);
    if (!Number.isInteger(i) || i < 0 || !Array.isArray(v)) continue;
    if (v.every((n): n is number => typeof n === "number")) out[i] = v;
  }
  return out;
}

function loadStoredSong(): StoredSong | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (
      data?.v === 1 &&
      typeof data.songKey === "string" &&
      typeof data.text === "string" &&
      (data.imported === null || (Array.isArray(data.imported) && data.imported.every(isSection))) &&
      (data.notation === "numbers" || data.notation === "names")
    ) {
      return { ...(data as StoredSong), splits: toSplitMap(data.splits) };
    }
  } catch {
    // ignore (parse error, storage disabled, etc.)
  }
  return null;
}

export function tokenize(text: string): string[] {
  return text.replace(/[|,]/g, " ").split(/\s+/).filter(Boolean);
}

/**
 * Page-level song state: key, the typed progression, an imported chart, and the
 * cuts the user has made by hand (see `splits`).
 * Persisted to localStorage (see STORAGE_KEY) so a refresh doesn't lose it;
 * loaded after mount to stay hydration-safe.
 */
export function useSong() {
  const [songKey, setSongKey] = useState(DEFAULT_KEY);
  const [text, setText] = useState(DEFAULT_PROGRESSION);
  const [imported, setImported] = useState<Section[] | null>(null);
  const [notation, setNotation] = useState<Notation>("numbers");
  // Where the user has hand-split a section, keyed by index into the *base* sections
  // below, so a split survives a key change and doesn't depend on section names.
  const [splits, setSplits] = useState<SplitMap>({});
  const hydrated = useRef(false);

  // Load persisted state once on mount (client-only, after first render).
  useEffect(() => {
    const stored = loadStoredSong();
    if (stored) {
      setSongKey(stored.songKey);
      setText(stored.text);
      setImported(stored.imported);
      setNotation(stored.notation);
      setSplits(stored.splits);
    }
  }, []);

  // Save on every change. The first run happens in the same commit as the load
  // above (before its setters re-render), so skip it to avoid writing defaults.
  useEffect(() => {
    if (!hydrated.current) { hydrated.current = true; return; }
    try {
      const payload: StoredSong = { v: 1, songKey, text, imported, notation, splits };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore (quota, private mode, storage disabled, etc.)
    }
  }, [songKey, text, imported, notation, splits]);

  // The song before any hand-splitting. Always at least one section so the index has a row to edit.
  const base: Section[] = useMemo(
    () => (imported?.length ? imported : [{ name: "Song", tokens: tokenize(text) }]),
    [imported, text]
  );

  // What the page renders: the base sections cut at every split point, named "Chorus (1)",
  // "Chorus (2)", ... `origins` traces each one back to the base section it came from.
  const { sections, origins } = useMemo(() => expandSplits(base, splits), [base, splits]);

  const writeBase = useCallback((baseIndex: number, tokens: string[]) => {
    if (!imported?.length) { setText(tokens.join(" ")); return; }
    setImported(imported.map((s, i) => (i === baseIndex ? { ...s, tokens } : s)));
  }, [imported]);

  /**
   * Edit one displayed section's progression. The edit is written back into the slice of
   * the base section that section covers, and that base section's other cuts slide along
   * with it — so editing half of a split song keeps the split instead of undoing it.
   */
  const updateSection = useCallback((index: number, progression: string) => {
    const origin = origins[index];
    if (!origin) return;
    const { baseIndex, tokenStart } = origin;
    const was = sections[index].tokens;
    const next = tokenize(progression);
    const old = base[baseIndex].tokens;
    const tokens = [...old.slice(0, tokenStart), ...next, ...old.slice(tokenStart + was.length)];
    setSplits((prev) => ({
      ...prev,
      [baseIndex]: normalizeCuts(shiftCuts(prev[baseIndex] ?? [], tokenStart, next.length - was.length), tokens.length),
    }));
    writeBase(baseIndex, tokens);
  }, [base, sections, origins, writeBase]);

  /** A section can only rejoin the one before it when both came from the same base section. */
  const canJoin = useCallback(
    (index: number) => index > 0 && !!origins[index] && origins[index - 1]?.baseIndex === origins[index].baseIndex,
    [origins]
  );

  /** Cut the displayed section `index` in two at `tokenIndex` (an index into its own tokens). */
  const splitSection = useCallback((index: number, tokenIndex: number) => {
    const origin = origins[index];
    if (!origin) return;
    setSplits((prev) => addCut(prev, origin.baseIndex, origin.tokenStart + tokenIndex));
  }, [origins]);

  /** Merge the displayed section `index` back into the one before it. */
  const joinSection = useCallback((index: number) => {
    const origin = origins[index];
    if (!canJoin(index) || !origin) return;
    setSplits((prev) => removeCut(prev, origin.baseIndex, origin.tokenStart));
  }, [origins, canJoin]);

  const importChart = useCallback((chart: string): string | null => {
    const { sections: secs, key } = chartToSections(chart, songKey);
    if (!secs.length) return "No chords found in that chart.";
    setSplits({});
    setImported(secs);
    setSongKey(key);
    return null;
  }, [songKey]);

  const clearSong = useCallback(() => {
    setSplits({});
    setImported(null);
    setText(DEFAULT_PROGRESSION);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return {
    songKey, setSongKey, sections, imported: Boolean(imported), updateSection,
    splitSection, joinSection, canJoin, importChart, clearSong, notation, setNotation,
  };
}
