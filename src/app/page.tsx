"use client";
import { useSong } from "@/lib/use-song";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { KeyPicker } from "@/components/key-picker";
import { SongIndex } from "@/components/song-index";
import { SectionSheet } from "@/components/section-sheet";

export default function Home() {
  const song = useSong();

  return (
    <div className="mx-auto max-w-[1248px] px-6 pb-14">
      <SiteHeader onImport={song.importChart} onClear={song.imported ? song.clearSong : undefined} />

      <div className="grid grid-cols-1 gap-6 pt-8 pb-7 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 [&>*]:min-w-0">
        <KeyPicker value={song.songKey} onChange={song.setSongKey} />
        <SongIndex sections={song.sections} songKey={song.songKey} notation={song.notation}
          onChangeNotation={song.setNotation} onChangeTokens={song.updateSection} />
      </div>

      <main>
        {song.sections.map((s, i) => (
          <SectionSheet key={`${s.name}-${i}-${s.tokens.join(" ")}-${song.songKey}`} section={s} songKey={song.songKey} index={i} notation={song.notation} />
        ))}
      </main>

      <SiteFooter />
    </div>
  );
}
