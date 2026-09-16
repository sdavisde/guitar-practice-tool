"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Section, chartToSections } from "@/lib/engine";

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
      return data as StoredSong;
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
 * Page-level song state: key, the typed progression, and an imported chart.
 * Persisted to localStorage (see STORAGE_KEY) so a refresh doesn't lose it;
 * loaded after mount to stay hydration-safe.
 */
export function useSong() {
  const [songKey, setSongKey] = useState(DEFAULT_KEY);
  const [text, setText] = useState(DEFAULT_PROGRESSION);
  const [imported, setImported] = useState<Section[] | null>(null);
  const [notation, setNotation] = useState<Notation>("numbers");
  const hydrated = useRef(false);

  // Load persisted state once on mount (client-only, after first render).
  useEffect(() => {
    const stored = loadStoredSong();
    if (stored) {
      setSongKey(stored.songKey);
      setText(stored.text);
      setImported(stored.imported);
      setNotation(stored.notation);
    }
  }, []);

  // Save on every change. The first run happens in the same commit as the load
  // above (before its setters re-render), so skip it to avoid writing defaults.
  useEffect(() => {
    if (!hydrated.current) { hydrated.current = true; return; }
    try {
      const payload: StoredSong = { v: 1, songKey, text, imported, notation };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore (quota, private mode, storage disabled, etc.)
    }
  }, [songKey, text, imported, notation]);

  // Always at least one section so the index has a row to edit.
  const sections: Section[] = useMemo(
    () => (imported?.length ? imported : [{ name: "Song", tokens: tokenize(text) }]),
    [imported, text]
  );

  const updateSection = useCallback((index: number, progression: string) => {
    const tokens = tokenize(progression);
    if (!imported?.length) { setText(progression); return; }
    setImported(imported.map((s, i) => (i === index ? { ...s, tokens } : s)));
  }, [imported]);

  const importChart = useCallback((chart: string): string | null => {
    const { sections: secs, key } = chartToSections(chart, songKey);
    if (!secs.length) return "No chords found in that chart.";
    setImported(secs);
    setSongKey(key);
    return null;
  }, [songKey]);

  const clearSong = useCallback(() => {
    setImported(null);
    setText(DEFAULT_PROGRESSION);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { songKey, setSongKey, sections, imported: Boolean(imported), updateSection, importChart, clearSong, notation, setNotation };
}
