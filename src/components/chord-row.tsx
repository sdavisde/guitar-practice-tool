"use client";
import { Fragment } from "react";
import { Cand, PhraseUnit } from "@/lib/engine";
import { ChordCard } from "@/components/chord-card";
import { ScissorsIcon } from "@/components/icons";
import { Notation } from "@/lib/use-song";
import { cn } from "@/lib/utils";

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

type Props = {
  path: Cand[];
  units: PhraseUnit[];
  names: string[];
  notation: Notation;
  /** Cut the phrase before chord `i` of the path. */
  onSplit: (i: number) => void;
};

/** A phrase's shapes in a row, with a seam between each pair of cards to cut the phrase there. */
export function ChordRow({ path, units, names, notation, onSplit }: Props) {
  const seams = path.length > 1;
  const label = (c: Cand) => (notation === "numbers" ? c.chord.degree : c.chord.name);
  return (
    <div className={cn("flex flex-wrap items-stretch", seams ? "gap-y-3" : "gap-3")}>
      {path.map((c, i) => (
        <Fragment key={i}>
          {seams && i > 0 && <Seam label={label(c)} onSplit={() => onSplit(i)} />}
          <ChordCard cand={c} names={names} notation={notation} role={units[i].role} />
        </Fragment>
      ))}
    </div>
  );
}
