"use client";
import { useMemo, useState } from "react";
import { candidates, kBest, randomPath, parseProgression, STRATEGIES, Cand, noteNames, Section } from "@/lib/engine";
import { ChordDiagram, NeckStrip, famCol } from "@/components/diagrams";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";

const K = 8;

export function SectionCard({ section, songKey }: { section: Section; songKey: string }) {
  const [stratId, setStratId] = useState("stay");
  const [alt, setAlt] = useState(0);
  const [roll, setRoll] = useState(0);

  const names = noteNames(songKey);
  const { chords, errors } = useMemo(
    () => parseProgression(section.tokens.join(" "), songKey),
    [section.tokens, songKey]
  );
  const lists = useMemo(() => chords.map((c) => candidates(c)), [chords]);

  const strat = STRATEGIES.find((s) => s.id === stratId);
  const paths = useMemo(
    () => (strat ? kBest(lists, strat, K) : []),
    [lists, strat]
  );
  const wander = useMemo(
    () => (stratId === "wander" ? randomPath(lists) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lists, stratId, roll]
  );

  const path: Cand[] | null = stratId === "wander" ? wander : paths[alt % Math.max(1, paths.length)] ?? null;
  const count = stratId === "wander" ? 0 : paths.length;

  return (
    <section className="border-t border-[var(--line)] py-5">
      <div className="mb-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="text-xl font-semibold">{section.name}</h2>
        <p className="text-sm text-[var(--ink2)]">{chords.map((c) => c.name).join(" · ")}</p>
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <ToggleGroup
          type="single"
          value={stratId}
          onValueChange={(v) => { if (v) { setStratId(v); setAlt(0); } }}
          aria-label={`How to play the ${section.name}`}
        >
          {STRATEGIES.map((s) => (
            <ToggleGroupItem key={s.id} value={s.id} title={s.blurb}>{s.name}</ToggleGroupItem>
          ))}
          <ToggleGroupItem value="wander" title="A random valid path.">Wander</ToggleGroupItem>
        </ToggleGroup>
        <div className="ml-auto flex items-center gap-2">
          {stratId === "wander" ? (
            <Button variant="outline" size="sm" onClick={() => setRoll((r) => r + 1)}>Roll again</Button>
          ) : (
            <>
              <Button variant="outline" size="sm" disabled={count < 2} onClick={() => setAlt((a) => a + 1)}>
                Re-roll
              </Button>
              {count > 0 && <span className="text-[13px] text-[var(--muted)]">{(alt % count) + 1} of {count}</span>}
            </>
          )}
        </div>
      </div>
      {errors.length > 0 && (
        <p className="mb-2 text-sm text-[var(--dim)]">Didn&apos;t understand: {errors.join(", ")}</p>
      )}
      {!path ? (
        <p className="max-w-[60ch] py-1 text-sm text-[var(--ink2)]">
          {strat?.fail ?? "No path found for this section."}
        </p>
      ) : (
        <>
          <NeckStrip path={path} />
          <div className="flex flex-wrap gap-3">
            {path.map((c, i) => (
              <div key={i} className="w-[112px] rounded-xl bg-[var(--panel)] p-2.5 pb-2">
                <ChordDiagram cand={c} names={names} />
                <div className="mt-1 flex items-baseline justify-center gap-1.5">
                  <span className="text-[16px] font-semibold" style={{ color: famCol(c) }}>{c.chord.label}</span>
                  <span className="text-[12px] text-[var(--ink2)]">
                    {c.chord.literal ? "" : c.chord.name} · {c.set}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
