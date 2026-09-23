import type { ComponentProps } from "react";
import { Cand } from "@/lib/engine";
import { INVERSION_NAMES, compare, fretText, inversion, signedSemitones } from "@/lib/voicings";
import { ChordDiagram } from "@/components/diagrams";
import { cn } from "@/lib/utils";

const tag = "font-mono text-[9.5px] tracking-[0.08em]";

/** Up, down or level: how the shape sounds against the chord before. */
function PitchArrow({ semitones }: { semitones: number }) {
  const d = semitones > 0 ? "M6 10V2M2.5 5.5 6 2l3.5 3.5" : semitones < 0 ? "M6 2v8M2.5 6.5 6 10l3.5-3.5" : "M2 6h8";
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5}
      strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

type Props = {
  cand: Cand;
  names: string[];
  /** The chord before, to say how much higher or lower this shape sounds; none at the start of a section. */
  prev?: Cand;
  /** This is the voicing on the path right now. */
  selected: boolean;
  /** ...and it is there because the player pinned it. */
  pinned: boolean;
  /** What the engine would choose here if left alone. */
  isPick: boolean;
  /** Pinning this would leave the phrase's movement no path. */
  blocked: boolean;
  /** Being pointed at or focused. */
  active: boolean;
  /** "row" is the desktop grid cell; "card" the taller one in the phone sheet's strip. */
  shape: "row" | "card";
} & ComponentProps<"button">;

/** One voicing in the picker: its diagram, inversion, frets and how it sounds against the chord before. */
export function VoicingCell({ cand, names, prev, selected, pinned, isPick, blocked, active, shape, className, ...button }: Props) {
  const rel = prev ? compare(prev, cand).semitones : undefined;
  const card = shape === "card";
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-disabled={blocked || undefined}
      aria-label={[
        INVERSION_NAMES[inversion(cand)], fretText(cand),
        rel === undefined ? "" : signedSemitones(rel).replace(" st", " semitones"),
        pinned ? "pinned" : "", isPick ? "path pick" : "", blocked ? "breaks the movement" : "",
      ].filter(Boolean).join(", ")}
      className={cn(
        "flex cursor-pointer rounded-[10px] border border-border bg-background text-left outline-none transition-colors",
        card ? "min-h-[150px] w-[132px] shrink-0 snap-start flex-col items-stretch gap-1.5 rounded-[12px] px-2.5 pt-2.5 pb-2"
          : "min-h-[70px] items-center gap-3 px-2.5 py-1",
        "focus-visible:ring-3 focus-visible:ring-ring/50",
        active && !selected && "border-text-secondary bg-card",
        selected && "border-accent bg-accent-soft",
        blocked && !selected && "opacity-45",
        className
      )}
      {...button}
    >
      <span className={cn("block shrink-0", card ? "mx-auto w-[84px]" : "w-14")} aria-hidden="true">
        <ChordDiagram cand={cand} names={names} />
      </span>
      <span className={cn("flex min-w-0 flex-1 flex-col", card ? "gap-[3px]" : "gap-px")}>
        <span className="text-[13px] font-semibold text-foreground">{INVERSION_NAMES[inversion(cand)]}</span>
        <span className="font-mono text-[12px] text-muted-foreground">{fretText(cand)}</span>
        <span className="flex min-h-[18px] flex-wrap items-center gap-x-1 text-[12px] text-text-secondary">
          {rel !== undefined && <><PitchArrow semitones={rel} />{signedSemitones(rel)}</>}
          {pinned
            ? <span className={cn(tag, "ml-auto font-semibold text-accent")}>PINNED</span>
            : isPick
              ? <span className={cn(tag, "ml-auto rounded-[4px] border border-neck-line px-[5px] py-px font-medium text-text-secondary")}>PATH PICK</span>
              : blocked && <span className={cn(tag, "ml-auto text-muted-foreground")}>NO PATH</span>}
        </span>
      </span>
    </button>
  );
}
