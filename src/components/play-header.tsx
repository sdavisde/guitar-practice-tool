"use client";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotationToggle } from "@/components/notation-toggle";
import { SongTitle } from "@/components/song-title";
import type { Notation, SongMeta } from "@/lib/use-song";

type Props = { meta: SongMeta; notation: Notation; onChangeNotation: (notation: Notation) => void };

/** The compact header of the follow-along view: title, a way back to the song, and the notation toggle. */
export function PlayHeader({ meta, notation, onChangeNotation }: Props) {
  return (
    <header className="flex min-h-[60px] flex-wrap items-center justify-between gap-2 border-b border-border py-2">
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="text-[17px] font-bold">Triad Paths</span>
        <SongTitle meta={meta} />
      </div>
      <div className="flex min-w-0 shrink-0 items-center gap-2.5">
        {/* md and up: the text link. Below md: the same link as a square icon button. */}
        <div className="hidden md:flex">
          <Button variant="ghost" className="h-[34px] px-3.5 text-[13px]" asChild>
            <Link href="/">← Song</Link>
          </Button>
        </div>
        <div className="md:hidden">
          <Button variant="ghost" size="icon" aria-label="Back to song" className="size-[34px] shrink-0" asChild>
            <Link href="/"><ArrowLeftIcon /></Link>
          </Button>
        </div>
        <NotationToggle value={notation} onChange={onChangeNotation} />
      </div>
    </header>
  );
}
