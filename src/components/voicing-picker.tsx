"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Volume2Icon, VolumeXIcon, XIcon } from "lucide-react";
import { Cand, MAX_FRET, PhraseUnit, STRATEGIES, SetId, candKey, candidates, sameCand } from "@/lib/engine";
import { compare, comparePhrases, movementPick, pitches, voicingColumns } from "@/lib/voicings";
import { playChord, playPair } from "@/lib/audio";
import { useSound } from "@/lib/use-sound";
import type { VoicingContext } from "@/lib/use-section-paths";
import type { Notation } from "@/lib/use-song";
import { Label } from "@/components/label";
import { StringTicks } from "@/components/string-ticks";
import { VoicingCell } from "@/components/voicing-cell";
import { VoicingCompareNeck } from "@/components/voicing-compare-neck";
import { neckGeometry } from "@/components/diagrams";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SET_HEADS: Record<SetId, { grid: string; tab: string }> = {
  "1-3": { grid: "Str 1–3 · thin", tab: "Thin 1–3" },
  "2-4": { grid: "Str 2–4", tab: "Mid 2–4" },
  "3-5": { grid: "Str 3–5 · beefy", tab: "Beefy 3–5" },
};

const chip = "shrink-0 cursor-pointer rounded-full border border-border bg-card px-3.5 text-[13px] text-text-secondary outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-transparent aria-pressed:bg-accent-soft aria-pressed:font-semibold aria-pressed:text-accent";
const quiet = "border-border bg-transparent font-normal text-text-secondary hover:bg-background hover:text-foreground";

export type VoicingPickerProps = {
  unit: PhraseUnit;
  /** The voicing on the path now. */
  current: Cand;
  context: VoicingContext;
  names: string[];
  notation: Notation;
  /** The movement this phrase follows, as the chips name it ("Stay put"). */
  movement: string;
  /** Chords after this one in the phrase: only those re-path around a pin. */
  after: number;
  /** "popover": the desktop grid, shapes sound as you point. "sheet": the phone layout, a tap picks and plays. */
  layout: "popover" | "sheet";
  /** Pin this chord to a voicing (a `candKey`), or let the path decide with none. */
  onPin: (key: string | undefined) => void;
  onClose: () => void;
};

/**
 * Every voicing of one chord, to pick from by shape, by sound and by where it sits against the
 * chord before. Choosing is live: the row behind updates and the chords after this one re-path,
 * while the ones before it stay exactly where they were.
 */
