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
  className?: string;
};

export function ChordCard({ cand, names, notation, role = "structural", size, className }: Props) {
  const bigLabel = notation === "numbers" ? cand.chord.degree : cand.chord.name;
  const smallLabel = notation === "numbers" ? cand.chord.name : cand.chord.degree;
  const passing = role === "passing";
  const compact = size === "compact";
  return (
    <div
      className={cn(
        "rounded-[12px] border border-border bg-card px-2.5 pt-2.5 pb-2",
        compact ? "w-[88px]" : "w-[112px]",
        passing && "border-dashed opacity-60",
        className
      )}
    >
      <ChordDiagram cand={cand} names={names} />
      <div className="mt-1 flex flex-wrap items-baseline justify-center gap-x-1.5">
        <span className="text-[16px] font-semibold" style={{ color: famCol(cand) }}>{bigLabel}</span>
        <span className="text-[12px] text-text-secondary">{smallLabel}</span>
      </div>
      {/* Ticks beside the set label; under it in a compact card, where the pair no longer fits on one line. */}
      <div className={cn("mt-1 flex items-center justify-center gap-1.5", compact && "flex-col gap-0.5")}>
        <StringTicks cand={cand} />
        <span className="text-[11px] text-muted-foreground">{passing ? "passing" : SETS[cand.set].label}</span>
      </div>
    </div>
  );
}
