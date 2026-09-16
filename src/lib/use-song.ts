"use client";
import { useCallback, useMemo, useState } from "react";
import { Section, chartToSections } from "@/lib/engine";

export type Notation = "numbers" | "names";

const DEFAULT_KEY = "G";
const DEFAULT_PROGRESSION = "1 5 6m 4";

export function tokenize(text: string): string[] {
  return text.replace(/[|,]/g, " ").split(/\s+/).filter(Boolean);
}

/**
 * Page-level song state: key, the typed progression, and an imported chart.
 * Kept in one place so persistence (e.g. localStorage) can be added here later
 * without touching any component.
 */
export function useSong() {
  const [songKey, setSongKey] = useState(DEFAULT_KEY);
  const [text, setText] = useState(DEFAULT_PROGRESSION);
  const [imported, setImported] = useState<Section[] | null>(null);
  const [notation, setNotation] = useState<Notation>("numbers");

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

  const clearSong = useCallback(() => { setImported(null); setText(DEFAULT_PROGRESSION); }, []);

  return { songKey, setSongKey, sections, imported: Boolean(imported), updateSection, importChart, clearSong, notation, setNotation };
}
