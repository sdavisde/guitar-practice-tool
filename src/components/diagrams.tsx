import { Cand, QUAL, MAX_FRET } from "@/lib/engine";
import { SET_STRINGS } from "@/lib/voicings";

export { SET_STRINGS };

export const FAM_COLOR: Record<string, string> = {
  maj: "var(--fam-maj)", min: "var(--fam-min)", dim: "var(--fam-dim)", sus: "var(--fam-sus)",
};
export const famCol = (c: Cand) => FAM_COLOR[QUAL[c.chord.q].fam];

export function ChordDiagram({ cand, names }: { cand: Cand; names: string[] }) {
  const { frets, tones, chord } = cand;
  const mn = Math.min(...frets), mx = Math.max(...frets);
  const base = mn === 0 ? 0 : Math.max(0, mn - 1);
  const rows = Math.max(4, mx - base);
  const W = 104, rh = 22, top = 16, H = top + rows * rh + 8, xs = [30, 58, 86];
  const col = famCol(cand);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`${chord.name} shape`}>
      {Array.from({ length: rows + 1 }, (_, i) => {
        const y = top + i * rh, nut = base === 0 && i === 0;
        return <line key={i} x1={30} y1={y} x2={86} y2={y} stroke={nut ? "var(--neck-ink)" : "var(--neck-line)"} strokeWidth={nut ? 2.5 : 1} />;
      })}
      {xs.map((x) => <line key={x} x1={x} y1={top} x2={x} y2={top + rows * rh} stroke="var(--neck-line)" strokeWidth={1} />)}
      {base > 0 && <text x={12} y={top + rh * 0.5 + 4} fontSize={10} fill="var(--neck-muted)" textAnchor="middle">{base + 1}</text>}
      {frets.map((fr, i) => {
        const x = xs[i], isRoot = tones[i] === chord.root;
        if (fr === 0) return (
          <g key={i}>
            <circle cx={x} cy={top - 8} r={5} fill="none" stroke={col} strokeWidth={2} />
            {isRoot && <circle cx={x} cy={top - 8} r={8} fill="none" stroke={col} strokeWidth={1} />}
          </g>
        );
        const y = top + (fr - base - 0.5) * rh;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={8.5} fill={col} />
            {isRoot && <circle cx={x} cy={y} r={11} fill="none" stroke={col} strokeWidth={1.5} />}
            <text x={x} y={y + 3.5} textAnchor="middle" fontSize={9} fontWeight={600} fill="var(--neck-dot-text)">{names[tones[i]]}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** A chord's label as it fits in a root dot: "1", "6m", "7°". Reads `text` (default: the label as typed). */
export function neckShort(c: Cand, text: string = c.chord.label): string {
  const m = text.match(/^([#b]?[1-7]|[A-G][#b]?)/);
  const base = m ? m[1] : text;
  const f = QUAL[c.chord.q].fam;
  return base + (f === "min" ? "m" : f === "dim" ? "°" : "");
}

/** String 1 → 6, top to bottom, as the neck labels them. */
export const STRING_NAMES = ["e", "B", "G", "D", "A", "E"];
const INLAYS = [3, 5, 7, 9, 12, 15];

/**
 * Where the neck's strings and frets sit in the SVG. Every map that draws the neck goes through
 * this, so they all draw the same instrument at the same size. Frets keep their width whatever
 * `maxFret` is; the board just ends sooner.
 */
export function neckGeometry(maxFret: number) {
  const left = 52, right = 16, top = 16, rowH = 25;
  const fw = (920 - left - right) / MAX_FRET;
  return {
    left, right, top, rowH, fw,
    W: left + maxFret * fw + right,
    H: top + 5 * rowH + 26,
    /** Centre line of string `s`, 1 (high e) at the top to 6 (low E) at the bottom. */
    sy: (s: number) => top + (s - 1) * rowH,
    /** Where a fret's dot goes; fret 0 sits behind the nut. */
    fx: (f: number) => (f === 0 ? left - 18 : left + (f - 0.5) * fw),
  };
}

/** The wood: inlays, fret wires, the six strings with their names, and the fret numbers underneath. */
export function NeckBoard({ maxFret }: { maxFret: number }) {
  const { left, right, rowH, fw, W, H, sy, fx } = neckGeometry(maxFret);
  const boardTop = sy(1), boardBot = sy(6), midY = (boardTop + boardBot) / 2;
  return (
    <>
      {INLAYS.filter((f) => f <= maxFret).map((f) => (
        <g key={`in${f}`} opacity={0.5}>
          {f === 12 ? (
            <>
              <circle cx={fx(f)} cy={midY - rowH * 0.9} r={5} fill="var(--neck-line)" />
              <circle cx={fx(f)} cy={midY + rowH * 0.9} r={5} fill="var(--neck-line)" />
            </>
          ) : (
            <circle cx={fx(f)} cy={midY} r={5} fill="var(--neck-line)" />
          )}
        </g>
      ))}
      {Array.from({ length: maxFret + 1 }, (_, f) => (
        <line key={`w${f}`} x1={left + f * fw} y1={boardTop} x2={left + f * fw} y2={boardBot}
          stroke={f === 0 ? "var(--neck-ink)" : "var(--neck-line)"} strokeWidth={f === 0 ? 3 : 0.8} />
      ))}
      {STRING_NAMES.map((nm, i) => (
        <g key={nm + i}>
          <line x1={left - 26} y1={sy(i + 1)} x2={W - right} y2={sy(i + 1)} stroke="var(--neck-line)" strokeWidth={1} />
          <text x={left - 34} y={sy(i + 1) + 3.5} fontSize={10} fill="var(--neck-muted)" textAnchor="end">{nm}</text>
        </g>
      ))}
      {Array.from({ length: maxFret }, (_, i) => (
        <text key={`n${i}`} x={fx(i + 1)} y={H - 6} fontSize={10} fill="var(--neck-muted)" textAnchor="middle">{i + 1}</text>
      ))}
    </>
  );
}

/** The neck up to `maxFret` (default: the whole 15 frets), with a phrase's shapes on it. */
export function FretMap({ path, maxFret = MAX_FRET }: { path: Cand[]; maxFret?: number }) {
  const { W, H, sy, fx } = neckGeometry(maxFret);

  const shapes = path.map((c) => {
    const strings = SET_STRINGS[c.set];
    const notes = c.frets.map((fr, j) => ({
      x: fx(fr), y: sy(strings[j]), isRoot: c.tones[j] === c.chord.root,
    }));
    return { c, notes, root: notes.find((n) => n.isRoot)! };
  });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mb-3 mt-1 block w-full max-w-[920px]"
      role="img"
      aria-label={`Fretboard map showing where ${path.map((c) => c.chord.label).join(", ")} sit on the neck, with each chord's root note marked`}
    >
      <NeckBoard maxFret={maxFret} />
      {shapes.map(({ c, notes }, i) => (
        <polyline key={`s${i}`} points={notes.map((n) => `${n.x},${n.y}`).join(" ")}
          fill="none" stroke={famCol(c)} strokeWidth={1.5} strokeOpacity={0.4} />
      ))}
      <polyline points={shapes.map((s) => `${s.root.x},${s.root.y}`).join(" ")}
        fill="none" stroke="var(--neck-ink)" strokeWidth={1.2} strokeOpacity={0.45} strokeDasharray="4 4" />
      {shapes.map(({ c, notes }, i) =>
        notes.filter((n) => !n.isRoot).map((n, j) => (
          <circle key={`t${i}-${j}`} cx={n.x} cy={n.y} r={4.5} fill={famCol(c)} fillOpacity={0.5} />
        ))
      )}
      {shapes.map(({ c, root }, i) => (
        <g key={`r${i}`}>
          <circle cx={root.x} cy={root.y} r={10} fill={famCol(c)} />
          <circle cx={root.x} cy={root.y} r={13} fill="none" stroke={famCol(c)} strokeWidth={1.5} />
          <text x={root.x} y={root.y + 3.5} textAnchor="middle" fontSize={9.5} fontWeight={600} fill="var(--neck-dot-text)">
            {neckShort(c)}
          </text>
        </g>
      ))}
    </svg>
  );
}
