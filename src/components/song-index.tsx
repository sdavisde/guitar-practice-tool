"use client";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Section, parseProgression, QUAL, sectionTokens } from "@/lib/engine";
import type { Notation } from "@/lib/use-song";
import { FAM_COLOR } from "@/components/diagrams";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Props = {
  sections: Section[];
  songKey: string;
  notation: Notation;
  onChangeNotation: (notation: Notation) => void;
  onChangeTokens: (index: number, progression: string) => void;
};

const NOTATIONS: { value: Notation; label: string }[] = [
  { value: "numbers", label: "Numbers" },
  { value: "names", label: "Names" },
];

/** The chart at a glance: one row per section, with the progression editable in place. */
export function SongIndex({ sections, songKey, notation, onChangeNotation, onChangeTokens }: Props) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-end gap-2.5 pb-2">
        <Label>Show as</Label>
        <ToggleGroup
          type="single"
          value={notation}
          onValueChange={(v) => v && onChangeNotation(v as Notation)}
          aria-label="Chord notation"
          className="gap-1"
        >
          {NOTATIONS.map((n) => (
            <ToggleGroupItem
              key={n.value}
              value={n.value}
              className="h-[26px] rounded-[6px] border border-border px-2.5 text-[12px] font-normal text-text-secondary hover:bg-card hover:text-foreground data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:font-semibold data-[state=on]:text-background"
            >
              {n.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex flex-col border-t border-foreground">
        {sections.map((section, i) => (
          <SongIndexRow key={`${section.name}-${i}`} index={i} section={section} songKey={songKey} notation={notation}
            onCommit={(text) => onChangeTokens(i, text)} />
        ))}
      </div>
    </div>
  );
}

function SongIndexRow({ index, section, songKey, notation, onCommit }: { index: number; section: Section; songKey: string; notation: Notation; onCommit: (text: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const tokens = useMemo(() => sectionTokens(section), [section]);
  const text = tokens.join(" ");
  // Chords per phrase, so the row can show where the phrases break.
  const phrases = useMemo(
    () => section.phrases.map((p) => parseProgression(p.slots.map((s) => s.token).join(" "), songKey).chords),
    [section.phrases, songKey]
  );
  const chords = phrases.flat();

  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  function start() { setDraft(text); setEditing(true); }
  function commit() { setEditing(false); if (draft.trim() !== text) onCommit(draft); }

  // Whichever notation isn't in the big labels shows in the small line, so both are always readable.
  const numbers = notation === "numbers";

  return (
    <div className="grid min-h-[52px] grid-cols-[48px_minmax(0,1fr)] items-center gap-x-4 gap-y-1 border-b border-border py-2 lg:grid-cols-[48px_140px_minmax(0,1fr)_200px] lg:py-0">
      <span className="font-mono text-[12px] text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
      <a href={`#section-${index}`} title="Jump to this section" className="w-fit text-[20px] font-bold underline-offset-4 hover:underline">{section.name}</a>
      {editing ? (
        <Input
          ref={inputRef}
          value={draft}
          spellCheck={false}
          autoComplete="off"
          aria-label={`${section.name} progression`}
          className="col-start-2 h-9 max-w-[420px] font-mono text-[16px] tracking-wider lg:col-start-3"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
        />
      ) : (
        <button
          type="button"
          onClick={start}
          title="Click to edit this progression"
          className="col-start-2 flex w-fit cursor-text flex-wrap items-baseline gap-x-[18px] rounded-md py-1 text-left text-[22px] font-bold leading-none hover:bg-card lg:col-start-3"
        >
          {chords.length ? phrases.map((ph, k) => (
            <Fragment key={k}>
              {k > 0 && ph.length > 0 && <span className="text-[16px] font-normal text-muted-foreground" aria-hidden="true">/</span>}
              {ph.map((c, i) => (
                <span key={i} style={{ color: FAM_COLOR[QUAL[c.q].fam] }}>{numbers ? c.degree : c.name}</span>
              ))}
            </Fragment>
          )) : tokens.length ? tokens.map((t, i) => (
            <span key={i} className="text-muted-foreground">{t}</span>
          )) : (
            <span className="text-[15px] font-normal text-muted-foreground">Type a progression like 1 5 6m 4</span>
          )}
        </button>
      )}
      <span className="col-start-2 font-mono text-[12px] text-muted-foreground lg:col-start-4 lg:text-right">
        {chords.map((c) => (numbers ? c.name : c.degree)).join(" · ")}
      </span>
    </div>
  );
}
