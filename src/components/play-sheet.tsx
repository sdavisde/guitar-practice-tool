"use client";
import { useEffect, useMemo } from "react";
import { Section, Chord, LyricLine, QUAL, parseProgression, phraseLyrics, planPhrase, sectionTokens } from "@/lib/engine";
import { unitLabel } from "@/lib/use-section-paths";
import type { Position } from "@/lib/play-navigation";
import { FAM_COLOR } from "@/components/diagrams";
import type { Notation } from "@/lib/use-song";
import { cn } from "@/lib/utils";

export const phraseElementId = (pos: Position) => `phrase-${pos.section}-${pos.phrase}`;

type Props = {
  sections: Section[];
  songKey: string;
  notation: Notation;
  selected: Position | null;
  onSelect: (pos: Position) => void;
};

/** The whole song as chords over words, one block per section; click a phrase to play it. */
export function PlaySheet({ sections, songKey, notation, selected, onSelect }: Props) {
  // Keep the selected phrase on screen when the keyboard moves it.
  useEffect(() => {
    if (selected) document.getElementById(phraseElementId(selected))?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  return (
    <div className="flex flex-col">
      {sections.map((section, s) => (
        <SheetSection
          key={`${s}-${section.name}`}
          section={section}
          index={s}
          songKey={songKey}
          notation={notation}
          selectedPhrase={selected?.section === s ? selected.phrase : -1}
          onSelect={(phrase) => onSelect({ section: s, phrase })}
        />
      ))}
    </div>
  );
}

type SectionProps = {
  section: Section;
  index: number;
  songKey: string;
  notation: Notation;
  selectedPhrase: number;
  onSelect: (phrase: number) => void;
};

function SheetSection({ section, index, songKey, notation, selectedPhrase, onSelect }: SectionProps) {
  const tokens = useMemo(() => sectionTokens(section), [section]);
  // One chord per slot (undefined where the token isn't a chord), spelled in the section's context.
  const chords = useMemo(() => {
    const { chords: parsed } = parseProgression(tokens.join(" "), songKey);
    let ci = 0;
    return tokens.map((t) => (parseProgression(t, songKey).chords.length ? parsed[ci++] : undefined));
  }, [tokens, songKey]);
  const run = useMemo(
    () => section.phrases.map((p) => planPhrase(p, songKey).units.map((u) => unitLabel(u, notation)).join(" · ")).join("  |  "),
    [section.phrases, songKey, notation]
  );
  const lines = useMemo(() => phraseLyrics(section), [section]);

  return (
    <section className="border-t border-border py-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-[20px] font-bold leading-tight">{section.name}</h2>
        <span className="font-mono text-[13px] text-text-secondary">{run}</span>
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        {section.phrases.map((phrase, p) => phrase.slots.length > 0 && (
          <SheetPhrase
            key={p}
            id={phraseElementId({ section: index, phrase: p })}
            lines={lines[p]}
            tokens={tokens}
            chords={chords}
            notation={notation}
            selected={p === selectedPhrase}
            onSelect={() => onSelect(p)}
          />
        ))}
      </div>
    </section>
  );
}

type PhraseProps = {
  id: string;
  lines: LyricLine[];
  tokens: string[];
  chords: (Chord | undefined)[];
  notation: Notation;
  selected: boolean;
  onSelect: () => void;
};

function SheetPhrase({ id, lines, tokens, chords, notation, selected, onSelect }: PhraseProps) {
  return (
    <button
      type="button"
      id={id}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "-mx-2.5 flex w-[calc(100%+20px)] scroll-mt-4 flex-col items-start gap-1 rounded-lg px-2.5 py-1.5 text-left outline-none",
        "transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
        selected ? "bg-accent-soft" : "hover:bg-card"
      )}
    >
      {lines.map((line, li) => {
        const sung = line.segments.some((seg) => seg.text.length > 0);
        return (
          <span key={li} className="flex flex-wrap">
            {line.segments.map((seg, i) => (
              <span key={i} className="inline-flex flex-col items-start">
                <ChordLabel chord={seg.slot === undefined ? undefined : chords[seg.slot]} token={seg.slot === undefined ? undefined : tokens[seg.slot]} notation={notation} />
                {sung && <span className="whitespace-pre text-[16px]">{seg.text}</span>}
              </span>
            ))}
          </span>
        );
      })}
    </button>
  );
}

/** The chord over a segment: big label in the family colour, small label beside it; blank over a wordless segment. */
function ChordLabel({ chord, token, notation }: { chord: Chord | undefined; token: string | undefined; notation: Notation }) {
  if (token === undefined) return <span className="h-[18px]" />;
  if (!chord) return <span className="h-[18px] pr-1.5 font-mono text-[13px] font-semibold leading-[18px] text-muted-foreground">{token}</span>;
  const numbers = notation === "numbers";
  return (
    <span className="h-[18px] pr-1.5 font-mono text-[13px] font-semibold leading-[18px]" style={{ color: FAM_COLOR[QUAL[chord.q].fam] }}>
      {numbers ? chord.degree : chord.name}
      <span className="ml-1 font-normal text-muted-foreground">{numbers ? chord.name : chord.degree}</span>
    </span>
  );
}
