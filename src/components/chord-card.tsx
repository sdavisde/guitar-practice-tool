import type { ComponentProps } from "react";
import { Cand, Role, SETS } from "@/lib/engine";
import { ChordDiagram, famCol } from "@/components/diagrams";
import { StringTicks } from "@/components/string-ticks";
import { Notation } from "@/lib/use-song";
import { cn } from "@/lib/utils";

type Props = {
  cand: Cand;
  names: string[];
  notation: Notation;
  role?: Role;
  /** "compact" narrows the card for a strip (the diagram scales with it). */
  size?: "compact";
  /** The player chose this shape by hand: a quiet dot in the corner says so. */
  pinned?: boolean;
  className?: string;
};

const frame = "rounded-[12px] border border-border bg-card px-2.5 pt-2.5 pb-2";

function CardFace({ cand, names, notation, role = "structural", size, pinned }: Omit<Props, "className">) {
  const bigLabel = notation === "numbers" ? cand.chord.degree : cand.chord.name;
  const smallLabel = notation === "numbers" ? cand.chord.name : cand.chord.degree;
  const compact = size === "compact";
  return (
    <>
      {pinned && <span className="absolute right-2 top-2 size-1.5 rounded-full bg-accent" aria-hidden="true" />}
      <ChordDiagram cand={cand} names={names} />
      <span className="mt-1 flex flex-wrap items-baseline justify-center gap-x-1.5">
        <span className="text-[16px] font-semibold" style={{ color: famCol(cand) }}>{bigLabel}</span>
        <span className="text-[12px] text-text-secondary">{smallLabel}</span>
      </span>
      {/* Ticks beside the set label; under it in a compact card, where the pair no longer fits on one line. */}
      <span className={cn("mt-1 flex items-center justify-center gap-1.5", compact && "flex-col gap-0.5")}>
        <StringTicks cand={cand} />
        <span className="text-[11px] text-muted-foreground">{role === "passing" ? "passing" : SETS[cand.set].label}</span>
      </span>
    </>
  );
}

const width = (size?: "compact") => (size === "compact" ? "w-[88px]" : "w-[112px]");

export function ChordCard({ className, ...face }: Props) {
  return (
    <div className={cn("relative", frame, width(face.size), face.role === "passing" && "border-dashed opacity-60", className)}>
      <CardFace {...face} />
    </div>
  );
}

/**
 * The same card as a button that opens the voicing picker. Extra props (and the ref) land on the
 * button, so it can sit under a popover trigger.
 */
export function ChordCardButton({ className, cand, names, notation, role, size, pinned, ...button }: Props & ComponentProps<"button">) {
  const label = notation === "numbers" ? cand.chord.degree : cand.chord.name;
  return (
    <button
      type="button"
      aria-label={`${label}, ${SETS[cand.set].label}${pinned ? ", your pick" : ""}. Choose another voicing`}
      className={cn(
        "relative block cursor-pointer text-center outline-none transition-colors", frame, width(size),
        "hover:border-neck-line focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "data-[state=open]:border-accent data-[state=open]:ring-3 data-[state=open]:ring-accent-soft",
        role === "passing" && "border-dashed opacity-60 hover:opacity-100 data-[state=open]:opacity-100",
        className
      )}
      {...button}
    >
      <CardFace cand={cand} names={names} notation={notation} role={role} size={size} pinned={pinned} />
    </button>
  );
}
