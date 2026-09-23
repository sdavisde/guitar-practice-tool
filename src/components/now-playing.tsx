"use client";
import { Section, RepeatMode, noteNames, phraseHasPins } from "@/lib/engine";
import { heldBefore, useSectionPaths, phraseView, voicingContext } from "@/lib/use-section-paths";
import { ChordRow } from "@/components/chord-row";
import { NowPlayingControls } from "@/components/now-playing-controls";
import { NowPlayingFigure } from "@/components/now-playing-figure";
import { MOVEMENTS } from "@/components/movement-chips";
import { Label } from "@/components/label";
import { Button } from "@/components/ui/button";
import type { Notation } from "@/lib/use-song";

export type NowPlayingProps = {
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
  /** Pin the chord at `slotIndex` to a voicing, or unpin it with no key. `hold` holds the chords before it where they are. */
  onPin: (slotIndex: number, key: string | undefined, hold: Map<number, string>) => void;
  onClearPins: (phraseIndex: number) => void;
};

/** The selected phrase's words, its movement controls, a close-up of the neck and its shapes. */
export function NowPlaying({ section, index, phraseIndex, songKey, notation, alt, roll, onReroll, onStrategy, onPhraseStrategy, onRepeat, onJoin, onSplit, onPin, onClearPins }: NowPlayingProps) {
  const names = noteNames(songKey);
  const paths = useSectionPaths(section, songKey, alt, roll);
  const { hasPattern, offsets, anyWander, maxCount } = paths;
  const { phrase, units, path, fail, run, words, maxFret } = phraseView(section, phraseIndex, paths, notation);

  return (
    <aside className="flex flex-col gap-3.5 rounded-[14px] border border-border bg-card px-[22px] pt-[18px] pb-[22px] lg:sticky lg:top-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <Label>Now playing</Label>
        <span className="font-mono text-[12px] text-text-secondary">
          Fig. {index + 1}.{phraseIndex + 1} · {section.name}, phrase {phraseIndex + 1} of {section.phrases.length}
        </span>
      </div>
      <p className="text-[22px] font-bold leading-tight tracking-[-0.02em]">{words || run}</p>

      <NowPlayingControls
        section={section}
        phrase={phrase}
        phraseIndex={phraseIndex}
        hasPattern={hasPattern}
        alt={alt}
        anyWander={anyWander}
        maxCount={maxCount}
        onReroll={onReroll}
        onStrategy={onStrategy}
        onPhraseStrategy={onPhraseStrategy}
        onRepeat={onRepeat}
        onJoin={onJoin}
      />

      {!path ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-1">
          <p className="max-w-[60ch] text-sm text-text-secondary">{fail ?? "No path found for this phrase."}</p>
          {phrase && phraseHasPins(phrase) && (
            <Button variant="outline" className="h-[30px] px-3 text-[13px]" onClick={() => onClearPins(phraseIndex)}>Unpin this phrase&apos;s shapes</Button>
          )}
        </div>
      ) : (
        <>
          <NowPlayingFigure path={path} maxFret={maxFret} />
          <ChordRow path={path} units={units} names={names} notation={notation} onSplit={(i) => onSplit(offsets[phraseIndex] + units[i].slot)}
            picking={{
              context: (i) => voicingContext(section, songKey, paths, alt, phraseIndex, i),
              movement: MOVEMENTS.find((m) => m.id === paths.results[phraseIndex]?.strategyId)?.name ?? "",
              onPin: (i, key) => onPin(offsets[phraseIndex] + units[i].slot, key, heldBefore(paths, phraseIndex, i)),
            }}
          />
        </>
      )}
    </aside>
  );
}
