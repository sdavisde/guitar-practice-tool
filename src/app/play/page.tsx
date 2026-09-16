"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSong } from "@/lib/use-song";
import { Position, clampPosition, playablePositions, stepPhrase, stepSection } from "@/lib/play-navigation";
import { PlayHeader } from "@/components/play-header";
import { PlaySheet } from "@/components/play-sheet";
import { NowPlaying } from "@/components/now-playing";

/** Which alternative a section shows and how often it has been re-rolled; kept per section so moving between phrases doesn't reset it. */
type Roll = { alt: number; roll: number };
const NO_ROLL: Roll = { alt: 0, roll: 0 };

/** True for keys typed into a field or while a dialog is open: those aren't for us. */
function typing(e: KeyboardEvent): boolean {
  const t = e.target;
  if (t instanceof HTMLElement && (t.isContentEditable || t.closest("input, select, textarea"))) return true;
  return !!document.querySelector('[role="dialog"]');
}

export default function Play() {
  const song = useSong();
  const [selection, setSelection] = useState<Position>({ section: 0, phrase: 0 });
  const [rolls, setRolls] = useState<Map<number, Roll>>(() => new Map());

  const { sections } = song;
  const current = clampPosition(sections, selection);

  const patchRoll = useCallback((index: number, fn: (r: Roll) => Roll) => {
    setRolls((prev) => new Map(prev).set(index, fn(prev.get(index) ?? NO_ROLL)));
  }, []);

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (typing(e)) return;
      let next: Position | undefined;
      if (e.key === "ArrowDown") next = stepPhrase(sections, current, 1);
      else if (e.key === "ArrowUp") next = stepPhrase(sections, current, -1);
      else if (e.key === "ArrowRight") next = stepSection(sections, current, 1);
      else if (e.key === "ArrowLeft") next = stepSection(sections, current, -1);
      if (!next) return;
      e.preventDefault();
      setSelection(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sections, current]);

  return (
    <div className="mx-auto max-w-[1248px] px-6 pb-14">
      {song.ready && (
        <>
          <PlayHeader meta={song.meta} notation={song.notation} onChangeNotation={song.setNotation} />
          {!current || !playablePositions(sections).length ? (
            <p className="pt-8 text-sm text-text-secondary">
              Import a song or type a progression first. <Link href="/" className="underline underline-offset-4 hover:text-foreground">Back to the song</Link>
            </p>
          ) : (
            <main className="grid grid-cols-1 gap-6 pt-8 lg:grid-cols-[minmax(0,1fr)_540px] lg:gap-10 lg:items-start">
              <div className="min-w-0">
                <PlaySheet sections={sections} songKey={song.songKey} notation={song.notation} selected={current} onSelect={setSelection} />
                <p className="pt-4 text-[12px] text-muted-foreground">Click a line to play it. ↑ ↓ move between phrases, ← → between sections.</p>
              </div>
              <NowPlaying
                section={sections[current.section]}
                index={current.section}
                phraseIndex={current.phrase}
                songKey={song.songKey}
                notation={song.notation}
                alt={(rolls.get(current.section) ?? NO_ROLL).alt}
                roll={(rolls.get(current.section) ?? NO_ROLL).roll}
                onReroll={() => patchRoll(current.section, (r) => ({ alt: r.alt + 1, roll: r.roll + 1 }))}
                onStrategy={(id) => { song.setSectionStrategy(current.section, id); patchRoll(current.section, (r) => ({ ...r, alt: 0 })); }}
                onPhraseStrategy={(p, id) => { song.setPhraseStrategy(current.section, p, id); patchRoll(current.section, (r) => ({ ...r, alt: 0 })); }}
                onRepeat={(mode) => { song.setRepeat(current.section, mode); patchRoll(current.section, (r) => ({ ...r, alt: 0 })); }}
                onJoin={(p) => song.joinPhrase(current.section, p)}
                onSplit={(slotIndex) => song.splitPhrase(current.section, slotIndex)}
              />
            </main>
          )}
        </>
      )}
    </div>
  );
}
