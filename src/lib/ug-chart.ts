/**
 * Pure helpers for turning an Ultimate Guitar chord sheet into something the chart importer
 * (`chartToSections` in engine.ts) already understands. Safe to import from client code.
 */
import { KEYS } from "./engine";

/**
 * Strip UG's `[ch]…[/ch]` and `[tab]…[/tab]` markup, leaving plain chords-over-lyrics text.
 * Section headers like `[Verse 1]` are left alone: the importer reads them as section names.
 */
export function ugContentToChart(content: string): string {
  return content.replace(/\r\n?/g, "\n").replace(/\[\/?(?:ch|tab)\]/g, "");
}

const NOTE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * UG's `tonality_name` ("F#m", "Bb", "Ebm") → one of the app's major keys.
 * Minor keys map to their relative major (F#m → A). Returns null for anything unreadable.
 */
export function ugKeyToSongKey(tonality: string | null | undefined): string | null {
  const m = (tonality ?? "").trim().match(/^([A-G])([#b]?)\s*(m|min|minor)?$/i);
  if (!m) return null;
  const root = m[1].toUpperCase();
  let semi = NOTE[root] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  if (m[3]) semi += 3;
  return KEYS[((semi % 12) + 12) % 12];
}
