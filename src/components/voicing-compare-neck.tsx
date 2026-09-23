import { Cand, MAX_FRET } from "@/lib/engine";
import { SET_STRINGS } from "@/lib/voicings";
import { NeckBoard, famCol, neckGeometry, neckShort } from "@/components/diagrams";
import type { Notation } from "@/lib/use-song";
import { cn } from "@/lib/utils";

function place(c: Cand) {
  const { sy, fx } = neckGeometry(MAX_FRET);
  const strings = SET_STRINGS[c.set];
  const notes = c.frets.map((fr, j) => ({ x: fx(fr), y: sy(strings[j]), isRoot: c.tones[j] === c.chord.root }));
  return { notes, root: notes.find((n) => n.isRoot) ?? notes[0], points: notes.map((n) => `${n.x},${n.y}`).join(" ") };
}

/**
 * The whole neck with two shapes on it: the chord before as a hollow grey ghost, and the voicing
 * being considered drawn the way the fretboard map draws a shape. `scale` enlarges the dots for
 * the phone sheet, where the neck is shown smaller.
 */
export function VoicingCompareNeck({ prev, cand, notation, scale = 1, className }: {
  prev?: Cand; cand: Cand; notation: Notation; scale?: number; className?: string;
}) {
  const short = (c: Cand) => neckShort(c, notation === "numbers" ? c.chord.degree : c.chord.name);
  const { W, H } = neckGeometry(MAX_FRET);
  const ghost = prev && place(prev);
  const focus = place(cand);
  const col = famCol(cand);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cn("block w-full", className)}
      role="img"
      aria-label={prev
        ? `Fretboard showing ${cand.chord.name} against ${prev.chord.name}, the chord before it`
        : `Fretboard showing where this ${cand.chord.name} shape sits`}
    >
      <NeckBoard maxFret={MAX_FRET} />
      {ghost && prev && (
        <g>
          <polyline points={ghost.points} fill="none" stroke="var(--neck-muted)" strokeWidth={1.3} strokeDasharray="3 3" strokeOpacity={0.8} />
          {ghost.notes.map((n, j) => (
            <circle key={j} cx={n.x} cy={n.y} r={(n.isRoot ? 8 : 4.5) * scale} fill="var(--background)" stroke="var(--neck-muted)" strokeWidth={1.4} />
          ))}
          <text x={ghost.root.x} y={ghost.root.y + 3} textAnchor="middle" fontSize={8 * scale} fontWeight={600} fill="var(--neck-muted)">
            {short(prev)}
          </text>
        </g>
      )}
      <polyline points={focus.points} fill="none" stroke={col} strokeWidth={1.5} strokeOpacity={0.55} />
      {focus.notes.filter((n) => !n.isRoot).map((n, j) => (
        <circle key={j} cx={n.x} cy={n.y} r={4.5 * scale} fill={col} fillOpacity={0.7} />
      ))}
      <circle cx={focus.root.x} cy={focus.root.y} r={10 * scale} fill={col} />
      <circle cx={focus.root.x} cy={focus.root.y} r={13 * scale} fill="none" stroke={col} strokeWidth={1.5} />
      <text x={focus.root.x} y={focus.root.y + 3.5} textAnchor="middle" fontSize={9.5 * scale} fontWeight={600} fill="var(--neck-dot-text)">
        {short(cand)}
      </text>
    </svg>
  );
}