export function VoicingPicker({ unit, current, context, names, notation, movement, after, layout, onPin, onClose }: VoicingPickerProps) {
  const { prev, pathPick, blocked, pinned } = context;
  const sheet = layout === "sheet";
  const [sound, setSound] = useSound();
  const [hovered, setHovered] = useState<string | null>(null);
  const [lane, setLane] = useState<SetId>(current.set);
  const cells = useRef(new Map<string, HTMLButtonElement>());

  const list = useMemo(() => candidates(unit.chord), [unit.chord]);
  const columns = useMemo(() => voicingColumns(list), [list]);
  const focus = list.find((c) => candKey(c) === hovered) ?? current;

  const label = (c: Cand | PhraseUnit["chord"], other = false) => {
    const chord = "chord" in c ? c.chord : c;
    return (notation === "numbers") !== other ? chord.degree : chord.name;
  };
  // Open with the keyboard on the shape being played, so the arrows start from it.
  const currentKey = candKey(current);
  useEffect(() => {
    if (!sheet) cells.current.get(currentKey)?.focus();
    // Only on open: a pin moves `current`, and focus is already where the player clicked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On a phone the neck scrolls sideways: keep the shape being considered in the middle of it.
  const neckScroller = useRef<HTMLDivElement>(null);
  const focusAvg = focus.avg;
  useEffect(() => {
    const el = neckScroller.current;
    if (!sheet || !el) return;
    const { W, fx } = neckGeometry(MAX_FRET);
    el.scrollTo({ left: (fx(focusAvg) / W) * el.scrollWidth - el.clientWidth / 2, behavior: "smooth" });
  }, [sheet, focusAvg]);

  // ...and bring the shape being played into view in the strip when its string set is showing.
  useEffect(() => {
    if (sheet) cells.current.get(currentKey)?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [sheet, lane, currentKey]);

  const say = (c: Cand) => { if (sound) playChord(pitches(c)); };
  const pick = (c: Cand) => {
    if (blocked.has(candKey(c)) && !sameCand(c, current)) return;
    onPin(candKey(c));
    setLane(c.set);
    say(c);
  };

  // Arrow keys walk the grid: up and down a column, sideways to the nearest row of the next one.
  const onGridKey = (e: KeyboardEvent) => {
    const moves: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    const move = moves[e.key];
    if (!move) return;
    const at = (e.target as HTMLElement).closest<HTMLElement>("[data-cell]")?.dataset.cell;
    const col = columns.findIndex((c) => c.cands.some((x) => candKey(x) === at));
    if (col < 0) return;
    e.preventDefault();
    const row = columns[col].cands.findIndex((x) => candKey(x) === at);
    const nextCol = columns[col + move[0]];
    if (!nextCol?.cands.length) return;
    const next = nextCol.cands[Math.max(0, Math.min(nextCol.cands.length - 1, row + move[1]))];
    cells.current.get(candKey(next))?.focus();
  };

  const cell = (c: Cand) => {
    const key = candKey(c), selected = sameCand(c, current);
    return (
      <VoicingCell
        key={key}
        ref={(el) => { if (el) cells.current.set(key, el); else cells.current.delete(key); }}
        data-cell={key}
        cand={c} names={names} prev={prev}
        selected={selected} pinned={selected && pinned} isPick={!!pathPick && sameCand(c, pathPick)}
        blocked={blocked.has(key)} active={hovered === key}
        shape={sheet ? "card" : "row"}
        tabIndex={sheet || selected ? 0 : -1}
        onClick={() => pick(c)}
        {...(sheet ? {} : {
          onPointerEnter: (e) => { if (e.pointerType === "touch") return; setHovered(key); say(c); },
          onPointerLeave: () => setHovered(null),
          // `:focus-visible` keeps a click from sounding twice (once for the focus, once for the pick).
          onFocus: (e) => { setHovered(key); if (e.target.matches(":focus-visible")) say(c); },
          onBlur: () => setHovered(null),
        })}
      />
    );
  };

  const readout = prev ? `vs ${label(prev)} ${label(prev, true)} · ${comparePhrases(compare(prev, focus)).join(" · ")}` : "First chord of the section: nothing to compare it with.";
  // Both layouts read the same line: the popover and the sheet share this footer.
  const foot = pinned
    ? after > 0
      ? "Pinned. Chords after this one re-path around it; the ones before it stay where they are."
      : "Pinned. The chords before it stay where they are."
    : `Following the ${movement} path.`;

  const soundToggle = (
    <Button
      variant="outline" aria-pressed={sound} aria-label={sound ? "Sound on. Turn sound off" : "Sound off. Turn sound on"}
      title={sound ? "Sound on" : "Sound off"}
      className={cn("px-0", quiet, sound && "text-accent hover:text-accent", sheet ? "size-11" : "size-7")}
      onClick={() => setSound(!sound)}
    >
      {sound ? <Volume2Icon /> : <VolumeXIcon />}
    </Button>
  );

  const chips = (
    <div role="group" aria-label="Start from a movement" className={cn("flex gap-1.5", sheet ? "-mx-4 overflow-x-auto px-4 pb-1" : "flex-wrap")}>
      {STRATEGIES.map((s) => {
        const choice = movementPick(s.id, prev, list);
        return (
          <button
            key={s.id} type="button" title={s.blurb} disabled={!choice} aria-pressed={!!choice && sameCand(choice, current)}
            className={cn(chip, sheet ? "h-10" : "h-[30px]", "disabled:cursor-default disabled:opacity-40")}
            onClick={() => choice && pick(choice)}
          >
            {s.name}
          </button>
        );
      })}
    </div>
  );

  const neck = (
    <div ref={neckScroller} className={cn("rounded-[12px] border border-border bg-background px-3 pt-2.5 pb-1", sheet && "overflow-x-auto")}>
      {/* Drawn at its native size on a phone: mobile Chrome misplaces SVG text once the drawing is scaled down. */}
      <VoicingCompareNeck prev={prev} cand={focus} notation={notation} scale={sheet ? 1 : 1.15} className={sheet ? "w-[920px] max-w-none" : "mx-auto max-w-[640px]"} />
    </div>
  );

  const footer = (
    <div className={cn("flex gap-2", sheet
      ? "flex-col border-t border-border px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
      // Stuck to the bottom of the popover's scroller, over its padding, so Done is in reach on a short screen.
      : "sticky -bottom-[18px] -mb-[18px] min-h-8 items-center bg-popover pt-2 pb-[18px]")}>
      <p className="flex-1 text-[13px] text-text-secondary" aria-live="polite">{foot}</p>
      <div className="flex gap-2">
        <Button variant="outline" className={cn("px-3 text-[13px]", quiet, sheet ? "h-11" : "h-8")} disabled={!pinned} onClick={() => onPin(undefined)}>Unpin</Button>
        <Button className={cn("px-4 text-[13px] font-semibold", sheet ? "h-11 flex-1" : "h-8")} onClick={onClose}>Done</Button>
      </div>
    </div>
  );

  if (sheet) {
    const strip = columns.find((c) => c.set === lane)?.cands ?? [];
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="px-4">
          <span className="mx-auto block h-1 w-9 rounded-full bg-neck-line" aria-hidden="true" />
          <div className="flex items-center justify-between gap-2">
            <Label>Voicing for {label(unit.chord)} · {label(unit.chord, true)}</Label>
            {soundToggle}
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-3 [&>*]:shrink-0">
          {neck}
          <div className="flex items-center gap-2">
            <p className="flex-1 font-mono text-[12px] text-text-secondary" aria-live="polite">{readout}</p>
            {prev && (
              <Button variant="outline" className={cn("h-11 shrink-0 px-3 font-mono text-[12px]", quiet)}
                aria-label={`Play ${label(prev)} then this shape`} onClick={() => playPair(pitches(prev), pitches(current))}>
                {label(prev)} → {label(current)}
              </Button>
            )}
          </div>
          <div role="tablist" aria-label="String set" className="grid grid-cols-3 gap-1 rounded-[12px] border border-border bg-background p-1">
            {columns.map(({ set, cands }) => (
              <button
                key={set} type="button" role="tab" aria-selected={lane === set} disabled={!cands.length}
                className="flex h-11 cursor-pointer flex-col items-center justify-center gap-1 rounded-[9px] text-[12px] text-text-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-selected:bg-accent-soft aria-selected:font-semibold aria-selected:text-accent disabled:opacity-40"
                onClick={() => setLane(set)}
              >
                <StringTicks cand={{ ...current, set }} />
                {SET_HEADS[set].tab}
              </button>
            ))}
          </div>
          <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1">{strip.map(cell)}</div>
          <div className="flex flex-col gap-2">
            <Label>Start from</Label>
            {chips}
          </div>
        </div>
        {footer}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* One row for the name, the movement shortcuts and the two icon buttons: the popover has to fit a laptop screen. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Label className="shrink-0">Voicing for {label(unit.chord)} · {label(unit.chord, true)}</Label>
        <div className="flex-1">{chips}</div>
        <div className="flex shrink-0 items-center gap-1">
          {soundToggle}
          <Button variant="ghost" size="icon-sm" className="text-text-secondary" aria-label="Close" onClick={onClose}><XIcon /></Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {neck}
        <div className="flex min-h-7 items-center gap-2">
          <p className="flex-1 font-mono text-[12px] text-text-secondary" aria-live="polite">{readout}</p>
          {prev && <Button variant="outline" className={cn("h-7 px-2.5 text-[12.5px]", quiet)} onClick={() => playPair(pitches(prev), pitches(focus))}>Play previous → this</Button>}
          <Button variant="outline" className={cn("h-7 px-2.5 text-[12.5px]", quiet)} onClick={() => playChord(pitches(focus))}>Play this</Button>
        </div>
      </div>
      {/* The cells are the controls; the grid only routes their arrow keys. */}
      <div className="grid grid-cols-3 items-start gap-2" onKeyDown={onGridKey}>
        {columns.map(({ set, cands }) => (
          <div key={set} className="flex flex-col gap-1.5">
            <div className="flex h-[18px] items-center gap-2">
              <StringTicks cand={{ ...current, set }} />
              <Label>{SET_HEADS[set].grid}</Label>
            </div>
            {cands.map(cell)}
          </div>
        ))}
      </div>
      {footer}
    </div>
  );
}
