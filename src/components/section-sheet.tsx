"use client";
import { Fragment, useMemo, useState } from "react";
import { candidates, kBest, randomPath, parseProgression, STRATEGIES, Cand, noteNames, Section } from "@/lib/engine";
import { FretMap } from "@/components/diagrams";
import { ChordCard } from "@/components/chord-card";
import { NeckPlate } from "@/components/neck-plate";
import { MovementChips, WANDER_ID } from "@/components/movement-chips";
import { Label } from "@/components/label";
import { Button } from "@/components/ui/button";
import { DiceIcon, ScissorsIcon } from "@/components/icons";
import { Notation } from "@/lib/use-song";
import { cn } from "@/lib/utils";

const K = 8;

const fade = "opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100 group-focus-visible:opacity-100";

/** The gutter between two chord cards: hovering it offers to cut the section here. */
function Seam({ label, onSplit }: { label: string; onSplit: () => void }) {
  return (
    <button
      type="button"
      onClick={onSplit}
      aria-label={`Split before ${label}`}
      title="Split the progression here"
      className="group relative -mx-0.5 w-4 shrink-0 cursor-pointer self-stretch rounded-md outline-none"
    >
      <span className={cn("pointer-events-none absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 rounded-full bg-muted-foreground", fade)} />
      <span
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 flex h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2",
          "items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm",
          fade
        )}
      >
        <ScissorsIcon />
      </span>
    </button>
  );
}

type Props = {
  section: Section;
  songKey: string;
  index: number;
  notation: Notation;
  onSplit?: (tokenIndex: number) => void;
  onJoin?: () => void;
};

export function SectionSheet({ section, songKey, index, notation, onSplit, onJoin }: Props) {
  const [stratId, setStratId] = useState("stay");
  const [alt, setAlt] = useState(0);
  const [roll, setRoll] = useState(0);

  const names = noteNames(songKey);
  const { chords, errors } = useMemo(
    () => parseProgression(section.tokens.join(" "), songKey),
    [section.tokens, songKey]
  );
  // Card i came from token tokenOf[i] — the parser drops tokens it can't read, so card
  // index and token index drift apart without this map.
  const tokenOf = useMemo(() => {
    const out: number[] = [];
    section.tokens.forEach((t, i) => {
      for (let n = parseProgression(t, songKey).chords.length; n > 0; n--) out.push(i);
    });
    return out;
  }, [section.tokens, songKey]);
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
  // A seam only makes sense where there is something on both sides of it.
  const seams = !!onSplit && (path?.length ?? 0) > 1;

  return (
    <section id={`section-${index}`} className="grid grid-cols-1 gap-6 border-t border-border pt-8 pb-10 scroll-mt-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 [&>*]:min-w-0">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-[28px] font-bold leading-tight tracking-[-0.02em]">{section.name}</h2>
          {onJoin && (
            <Button
              variant="ghost"
              size="sm"
              className="-mx-2 font-normal text-muted-foreground hover:text-foreground"
              onClick={onJoin}
              aria-label={`Join ${section.name} back into the section before it`}
            >
              Join with previous
            </Button>
          )}
        </div>
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
            <div className={cn("flex flex-wrap items-stretch", seams ? "gap-y-3" : "gap-3")}>
              {path.map((c, i) => (
                <Fragment key={i}>
                  {seams && i > 0 && (
                    // Only a real token boundary can be cut; two cards from one token get a plain gap.
                    tokenOf[i] > tokenOf[i - 1]
                      ? <Seam label={notation === "numbers" ? c.chord.degree : c.chord.name} onSplit={() => onSplit?.(tokenOf[i])} />
                      : <span className="w-3 shrink-0" />
                  )}
                  <ChordCard cand={c} names={names} notation={notation} />
                </Fragment>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
