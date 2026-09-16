"use client";
import { useMemo, useState } from "react";
import { candidates, kBest, randomPath, parseProgression, STRATEGIES, Cand, noteNames, Section } from "@/lib/engine";
import { FretMap } from "@/components/diagrams";
import { ChordCard } from "@/components/chord-card";
import { NeckPlate } from "@/components/neck-plate";
import { MovementChips, WANDER_ID } from "@/components/movement-chips";
import { Label } from "@/components/label";
import { Button } from "@/components/ui/button";
import { DiceIcon } from "@/components/icons";
import { Notation } from "@/lib/use-song";

const K = 8;

export function SectionSheet({ section, songKey, index, notation }: { section: Section; songKey: string; index: number; notation: Notation }) {
  const [stratId, setStratId] = useState("stay");
  const [alt, setAlt] = useState(0);
  const [roll, setRoll] = useState(0);

  const names = noteNames(songKey);
  const { chords, errors } = useMemo(
    () => parseProgression(section.tokens.join(" "), songKey),
    [section.tokens, songKey]
  );
  const lists = useMemo(() => chords.map((c) => candidates(c)), [chords]);
  const strat = STRATEGIES.find((s) => s.id === stratId);
  const isWander = stratId === WANDER_ID;
  const paths = useMemo(() => (strat ? kBest(lists, strat, K) : []), [lists, strat]);
  const wander = useMemo(
    () => (isWander ? randomPath(lists) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lists, isWander, roll]
  );

  const path: Cand[] | null = isWander ? wander : paths[alt % Math.max(1, paths.length)] ?? null;
  const count = isWander ? 0 : paths.length;
  const movementName = isWander ? "wander" : (strat?.name ?? "").toLowerCase();

  return (
    <section id={`section-${index}`} className="grid grid-cols-1 gap-6 border-t border-border pt-8 pb-10 scroll-mt-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 [&>*]:min-w-0">
      <div className="flex flex-col gap-3">
        <h2 className="text-[28px] font-bold leading-tight tracking-[-0.02em]">{section.name}</h2>
        <p className="font-mono text-[13px] text-text-secondary">{chords.map((c) => (notation === "numbers" ? c.degree : c.name)).join(" · ")}</p>
        <div className="mt-2 flex flex-col gap-2">
          <Label>Movement</Label>
          <MovementChips value={stratId} label={`How to play the ${section.name}`} onChange={(id) => { setStratId(id); setAlt(0); }} />
        </div>
        <div className="mt-1.5 flex items-center gap-2.5">
          {isWander ? (
            <Button variant="outline" className="h-[34px] px-3.5 text-[13px]" onClick={() => setRoll((r) => r + 1)}><DiceIcon /> Roll again</Button>
          ) : (
            <>
              <Button variant="outline" className="h-[34px] px-3.5 text-[13px]" disabled={count < 2} onClick={() => setAlt((a) => a + 1)}><DiceIcon /> Re-roll</Button>
              {count > 0 && <span className="text-[12px] text-muted-foreground">{(alt % count) + 1} of {count}</span>}
            </>
          )}
        </div>
        {errors.length > 0 && <p className="text-sm text-destructive">Didn&apos;t understand: {errors.join(", ")}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-[18px]">
        {!path ? (
          <p className="max-w-[60ch] py-1 text-sm text-text-secondary">
            {chords.length === 0 ? "Type a progression in the index above, or paste a chart." : strat?.fail ?? "No path found for this section."}
          </p>
        ) : (
          <>
            <NeckPlate label={`Fig. ${index + 1} · ${section.name}, ${movementName}`}>
              <FretMap path={path} />
            </NeckPlate>
            <div className="flex flex-wrap gap-3">
              {path.map((c, i) => <ChordCard key={i} cand={c} names={names} notation={notation} />)}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
