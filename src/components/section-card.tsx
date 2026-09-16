"use client";
import { Fragment, useMemo, useState } from "react";
import { candidates, kBest, randomPath, parseProgression, STRATEGIES, Cand, noteNames, Section } from "@/lib/engine";
import { ChordDiagram, FretMap, famCol } from "@/components/diagrams";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const K = 8;

function ScissorsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12" />
    </svg>
  );
}

const fade = "opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100 group-focus-visible:opacity-100";

function Seam({ label, onSplit }: { label: string; onSplit: () => void }) {
  return (
    <button
      type="button"
      onClick={onSplit}
      aria-label={`Split before ${label}`}
      title="Split the progression here"
      className="group relative -mx-0.5 w-4 shrink-0 cursor-pointer self-stretch rounded-md outline-none"
    >
      <span className={cn("pointer-events-none absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 rounded-full bg-[var(--ink2)]", fade)} />
      <span
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 flex h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2",
          "items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel)]",
          "text-[var(--ink2)] shadow-[0_1px_4px_rgba(27,36,48,0.22)]",
          fade
        )}
      >
        <ScissorsIcon />
      </span>
    </button>
  );
}

export function SectionCard({ section, songKey, onSplit, onJoin }: {
  section: Section;
  songKey: string;
  onSplit?: (tokenIndex: number) => void;
  onJoin?: () => void;
}) {
  const [stratId, setStratId] = useState("stay");
  const [alt, setAlt] = useState(0);
  const [roll, setRoll] = useState(0);

  const names = noteNames(songKey);
  const { chords, errors } = useMemo(
    () => parseProgression(section.tokens.join(" "), songKey),
    [section.tokens, songKey]
  );
  // Card i came from token tokenOf[i] — tokens the parser rejected are dropped, so
  // card index and token index drift apart without this map.
  const tokenOf = useMemo(() => {
    const out: number[] = [];
    section.tokens.forEach((t, i) => {
      for (let n = parseProgression(t, songKey).chords.length; n > 0; n--) out.push(i);
    });
    return out;
  }, [section.tokens, songKey]);
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
  // A seam only makes sense where the two cards really come from different tokens.
  const seams = !!onSplit && (path?.length ?? 0) > 1;

  return (
    <section className="border-t border-[var(--line)] py-5">
      <div className="mb-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="text-xl font-semibold">{section.name}</h2>
        {onJoin && (
          <Button
            variant="ghost"
            size="sm"
            className="-my-1 px-2 text-[13px] text-[var(--muted)] hover:text-[var(--ink)]"
            onClick={onJoin}
            aria-label={`Join ${section.name} back into the section before it`}
          >
            Join with previous
          </Button>
        )}
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
          <FretMap path={path} />
          <div className={cn("flex flex-wrap items-stretch", seams ? "gap-y-3" : "gap-3")}>
            {path.map((c, i) => (
              <Fragment key={i}>
                {seams && onSplit && i > 0 && (
                  tokenOf[i] > tokenOf[i - 1]
                    ? <Seam label={c.chord.label} onSplit={() => onSplit(tokenOf[i])} />
                    : <span className="w-3 shrink-0" />
                )}
                <div className="w-[112px] rounded-xl bg-[var(--panel)] p-2.5 pb-2">
                  <ChordDiagram cand={c} names={names} />
                  <div className="mt-1 flex items-baseline justify-center gap-1.5">
                    <span className="text-[16px] font-semibold" style={{ color: famCol(c) }}>{c.chord.label}</span>
                    <span className="text-[12px] text-[var(--ink2)]">
                      {c.chord.literal ? "" : c.chord.name} · {c.set}
                    </span>
                  </div>
                </div>
              </Fragment>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
