"use client";
import { useMemo } from "react";
import { Section, PhrasePlan, PhraseResult, PhraseUnit, planPhrase, solveSection, WANDER_ID } from "@/lib/engine";
import type { Notation } from "@/lib/use-song";

/** How many alternatives the solver keeps per phrase; "Re-roll" cycles through them. */
export const K = 8;

export interface SectionPaths {
  plans: PhrasePlan[];
  results: PhraseResult[];
  /** Tokens no phrase could read as a chord. */
  errors: string[];
  /** Shapes to find across the whole section. */
  chordCount: number;
  /** Phrases per pattern id, for "2 of 3" chips. */
  patternSize: Map<string, number>;
  /** True when some pattern repeats, so the Repeats control matters. */
  hasPattern: boolean;
  /** 1-based occurrence of each phrase within its pattern; 0 when it has none. */
  occurrence: number[];
  /** Slot offset of each phrase within the section, so a seam can name a section-wide slot. */
  offsets: number[];
  /** Some phrase wanders (random path), so a re-roll is always possible. */
  anyWander: boolean;
  /** Most alternatives any phrase has. */
  maxCount: number;
}

/** A chord's label in the chosen notation, parenthesised when it's a passing chord. */
export function unitLabel(u: Pick<PhraseUnit, "chord" | "role">, notation: Notation): string {
  const t = notation === "numbers" ? u.chord.degree : u.chord.name;
  return u.role === "passing" ? `(${t})` : t;
}

/** Pure half of the hook: everything the sheet needs to draw a section's paths for one `alt`. */
export function solveSectionPaths(section: Section, plans: PhrasePlan[], alt: number): SectionPaths {
  const results = solveSection(section, plans, { alt, K });
  const patternSize = new Map<string, number>();
  for (const p of section.phrases) if (p.patternId) patternSize.set(p.patternId, (patternSize.get(p.patternId) ?? 0) + 1);
  const seen = new Map<string, number>();
  const occurrence = section.phrases.map((p) => {
    if (!p.patternId) return 0;
    const n = (seen.get(p.patternId) ?? 0) + 1;
    seen.set(p.patternId, n);
    return n;
  });
  const offsets: number[] = [];
  section.phrases.reduce((off, p) => { offsets.push(off); return off + p.slots.length; }, 0);
  return {
    plans, results,
    errors: plans.flatMap((p) => p.errors),
    chordCount: plans.reduce((n, p) => n + p.units.length, 0),
    patternSize,
    hasPattern: [...patternSize.values()].some((n) => n > 1),
    occurrence, offsets,
    anyWander: results.some((r) => r.strategyId === WANDER_ID),
    maxCount: Math.max(0, ...results.map((r) => r.count)),
  };
}

/**
 * Plans and solves a section's phrases. `alt` picks among each phrase's alternatives; bumping
 * `roll` re-runs the solver so wandering phrases land somewhere new.
 */
export function useSectionPaths(section: Section, songKey: string, alt: number, roll: number): SectionPaths {
  const plans = useMemo(() => section.phrases.map((p) => planPhrase(p, songKey)), [section.phrases, songKey]);
  return useMemo(
    () => solveSectionPaths(section, plans, alt),
    // `roll` re-rolls the wandering phrases.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [section, plans, alt, roll]
  );
}
