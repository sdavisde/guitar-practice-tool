"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NotationToggle } from "@/components/notation-toggle";
import { SongTitle } from "@/components/song-title";
import type { Notation, SongMeta } from "@/lib/use-song";

type Props = { meta: SongMeta; notation: Notation; onChangeNotation: (notation: Notation) => void };

/** The compact header of the follow-along view: title, a way back to the song, and the notation toggle. */
export function PlayHeader({ meta, notation, onChangeNotation }: Props) {
  return (
    <header className="flex min-h-[60px] flex-wrap items-center justify-between gap-2 border-b border-border py-2">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="text-[17px] font-bold">Triad Paths</span>
        <SongTitle meta={meta} />
      </div>
      <div className="flex items-center gap-2.5">
        <Button variant="ghost" className="h-[34px] px-3.5 text-[13px]" asChild>
          <Link href="/">← Song</Link>
        </Button>
        <NotationToggle value={notation} onChange={onChangeNotation} />
      </div>
    </header>
  );
}
