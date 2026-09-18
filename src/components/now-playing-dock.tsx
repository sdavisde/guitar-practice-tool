"use client";
import { useEffect, useRef } from "react";
import type { TouchEvent } from "react";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon } from "lucide-react";
import { Section, noteNames } from "@/lib/engine";
import { useSectionPaths, phraseView } from "@/lib/use-section-paths";
import { Position, stepPhrase, swipeDirection } from "@/lib/play-navigation";
import { ChordCard } from "@/components/chord-card";
import { ChordRow } from "@/components/chord-row";
import { NowPlayingControls } from "@/components/now-playing-controls";
import { NowPlayingFigure } from "@/components/now-playing-figure";
import type { NowPlayingProps } from "@/components/now-playing";
import { Button } from "@/components/ui/button";

type Props = NowPlayingProps & {
  sections: Section[];
  current: Position;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onSelect: (pos: Position) => void;
  /** Called with the dock's height whenever it changes, so the sheet can pad for it. */
  onHeight: (height: number) => void;
};

const noFail = "No path found for this phrase.";

/**
 * The Now playing panel as a dock pinned to the bottom of a phone screen: a one-line header with
 * prev/next arrows and the phrase's shapes in a strip; tap the header (or swipe it) to expand it
 * into the full controls, neck and chord row.
 */
export function NowPlayingDock({
  section, index, phraseIndex, songKey, notation, alt, roll,
  onReroll, onStrategy, onPhraseStrategy, onRepeat, onJoin, onSplit,
  sections, current, expanded, onExpandedChange, onSelect, onHeight,
}: Props) {
  const names = noteNames(songKey);
  const paths = useSectionPaths(section, songKey, alt, roll);
  const { hasPattern, offsets, anyWander, maxCount } = paths;
  const { phrase, units, path, fail, run, words, maxFret } = phraseView(section, phraseIndex, paths, notation);

  const prev = stepPhrase(sections, current, -1);
  const next = stepPhrase(sections, current, 1);
  const atStart = prev.section === current.section && prev.phrase === current.phrase;
  const atEnd = next.section === current.section && next.phrase === current.phrase;

  // Tell the page how tall we are so the sheet's last lines can scroll out from under us.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => onHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [onHeight]);

  // A sideways swipe on the header steps between phrases.
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: TouchEvent) => {
    const t = e.changedTouches[0];
    touchStart.current = t ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touchStart.current, t = e.changedTouches[0];
    touchStart.current = null;
    if (!start || !t) return;
    const dir = swipeDirection(t.clientX - start.x, t.clientY - start.y);
    if (dir) onSelect(stepPhrase(sections, current, dir));
  };

  const toggle = () => onExpandedChange(!expanded);

  return (
    <>
      {expanded && <div className="fixed inset-0 z-30 bg-black/40" onClick={() => onExpandedChange(false)} aria-hidden="true" />}
      <div ref={ref} className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
        <div className="flex h-11 items-center px-3" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <Button variant="ghost" size="icon" className="size-11" aria-label="Previous phrase" disabled={atStart} onClick={() => onSelect(prev)}>
            <ChevronLeftIcon />
          </Button>
          <button
            type="button"
            aria-expanded={expanded}
            aria-label="Show controls"
            onClick={toggle}
            className="flex min-w-0 flex-1 flex-col px-1.5 text-left outline-none focus-visible:rounded-md focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="truncate font-mono text-[11px] leading-4 text-muted-foreground">
              Fig. {index + 1}.{phraseIndex + 1} · {section.name}
            </span>
            <span className="truncate text-[14px] font-semibold leading-5">{words || run}</span>
          </button>
          <Button variant="ghost" size="icon" className="size-11" aria-label="Next phrase" disabled={atEnd} onClick={() => onSelect(next)}>
            <ChevronRightIcon />
          </Button>
          <Button variant="ghost" size="icon" className="size-11" aria-label={expanded ? "Hide controls" : "Show controls"} onClick={toggle}>
            {expanded ? <ChevronDownIcon /> : <ChevronUpIcon />}
          </Button>
        </div>

        {expanded ? (
          <div className="flex max-h-[70dvh] flex-col gap-3.5 overflow-y-auto px-4 pb-4">
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
              <p className="max-w-[60ch] py-1 text-sm text-text-secondary">{fail ?? noFail}</p>
            ) : (
              <>
                <NowPlayingFigure path={path} maxFret={maxFret} />
                <ChordRow path={path} units={units} names={names} notation={notation} onSplit={(i) => onSplit(offsets[phraseIndex] + units[i].slot)} />
              </>
            )}
          </div>
        ) : !path ? (
          <p className="px-3 pb-3 text-[13px] text-text-secondary">{fail ?? noFail}</p>
        ) : (
          <div className="flex snap-x gap-2 overflow-x-auto px-3 pb-3">
            {path.map((c, i) => (
              <ChordCard key={i} cand={c} names={names} notation={notation} role={units[i].role} size="compact" className="shrink-0 snap-start" />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
