import type { Section } from "@/lib/engine";

/** A phrase in the song: section index and phrase index within it. */
export interface Position { section: number; phrase: number }

const samePos = (a: Position, b: Position) => a.section === b.section && a.phrase === b.phrase;

/** Every phrase that has chords, in song order. */
export function playablePositions(sections: Section[]): Position[] {
  return sections.flatMap((s, section) => s.phrases.flatMap((p, phrase) => (p.slots.length ? [{ section, phrase }] : [])));
}

/**
 * The position itself when it's playable; otherwise the nearest playable phrase before it (or
 * the first one), so a selection survives a join or an import. Null when nothing is playable.
 */
export function clampPosition(sections: Section[], pos: Position): Position | null {
  const all = playablePositions(sections);
  if (!all.length) return null;
  if (all.some((p) => samePos(p, pos))) return pos;
  const before = all.filter((p) => p.section < pos.section || (p.section === pos.section && p.phrase < pos.phrase));
  return before[before.length - 1] ?? all[0];
}

/** The next (`dir` 1) or previous (`dir` -1) playable phrase, continuing across sections; clamped at the ends. */
export function stepPhrase(sections: Section[], pos: Position, dir: 1 | -1): Position {
  const all = playablePositions(sections);
  const i = all.findIndex((p) => samePos(p, pos));
  if (i < 0) return clampPosition(sections, pos) ?? pos;
  return all[Math.max(0, Math.min(all.length - 1, i + dir))];
}

/** The first playable phrase of the next (`dir` 1) or previous (`dir` -1) section that has one; clamped at the ends. */
export function stepSection(sections: Section[], pos: Position, dir: 1 | -1): Position {
  const all = playablePositions(sections);
  for (let s = pos.section + dir; s >= 0 && s < sections.length; s += dir) {
    const first = all.find((p) => p.section === s);
    if (first) return first;
  }
  return pos;
}
