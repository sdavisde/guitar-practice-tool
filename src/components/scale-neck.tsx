"use client";
import { useMemo, useRef, useState } from "react";
import { MAX_FRET } from "@/lib/engine";
import {
  DEFAULT_SCALE, ScaleId, ScalePos, bestShapeFor, isRoot, posKey, scaleById, scaleFamilies, scaleNoteNames,
  scalePositions, scaleShapes,
} from "@/lib/scales";
import type { Notation } from "@/lib/use-song";
import { FAM_COLOR, NeckBoard, STRING_NAMES, neckGeometry } from "@/components/diagrams";
import { Label } from "@/components/label";
import { NeckPlate } from "@/components/neck-plate";
import { ScalePicker } from "@/components/scale-picker";

/** The hidden circle you actually hover or tap; wide enough for a finger without reaching the next string. */
const HIT_R = 11;
/** Dot radius and label size at rest and in the box being pointed at. Every dot is labelled, so even
 *  a resting dot has to be wide enough to hold "b7" or "F#". */
const REST = { r: 8.5, rootR: 10, font: 9, weight: 600 };
const LIT = { r: 9.5, rootR: 11, font: 10, weight: 700 };
/** How far the notes outside the pointed-at box fade. Dim enough to recede, readable enough to still count frets by. */
const DIM = 0.45;

/** Step to the next scale note along the string (`df`) or across to another string (`ds`). */
function step(positions: ScalePos[], from: ScalePos, ds: number, df: number): ScalePos | undefined {
  if (df) {
    const along = positions.filter((p) => p.string === from.string).sort((a, b) => a.fret - b.fret);
    return along[along.findIndex((p) => p.fret === from.fret) + df];
  }
  const across = positions.filter((p) => p.string === from.string + ds);
  if (!across.length) return undefined;
  // Nearest note on the neighbouring string, so the hand stays where it is.
  return across.reduce((a, b) => (Math.abs(b.fret - from.fret) < Math.abs(a.fret - from.fret) ? b : a));
}

/**
 * One neck above the whole song, showing a scale on the song's key rather than any one chord's
 * shapes. Every note is labelled and coloured by the chord the key builds on it, so a melody can
 * be found anywhere on the neck without pointing at anything. Pointing is emphasis: the box the
 * note sits in comes forward and the rest fades. Tap to keep a box, tap again or tap the board to
 * let go; arrow keys walk the scale once the neck has focus.
 */
