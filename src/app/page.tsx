"use client";
import { useMemo, useState } from "react";
import { KEYS, Section, chartToSections, joinSectionAt, sectionBase, splitSectionAt } from "@/lib/engine";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Home() {
  const [songKey, setSongKey] = useState("G");
  const [text, setText] = useState("1 5 6m 4");
  const [imported, setImported] = useState<Section[] | null>(null);
  const [chart, setChart] = useState("");
  const [open, setOpen] = useState(false);
  const [importError, setImportError] = useState("");
  // Sections the user has hand-split; null means "follow the text/import as-is".
  const [override, setOverride] = useState<Section[] | null>(null);

  const derived: Section[] = useMemo(() => {
    if (imported?.length) return imported;
    const tokens = text.replace(/[|,]/g, " ").split(/\s+/).filter(Boolean);
    return tokens.length ? [{ name: "Song", tokens }] : [];
  }, [imported, text]);

  const sections = override ?? derived;

  function doImport() {
    const { sections: secs, key } = chartToSections(chart, songKey);
    if (!secs.length) { setImportError("No chords found in that chart."); return; }
    setImportError("");
    setOverride(null);
    setImported(secs);
    setSongKey(key);
    setOpen(false);
  }

  // `tokenIndex` is an index into the section's tokens, not into its chord cards —
  // SectionCard maps card -> token so unparsed tokens don't shift the seam.
  function splitSection(sectionIndex: number, tokenIndex: number) {
    setOverride((prev) => splitSectionAt(prev ?? derived, sectionIndex, tokenIndex));
  }

  function joinSection(sectionIndex: number) {
    setOverride((prev) => joinSectionAt(prev ?? derived, sectionIndex));
  }

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-16 md:px-12">
      <header className="pb-5 pt-10">
        <h1 className="text-[34px] font-semibold tracking-tight">Triad paths</h1>
        <p className="mt-1 max-w-[62ch] text-[var(--ink2)]">
          Type a progression or paste a whole chart. Every section gets its own set of
          three-note paths up the neck — pick how each one should move. Ringed dot is the root.
        </p>
      </header>

      <div className="mb-4 flex flex-col gap-4">
        <div>
          <span className="mb-1.5 block text-[13px] text-[var(--ink2)]">Key</span>
          <ToggleGroup type="single" value={songKey} onValueChange={(v) => v && setSongKey(v)} aria-label="Key">
            {KEYS.map((k) => <ToggleGroupItem key={k} value={k}>{k}</ToggleGroupItem>)}
          </ToggleGroup>
        </div>
        <div>
          <span className="mb-1.5 block text-[13px] text-[var(--ink2)]">Progression</span>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="max-w-[360px]"
              value={text}
              spellCheck={false}
              autoComplete="off"
              aria-label="Chord progression"
              onChange={(e) => { setText(e.target.value); setImported(null); setOverride(null); }}
            />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button variant="outline">Paste a chart</Button></DialogTrigger>
              <DialogContent>
                <DialogTitle>Paste a chord chart</DialogTitle>
                <DialogDescription>
                  Number charts (Nashville, dots or spaces between chords), chords above lyrics,
                  or ChordPro [G]inline all work. Sections like Verse.1 or [Chorus] are kept separate.
                  Letter charts get their key detected; number charts use the key you picked.
                </DialogDescription>
                <Textarea rows={12} value={chart} onChange={(e) => setChart(e.target.value)} aria-label="Chord chart text" />
                {importError && <p className="mt-2 text-sm text-[var(--dim)]">{importError}</p>}
                <div className="mt-3 flex justify-end gap-2">
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button onClick={doImport}>Import</Button>
                </div>
              </DialogContent>
            </Dialog>
            {imported && (
              <Button variant="ghost" size="sm" onClick={() => { setImported(null); setOverride(null); }}>Clear song</Button>
            )}
          </div>
          <p className="mt-1.5 text-[13px] text-[var(--muted)]">
            Suffixes: m, M, °, sus2, sus4, 7, maj7, m7 — 7ths are three-note shells (5th omitted).
            The engine picks string sets for you and mixes them when it helps.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-[13px] text-[var(--ink2)]">
          {[["--maj", "major"], ["--min", "minor"], ["--sus", "sus"], ["--dim", "diminished"]].map(([v, l]) => (
            <span key={l} className="inline-flex items-center gap-1.5">
              <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: `var(${v})` }} />{l}
            </span>
          ))}
        </div>
      </div>

      <main>
        {sections.map((s, i) => (
          <SectionCard
            key={`${s.name}-${i}-${s.tokens.join(" ")}-${songKey}`}
            section={s}
            songKey={songKey}
            onSplit={(tokenIndex) => splitSection(i, tokenIndex)}
            onJoin={i > 0 && sectionBase(sections[i - 1].name) === sectionBase(s.name) ? () => joinSection(i) : undefined}
          />
        ))}
        {!sections.length && (
          <p className="border-t border-[var(--line)] py-5 text-sm text-[var(--ink2)]">
            Enter a progression like 1 5 6m 4, or paste a chart.
          </p>
        )}
      </main>
    </div>
  );
}
