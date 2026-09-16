import { Cand, SETS } from "@/lib/engine";
import { ChordDiagram, famCol } from "@/components/diagrams";
import { StringTicks } from "@/components/string-ticks";
import { Notation } from "@/lib/use-song";

export function ChordCard({ cand, names, notation }: { cand: Cand; names: string[]; notation: Notation }) {
  const bigLabel = notation === "numbers" ? cand.chord.degree : cand.chord.name;
  const smallLabel = notation === "numbers" ? cand.chord.name : cand.chord.degree;
  return (
    <div className="w-[112px] rounded-[12px] border border-border bg-card px-2.5 pt-2.5 pb-2">
      <ChordDiagram cand={cand} names={names} />
      <div className="mt-1 flex items-baseline justify-center gap-1.5">
        <span className="text-[16px] font-semibold" style={{ color: famCol(cand) }}>{bigLabel}</span>
        <span className="text-[12px] text-text-secondary">{smallLabel}</span>
      </div>
      <div className="mt-1 flex items-center justify-center gap-1.5">
        <StringTicks cand={cand} />
        <span className="text-[11px] text-muted-foreground">{SETS[cand.set].label}</span>
      </div>
    </div>
  );
}
