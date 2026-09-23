"use client";
import { Fragment, useState } from "react";
import { Cand, PhraseUnit, candKey, isUserPin } from "@/lib/engine";
import type { VoicingContext } from "@/lib/use-section-paths";
import { ChordCard, ChordCardButton } from "@/components/chord-card";
import { VoicingPicker } from "@/components/voicing-picker";
import { VoicingPickerFrame } from "@/components/voicing-picker-frame";
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

/** Lets the row's cards open the voicing picker. Without it the cards are plain. */
export type Picking = {
  /** Picker facts for chord `i`; asked for only while that chord's picker is open. */
  context: (i: number) => VoicingContext;
  /** The phrase's movement, as its chip names it. */
  movement: string;
  /** Pin chord `i` to a voicing (a `candKey`), or let the path decide with none. */
  onPin: (i: number, key: string | undefined) => void;
};

/** Only a hand-picked voicing wears the dot: a held one is meant to look like the path's own choice. */
const isPinned = (u: PhraseUnit, c: Cand) => isUserPin(u) && candKey(c) === u.pin;

type Props = {
  path: Cand[];
  units: PhraseUnit[];
  names: string[];
  notation: Notation;
  /** Cut the phrase before chord `i` of the path. */
  onSplit: (i: number) => void;
  picking?: Picking;
};

/** A phrase's shapes in a row, with a seam between each pair of cards to cut the phrase there. */
export function ChordRow({ path, units, names, notation, onSplit, picking }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  const seams = path.length > 1;
  const label = (c: Cand) => (notation === "numbers" ? c.chord.degree : c.chord.name);
  return (
    <div className={cn("flex flex-wrap items-stretch", seams ? "gap-y-3" : "gap-3")}>
      {path.map((c, i) => (
        <Fragment key={i}>
          {seams && i > 0 && <Seam label={label(c)} onSplit={() => onSplit(i)} />}
          {!picking ? (
            <ChordCard cand={c} names={names} notation={notation} role={units[i].role} />
          ) : (
            <VoicingPickerFrame
              open={open === i}
              onOpenChange={(next) => setOpen(next ? i : null)}
              title={`Voicing for ${c.chord.degree}, ${c.chord.name}`}
              trigger={<ChordCardButton cand={c} names={names} notation={notation} role={units[i].role} pinned={isPinned(units[i], c)} />}
            >
              {(layout) => (
                <VoicingPicker
                  unit={units[i]} current={c} context={picking.context(i)} names={names} notation={notation}
                  movement={picking.movement} after={path.length - 1 - i} layout={layout}
                  onPin={(key) => picking.onPin(i, key)} onClose={() => setOpen(null)}
                />
              )}
            </VoicingPickerFrame>
          )}
        </Fragment>
      ))}
    </div>
  );
}
