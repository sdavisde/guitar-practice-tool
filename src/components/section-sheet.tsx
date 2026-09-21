"use client";
import { useState } from "react";
import { Section, RepeatMode, noteNames, hasManual, DEFAULT_STRATEGY } from "@/lib/engine";
import { useSectionPaths, unitLabel } from "@/lib/use-section-paths";
import { ChordRow } from "@/components/chord-row";
import { MovementChips, MOVEMENTS } from "@/components/movement-chips";
import { RepeatToggle } from "@/components/repeat-toggle";
import { RerollButton } from "@/components/reroll-button";
import { PhraseMovementSelect } from "@/components/phrase-movement-select";
import { Label } from "@/components/label";
import { Button } from "@/components/ui/button";
import { Notation } from "@/lib/use-song";

type Props = {
  section: Section;
  songKey: string;
  index: number;
  notation: Notation;
  onSplit: (slotIndex: number) => void;
  onJoin: (phraseIndex: number) => void;
  onRedetect: () => void;
  onStrategy: (id: string) => void;
  onPhraseStrategy: (phraseIndex: number, id: string | undefined) => void;
  onRepeat: (mode: RepeatMode) => void;
};

export function SectionSheet({ section, songKey, index, notation, onSplit, onJoin, onRedetect, onStrategy, onPhraseStrategy, onRepeat }: Props) {
  const [alt, setAlt] = useState(0);
  const [roll, setRoll] = useState(0);

  const names = noteNames(songKey);
  const { plans, results, errors, chordCount, patternSize, hasPattern, occurrence, offsets, anyWander, maxCount } =
    useSectionPaths(section, songKey, alt, roll);

  const sectionStrategy = section.strategyId ?? DEFAULT_STRATEGY;
  const multi = section.phrases.length > 1;
  const movementName = (id: string) => (MOVEMENTS.find((m) => m.id === id)?.name ?? id).toLowerCase();

  return (
    <section id={`section-${index}`} className="grid grid-cols-1 gap-6 border-t border-border pt-8 pb-10 scroll-mt-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 [&>*]:min-w-0">
      <div className="flex flex-col gap-3">
        <h2 className="text-[28px] font-bold leading-tight tracking-[-0.02em]">{section.name}</h2>
        <p className="font-mono text-[13px] text-text-secondary">
          {plans.map((p) => p.units.map((u) => unitLabel(u, notation)).join(" · ")).join("  |  ")}
        </p>
        <div className="mt-2 flex flex-col gap-2">
          <Label>Movement</Label>
          <MovementChips value={sectionStrategy} label={`How to play the ${section.name}`} onChange={(id) => { onStrategy(id); setAlt(0); }} />
        </div>
        {hasPattern && (
          <div className="mt-1 flex flex-col gap-2">
            <Label>Repeats</Label>
            <RepeatToggle value={section.repeat} sectionName={section.name} onChange={(mode) => { onRepeat(mode); setAlt(0); }} />
          </div>
        )}
        <div className="mt-1.5 flex items-center gap-2.5">
          <RerollButton alt={alt} anyWander={anyWander} maxCount={maxCount} onReroll={() => { setAlt((a) => a + 1); setRoll((r) => r + 1); }} />
        </div>
        {hasManual(section) && (
          <Button
            variant="ghost"
            size="sm"
            className="-mx-2 w-fit font-normal text-muted-foreground hover:text-foreground"
            onClick={onRedetect}
            title="Drop your cuts and let the phrases be detected again"
          >
            Re-detect phrases
          </Button>
        )}
        {errors.length > 0 && <p className="text-sm text-destructive">Didn&apos;t understand: {errors.join(", ")}</p>}
      </div>

      <div className="flex min-w-0 flex-col gap-7">
        {chordCount === 0 && (
          <p className="max-w-[60ch] py-1 text-sm text-text-secondary">Type a progression in the index above, or paste a chart.</p>
        )}
        {section.phrases.map((phrase, p) => {
          const { units } = plans[p];
          const { path, fail, strategyId } = results[p];
          const total = phrase.patternId ? patternSize.get(phrase.patternId) ?? 0 : 0;
          const fig = multi ? `Fig. ${index + 1}.${p + 1}` : `Fig. ${index + 1}`;
          if (!units.length) return null;
          return (
            <div key={p} className="flex min-w-0 flex-col gap-3">
              {multi && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <Label>Phrase {p + 1}</Label>
                  {total > 1 && (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[11px] text-accent" title={`Repeat of ${phrase.patternId}`}>
                      {occurrence[p]} of {total}
                    </span>
                  )}
                  <span className="font-mono text-[13px] text-text-secondary">{units.map((u) => unitLabel(u, notation)).join(" · ")}</span>
                  <span className="ml-auto flex items-center gap-2">
                    <PhraseMovementSelect value={phrase.strategyId} phraseIndex={p} onChange={(id) => { onPhraseStrategy(p, id); setAlt(0); }} />
                    {p > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 font-normal text-muted-foreground hover:text-foreground"
                        onClick={() => onJoin(p)}
                        aria-label={`Join phrase ${p + 1} with phrase ${p}`}
                      >
                        Join with previous
                      </Button>
                    )}
                  </span>
                </div>
              )}
              {!path ? (
                <p className="max-w-[60ch] py-1 text-sm text-text-secondary">{fail ?? "No path found for this phrase."}</p>
              ) : (
                <>
                  {/* No neck here: the one above the song carries the fretboard now. With several
                      phrases the row above already names the phrase and its movement. */}
                  {!multi && <Label>{`${fig} · ${section.name}, ${movementName(strategyId)}`}</Label>}
                  <ChordRow path={path} units={units} names={names} notation={notation} onSplit={(i) => onSplit(offsets[p] + units[i].slot)} />
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
