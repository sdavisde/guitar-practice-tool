"use client";
import { Section, RepeatMode, Phrase, DEFAULT_STRATEGY } from "@/lib/engine";
import { MovementChips } from "@/components/movement-chips";
import { RepeatToggle } from "@/components/repeat-toggle";
import { RerollButton } from "@/components/reroll-button";
import { PhraseMovementSelect } from "@/components/phrase-movement-select";
import { Label } from "@/components/label";
import { Button } from "@/components/ui/button";

type Props = {
  section: Section;
  phrase: Phrase | undefined;
  phraseIndex: number;
  hasPattern: boolean;
  alt: number;
  anyWander: boolean;
  maxCount: number;
  onReroll: () => void;
  onStrategy: (id: string) => void;
  onPhraseStrategy: (phraseIndex: number, id: string | undefined) => void;
  onRepeat: (mode: RepeatMode) => void;
  onJoin: (phraseIndex: number) => void;
};

/** The section's movement and repeat controls, then the re-roll row for the selected phrase. Renders as siblings for the parent's flex gap. */
export function NowPlayingControls({ section, phrase, phraseIndex, hasPattern, alt, anyWander, maxCount, onReroll, onStrategy, onPhraseStrategy, onRepeat, onJoin }: Props) {
  return (
    <>
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
    </>
  );
}
