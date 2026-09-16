"use client";
import { Fragment, useMemo, useState } from "react";
import {
  Section, Cand, RepeatMode, noteNames, planPhrase, solveSection, hasManual, DEFAULT_STRATEGY, DEFAULT_REPEAT, WANDER_ID,
} from "@/lib/engine";
import { FretMap } from "@/components/diagrams";
import { ChordCard } from "@/components/chord-card";
import { NeckPlate } from "@/components/neck-plate";
import { MovementChips, MOVEMENTS } from "@/components/movement-chips";
import { Label } from "@/components/label";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DiceIcon, ScissorsIcon } from "@/components/icons";
import { Notation } from "@/lib/use-song";
import { cn } from "@/lib/utils";

const K = 8;

const fade = "opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100 group-focus-visible:opacity-100";

/** The gutter between two chord cards: hovering it offers to cut the phrase here. */
function Seam({ label, onSplit }: { label: string; onSplit: () => void }) {
  return (
    <button
      type="button"
      onClick={onSplit}
      aria-label={`Split before ${label}`}
      title="Start a new phrase here"
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

const REPEATS: { value: RepeatMode; label: string; blurb: string }[] = [
  { value: "same", label: "Same", blurb: "Play every repeat with the same shapes." },
  { value: "vary", label: "Vary", blurb: "Give each repeat different shapes." },
];

type Props = {
  section: Section;
  songKey: string;
  index: number;
  notation: Notation;
  onSplit: (slotIndex: number) => void;
  onJoin: (phraseIndex: number) => void;
  onRedetect: () => void;
  onStrategy: (id: string) => void;
  onPhraseStrategy: (phraseIndex: number, id: string | undefined) => void;
  onRepeat: (mode: RepeatMode) => void;
};

export function SectionSheet({ section, songKey, index, notation, onSplit, onJoin, onRedetect, onStrategy, onPhraseStrategy, onRepeat }: Props) {
  const [alt, setAlt] = useState(0);
  const [roll, setRoll] = useState(0);

  const names = noteNames(songKey);
  const plans = useMemo(() => section.phrases.map((p) => planPhrase(p, songKey)), [section.phrases, songKey]);
  const results = useMemo(
    () => solveSection(section, plans, { alt, K }),
    // `roll` re-rolls the wandering phrases.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [section, plans, alt, roll]
  );

  const errors = plans.flatMap((p) => p.errors);
  const chordCount = plans.reduce((n, p) => n + p.units.length, 0);
  const label = (c: Cand) => (notation === "numbers" ? c.chord.degree : c.chord.name);
  const unitLabel = (u: { chord: Cand["chord"]; role: string }) => {
    const t = notation === "numbers" ? u.chord.degree : u.chord.name;
    return u.role === "passing" ? `(${t})` : t;
  };

  // Occurrence numbering for the "2 of 3" chips.
  const patternSize = new Map<string, number>();
  for (const p of section.phrases) if (p.patternId) patternSize.set(p.patternId, (patternSize.get(p.patternId) ?? 0) + 1);
  const hasPattern = [...patternSize.values()].some((n) => n > 1);
  const seen = new Map<string, number>();
  const occurrence = section.phrases.map((p) => {
    if (!p.patternId) return 0;
    const n = (seen.get(p.patternId) ?? 0) + 1;
    seen.set(p.patternId, n);
    return n;
  });

  // Slot offset of each phrase within the section, so a seam can name a section-wide slot.
  const offsets: number[] = [];
  section.phrases.reduce((off, p) => { offsets.push(off); return off + p.slots.length; }, 0);

  const sectionStrategy = section.strategyId ?? DEFAULT_STRATEGY;
  const multi = section.phrases.length > 1;
  const anyWander = results.some((r) => r.strategyId === WANDER_ID);
  const maxCount = Math.max(0, ...results.map((r) => r.count));
  const movementName = (id: string) => (MOVEMENTS.find((m) => m.id === id)?.name ?? id).toLowerCase();

  return (
    <section id={`section-${index}`} className="grid grid-cols-1 gap-6 border-t border-border pt-8 pb-10 scroll-mt-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 [&>*]:min-w-0">
      <div className="flex flex-col gap-3">
        <h2 className="text-[28px] font-bold leading-tight tracking-[-0.02em]">{section.name}</h2>
        <p className="font-mono text-[13px] text-text-secondary">
          {plans.map((p) => p.units.map(unitLabel).join(" · ")).join("  |  ")}
        </p>
        <div className="mt-2 flex flex-col gap-2">
          <Label>Movement</Label>
          <MovementChips value={sectionStrategy} label={`How to play the ${section.name}`} onChange={(id) => { onStrategy(id); setAlt(0); }} />
        </div>
        {hasPattern && (
          <div className="mt-1 flex flex-col gap-2">
            <Label>Repeats</Label>
            <ToggleGroup
              type="single"
              value={section.repeat ?? DEFAULT_REPEAT}
              onValueChange={(v) => { if (v) { onRepeat(v as RepeatMode); setAlt(0); } }}
              aria-label={`How the ${section.name} repeats are played`}
              className="gap-1"
            >
              {REPEATS.map((r) => (
                <ToggleGroupItem
                  key={r.value}
                  value={r.value}
                  title={r.blurb}
                  className="h-[26px] rounded-[6px] border border-border px-2.5 text-[12px] font-normal text-text-secondary hover:bg-card hover:text-foreground data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:font-semibold data-[state=on]:text-background"
                >
                  {r.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        )}
        <div className="mt-1.5 flex items-center gap-2.5">
          <Button
            variant="outline"
            className="h-[34px] px-3.5 text-[13px]"
            disabled={!anyWander && maxCount < 2}
            onClick={() => { setAlt((a) => a + 1); setRoll((r) => r + 1); }}
          >
            <DiceIcon /> {anyWander ? "Roll again" : "Re-roll"}
          </Button>
          {!anyWander && maxCount > 0 && <span className="text-[12px] text-muted-foreground">{(alt % maxCount) + 1} of {maxCount}</span>}
        </div>
        {hasManual(section) && (
          <Button
            variant="ghost"
            size="sm"
            className="-mx-2 w-fit font-normal text-muted-foreground hover:text-foreground"
            onClick={onRedetect}
            title="Drop your cuts and let the phrases be detected again"
          >
            Re-detect phrases
          </Button>
        )}
        {errors.length > 0 && <p className="text-sm text-destructive">Didn&apos;t understand: {errors.join(", ")}</p>}
      </div>

      <div className="flex min-w-0 flex-col gap-7">
        {chordCount === 0 && (
          <p className="max-w-[60ch] py-1 text-sm text-text-secondary">Type a progression in the index above, or paste a chart.</p>
        )}
        {section.phrases.map((phrase, p) => {
          const { units } = plans[p];
          const { path, fail, strategyId } = results[p];
          const total = phrase.patternId ? patternSize.get(phrase.patternId) ?? 0 : 0;
          const seams = (path?.length ?? 0) > 1;
          const fig = multi ? `Fig. ${index + 1}.${p + 1}` : `Fig. ${index + 1}`;
          if (!units.length) return null;
          return (
            <div key={p} className="flex min-w-0 flex-col gap-3">
              {multi && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <Label>Phrase {p + 1}</Label>
                  {total > 1 && (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[11px] text-accent" title={`Repeat of ${phrase.patternId}`}>
                      {occurrence[p]} of {total}
                    </span>
                  )}
                  <span className="font-mono text-[13px] text-text-secondary">{units.map(unitLabel).join(" · ")}</span>
                  <span className="ml-auto flex items-center gap-2">
                    <select
                      value={phrase.strategyId ?? ""}
                      onChange={(e) => { onPhraseStrategy(p, e.target.value || undefined); setAlt(0); }}
                      aria-label={`Movement for phrase ${p + 1}`}
                      title="Play this phrase differently from the rest of the section"
                      className="h-7 rounded-md border border-border bg-card px-2 text-[12px] text-text-secondary outline-none focus-visible:border-ring"
                    >
                      <option value="">Section movement</option>
                      {MOVEMENTS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    {p > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 font-normal text-muted-foreground hover:text-foreground"
                        onClick={() => onJoin(p)}
                        aria-label={`Join phrase ${p + 1} with phrase ${p}`}
                      >
                        Join with previous
                      </Button>
                    )}
                  </span>
                </div>
              )}
              {!path ? (
                <p className="max-w-[60ch] py-1 text-sm text-text-secondary">{fail ?? "No path found for this phrase."}</p>
              ) : (
                <>
                  <NeckPlate label={`${fig} · ${section.name}, ${movementName(strategyId)}`}>
                    <FretMap path={path} />
                  </NeckPlate>
                  <div className={cn("flex flex-wrap items-stretch", seams ? "gap-y-3" : "gap-3")}>
                    {path.map((c, i) => (
                      <Fragment key={i}>
                        {seams && i > 0 && <Seam label={label(c)} onSplit={() => onSplit(offsets[p] + units[i].slot)} />}
                        <ChordCard cand={c} names={names} notation={notation} role={units[i].role} />
                      </Fragment>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
