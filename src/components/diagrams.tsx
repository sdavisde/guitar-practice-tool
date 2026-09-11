import { Cand, QUAL, SETS, MAX_FRET } from "@/lib/engine";

export const FAM_COLOR: Record<string, string> = {
  maj: "var(--maj)", min: "var(--min)", dim: "var(--dim)", sus: "var(--sus)",
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
        return <line key={i} x1={30} y1={y} x2={86} y2={y} stroke={nut ? "var(--ink)" : "var(--line)"} strokeWidth={nut ? 2.5 : 1} />;
      })}
      {xs.map((x) => <line key={x} x1={x} y1={top} x2={x} y2={top + rows * rh} stroke="var(--line)" strokeWidth={1} />)}
      {base > 0 && <text x={12} y={top + rh * 0.5 + 4} fontSize={10} fill="var(--muted)" textAnchor="middle">{base + 1}</text>}
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

export function NeckStrip({ path }: { path: Cand[] }) {
  const lanes = 3, laneH = 30, W = 920, left = 40, right = 30, top = 12;
  const H = top + lanes * laneH + 22;
  const fx = (f: number) => left + f * ((W - left - right) / MAX_FRET);
  const placed: { lane: number; x: number }[] = [];
  const pts = path.map((c) => {
    const lane = SETS[c.set].lane;
    const x = fx(c.avg);
    let y = top + lane * laneH + laneH / 2;
    const near = placed.filter((p) => p.lane === lane && Math.abs(p.x - x) < 22).length;
    if (near) y += (near % 2 ? -1 : 1) * 12;
    placed.push({ lane, x });
    return { x, y, c };
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mb-3 mt-1 block w-full max-w-[920px]" role="img" aria-label="Position of each chord on the neck">
      {Array.from({ length: lanes }, (_, l) => {
        const y = top + l * laneH + laneH / 2;
        return (
          <g key={l}>
            <line x1={fx(0)} y1={y} x2={fx(MAX_FRET)} y2={y} stroke="var(--line)" strokeWidth={1} />
            <text x={fx(0) - 6} y={y + 4} fontSize={10} fill="var(--muted)" textAnchor="end">{["1–3", "2–4", "3–5"][l]}</text>
          </g>
        );
      })}
      {Array.from({ length: MAX_FRET + 1 }, (_, f) => (
        <g key={f}>
          <line x1={fx(f)} y1={top} x2={fx(f)} y2={top + lanes * laneH} stroke="var(--line)" strokeWidth={f === 0 ? 2 : 0.6} />
          <text x={fx(f)} y={H - 4} fontSize={10} fill="var(--muted)" textAnchor="middle">{f}</text>
        </g>
      ))}
      {[3, 5, 7, 9, 12, 15].map((f) => <circle key={f} cx={fx(f)} cy={H - 15} r={1.6} fill="var(--muted)" />)}
      <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="var(--ink)" strokeWidth={1.2} strokeOpacity={0.55} />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={10} fill={famCol(p.c)} />
          <text x={p.x} y={p.y + 3.5} textAnchor="middle" fontSize={9.5} fontWeight={600} fill="#fff">{neckShort(p.c)}</text>
        </g>
      ))}
    </svg>
  );
}