export function ScaleNeck({ songKey, notation }: { songKey: string; notation: Notation }) {
  const [scaleId, setScaleId] = useState<ScaleId>(DEFAULT_SCALE);
  // Both are position keys, so a change of scale or key simply drops a selection that no longer exists.
  const [pinned, setPinned] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const scale = scaleById(scaleId);
  const positions = useMemo(() => scalePositions(scale, songKey), [scale, songKey]);
  const shapes = useMemo(() => scaleShapes(scale, songKey), [scale, songKey]);
  const names = useMemo(() => scaleNoteNames(scale, songKey), [scale, songKey]);
  const families = useMemo(() => scaleFamilies(scale), [scale]);
  const byKey = useMemo(() => new Map(positions.map((p) => [posKey(p), p])), [positions]);

  const active = byKey.get(hovered ?? pinned ?? "");
  const shape = active && bestShapeFor(shapes, active);
  const lit = useMemo(() => new Set(shape?.notes.map(posKey) ?? []), [shape]);

  const { W, H, sy, fx, left, fw } = neckGeometry(MAX_FRET);
  const label = (p: ScalePos) => (notation === "numbers" ? scale.degrees[p.degree] : names[p.degree]);

  /** Keep the note the keyboard just moved to in view on a phone, where the neck scrolls sideways. */
  function reveal(fret: number) {
    const box = scroller.current;
    if (!box) return;
    const x = (fx(fret) / W) * box.scrollWidth;
    if (x < box.scrollLeft + 60) box.scrollLeft = x - 60;
    else if (x > box.scrollLeft + box.clientWidth - 60) box.scrollLeft = x - box.clientWidth + 60;
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setPinned(null); return; }
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0],
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    const from = byKey.get(pinned ?? "") ?? positions.find(isRoot) ?? positions[0];
    const next = pinned ? step(positions, from, move[0], move[1]) : from;
    if (!next) return;
    setPinned(posKey(next));
    reveal(next.fret);
  }

  const caption = shape && active
    ? `Position ${shape.position} · frets ${shape.lowFret}–${shape.highFret} · ${label(active)} on the ${STRING_NAMES[active.string - 1]} string`
    : "Every note is labelled · point at one to bring its box forward, tap to keep it";

  return (
    <div className="grid grid-cols-1 gap-6 pb-2 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 [&>*]:min-w-0">
      <div className="flex flex-col gap-2.5">
        <Label>Scale</Label>
        <ScalePicker value={scaleId} onChange={setScaleId} />
        <p className="max-w-[40ch] pt-0.5 text-[13px] text-text-secondary">{scale.blurb}</p>
      </div>

      <NeckPlate label={`${songKey} ${scale.name} · frets 0–${MAX_FRET}`}>
        <div
          ref={scroller}
          role="group"
          tabIndex={0}
          aria-label={`${songKey} ${scale.name} on the neck. Arrow keys walk the scale.`}
          onKeyDown={onKeyDown}
          onBlur={() => setHovered(null)}
          className="-mx-1 overflow-x-auto px-1 outline-none focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-ring"
        >
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="mt-1 block w-full min-w-[880px] max-w-[920px]"
            onPointerLeave={() => setHovered(null)}
            aria-hidden="true"
          >
            <rect x={0} y={0} width={W} height={H} fill="transparent" onClick={() => setPinned(null)} />
            <NeckBoard maxFret={MAX_FRET} />
            {shape && (
              <rect
                x={left + Math.max(0, shape.lowFret - 1) * fw} y={sy(1) - 14}
                width={(shape.highFret - Math.max(0, shape.lowFret - 1)) * fw} height={sy(6) - sy(1) + 28}
                rx={10} fill="var(--neck-ink)" fillOpacity={0.05} pointerEvents="none"
              />
            )}
            {positions.map((p) => {
              const k = posKey(p);
              const x = fx(p.fret), y = sy(p.string), root = isRoot(p);
              const on = !active || lit.has(k);
              const size = on && active ? LIT : REST;
              const r = root ? size.rootR : size.r;
              const colour = FAM_COLOR[families[p.degree]];
              const text = label(p);
              // "b3" and "F#" need a point off the size to sit inside the dot; "1" and "G" don't.
              const font = size.font - (text.length > 1 ? 1 : 0);
              return (
                <g key={k} pointerEvents="none" opacity={on ? 1 : DIM}>
                  <circle cx={x} cy={y} r={r} fill={colour} />
                  {root && <circle cx={x} cy={y} r={r + 3} fill="none" stroke={colour} strokeWidth={1.4} strokeOpacity={0.75} />}
                  <text
                    x={x} y={y + font * 0.36} textAnchor="middle" className="font-mono"
                    fontSize={font} fontWeight={size.weight} fill="var(--neck-dot-text)"
                  >
                    {text}
                  </text>
                  {k === (hovered ?? pinned) && (
                    <circle cx={x} cy={y} r={r + 5.5} fill="none" stroke="var(--neck-ink)" strokeWidth={1.2} strokeOpacity={0.85} />
                  )}
                </g>
              );
            })}
            {positions.map((p) => {
              const k = posKey(p);
              return (
                <circle
                  key={`hit-${k}`}
                  cx={fx(p.fret)} cy={sy(p.string)} r={HIT_R}
                  fill="transparent"
                  className="cursor-pointer"
                  onPointerEnter={(e) => { if (e.pointerType !== "touch") setHovered(k); }}
                  onPointerLeave={(e) => { if (e.pointerType !== "touch") setHovered(null); }}
                  onClick={() => setPinned((prev) => (prev === k ? null : k))}
                />
              );
            })}
          </svg>
        </div>
        <p className="pb-4 pt-1 font-mono text-[12px] text-muted-foreground" aria-live="polite">{caption}</p>
      </NeckPlate>
    </div>
  );
}
