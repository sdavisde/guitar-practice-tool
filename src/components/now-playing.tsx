"use client";
import { useMemo } from "react";
import { Section, RepeatMode, MAX_FRET, noteNames, phraseLyrics, lyricText, DEFAULT_STRATEGY } from "@/lib/engine";
import { useSectionPaths, unitLabel } from "@/lib/use-section-paths";
import { FretMap } from "@/components/diagrams";
import { ChordRow } from "@/components/chord-row";
import { MovementChips } from "@/components/movement-chips";
import { RepeatToggle } from "@/components/repeat-toggle";
import { RerollButton } from "@/components/reroll-button";
import { PhraseMovementSelect } from "@/components/phrase-movement-select";
import { Label } from "@/components/label";
import { Button } from "@/components/ui/button";
import type { Notation } from "@/lib/use-song";

type Props = {
  section: Section;
  index: number;
  phraseIndex: number;
  songKey: string;
  notation: Notation;
  alt: number;
  roll: number;
  onReroll: () => void;
  onStrategy: (id: string) => void;
  onPhraseStrategy: (phraseIndex: number, id: string | undefined) => void;
  onRepeat: (mode: RepeatMode) => void;
  onJoin: (phraseIndex: number) => void;
  onSplit: (slotIndex: number) => void;
};

/** The selected phrase's words, its movement controls, a close-up of the neck and its shapes. */
export function NowPlaying({ section, index, phraseIndex, songKey, notation, alt, roll, onReroll, onStrategy, onPhraseStrategy, onRepeat, onJoin, onSplit }: Props) {
  const names = noteNames(songKey);
  const { plans, results, hasPattern, offsets, anyWander, maxCount } = useSectionPaths(section, songKey, alt, roll);
  const lines = useMemo(() => phraseLyrics(section)[phraseIndex] ?? [], [section, phraseIndex]);

  const phrase = section.phrases[phraseIndex];
  const units = plans[phraseIndex]?.units ?? [];
  const { path = null, fail } = results[phraseIndex] ?? {};
  const run = units.map((u) => unitLabel(u, notation)).join(" · ");
  const words = lyricText(lines);
  const maxUsed = path ? Math.max(0, ...path.flatMap((c) => c.frets)) : 0;
  const maxFret = Math.min(MAX_FRET, Math.max(5, maxUsed + 2));

  return (
    <aside className="flex flex-col gap-3.5 rounded-[14px] border border-border bg-card px-[22px] pt-[18px] pb-[22px] lg:sticky lg:top-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <Label>Now playing</Label>
        <span className="font-mono text-[12px] text-text-secondary">
          Fig. {index + 1}.{phraseIndex + 1} · {section.name}, phrase {phraseIndex + 1} of {section.phrases.length}
        </span>
      </div>
      <p className="text-[22px] font-bold leading-tight tracking-[-0.02em]">{words || run}</p>

      <div className="flex flex-col gap-2">
        <Label>Movement</Label>
        <MovementChips value={section.strategyId ?? DEFAULT_STRATEGY} label={`How to play the ${section.name}`} onChange={onStrategy} />
      </div>
      {hasPattern && (
        <div className="flex flex-col gap-2">
          <Label>Repeats</Label>
          <RepeatToggle value={section.repeat} sectionName={section.name} onChange={onRepeat} />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2.5">
        <RerollButton alt={alt} anyWander={anyWander} maxCount={maxCount} onReroll={onReroll} />
        <span className="ml-auto flex items-center gap-2">
          <PhraseMovementSelect value={phrase?.strategyId} phraseIndex={phraseIndex} onChange={(id) => onPhraseStrategy(phraseIndex, id)} />
          {phraseIndex > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 font-normal text-muted-foreground hover:text-foreground"
              onClick={() => onJoin(phraseIndex)}
              aria-label={`Join phrase ${phraseIndex + 1} with phrase ${phraseIndex}`}
            >
              Join with previous
            </Button>
          )}
        </span>
      </div>

      {!path ? (
        <p className="max-w-[60ch] py-1 text-sm text-text-secondary">{fail ?? "No path found for this phrase."}</p>
      ) : (
        <>
          <div className="rounded-[12px] border border-border bg-background px-3.5 pt-3 pb-0">
            <FretMap path={path} maxFret={maxFret} />
            <Label className="mb-2 block">Frets 0–{maxFret}</Label>
          </div>
          <ChordRow path={path} units={units} names={names} notation={notation} onSplit={(i) => onSplit(offsets[phraseIndex] + units[i].slot)} />
        </>
      )}
    </aside>
  );
}
