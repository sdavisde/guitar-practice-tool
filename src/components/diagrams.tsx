import { Cand, QUAL, SetId, MAX_FRET } from "@/lib/engine";

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
            <text x={x} y={y + 3.5} textAnchor="middle" fontSize={9} fontWeight={600} fill="#fff">{names[tones[i]]}</text>
          </g>
        );
      })}
    </svg>
  );
}

function neckShort(c: Cand): string {
  const m = c.chord.label.match(/^([1-7]|[A-G][#b]?)/);
  const base = m ? m[1] : c.chord.label;
  const f = QUAL[c.chord.q].fam;
  return base + (f === "min" ? "m" : f === "dim" ? "°" : "");
}

// Which real string each index of a cand's frets/tones sits on. String 1 = high e.
export const SET_STRINGS: Record<SetId, number[]> = {
  "1-3": [3, 2, 1],
  "2-4": [4, 3, 2],
  "3-5": [5, 4, 3],
};
const STRING_NAMES = ["e", "B", "G", "D", "A", "E"]; // string 1 → 6, top to bottom
const INLAYS = [3, 5, 7, 9, 12, 15];

export function FretMap({ path }: { path: Cand[] }) {
  const W = 920, left = 52, right = 16, top = 16, rowH = 25;
  const H = top + 5 * rowH + 26;
  const fw = (W - left - right) / MAX_FRET;
  const sy = (s: number) => top + (s - 1) * rowH;
  const fx = (f: number) => (f === 0 ? left - 18 : left + (f - 0.5) * fw);
  const boardTop = sy(1), boardBot = sy(6), midY = (boardTop + boardBot) / 2;

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
      {INLAYS.map((f) => (
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
      {Array.from({ length: MAX_FRET + 1 }, (_, f) => (
        <line key={`w${f}`} x1={left + f * fw} y1={boardTop} x2={left + f * fw} y2={boardBot}
          stroke={f === 0 ? "var(--neck-ink)" : "var(--neck-line)"} strokeWidth={f === 0 ? 3 : 0.8} />
      ))}
      {STRING_NAMES.map((nm, i) => (
        <g key={nm + i}>
          <line x1={left - 26} y1={sy(i + 1)} x2={W - right} y2={sy(i + 1)} stroke="var(--neck-line)" strokeWidth={1} />
          <text x={left - 34} y={sy(i + 1) + 3.5} fontSize={10} fill="var(--neck-muted)" textAnchor="end">{nm}</text>
        </g>
      ))}
      {Array.from({ length: MAX_FRET }, (_, i) => (
        <text key={`n${i}`} x={fx(i + 1)} y={H - 6} fontSize={10} fill="var(--neck-muted)" textAnchor="middle">{i + 1}</text>
      ))}
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
          <text x={root.x} y={root.y + 3.5} textAnchor="middle" fontSize={9.5} fontWeight={600} fill="#fff">
            {neckShort(c)}
          </text>
        </g>
      ))}
    </svg>
  );
}
