const LEGEND: [string, string][] = [
  ["var(--fam-maj)", "major"], ["var(--fam-min)", "minor"], ["var(--fam-sus)", "sus"], ["var(--fam-dim)", "diminished"],
];

export function SiteFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
      <div className="flex flex-wrap gap-4 text-[13px] text-text-secondary">
        {LEGEND.map(([color, label]) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <i className="inline-block size-2.5 rounded-full" style={{ background: color }} />{label}
          </span>
        ))}
      </div>
      <span className="text-[12px] text-muted-foreground">Suffixes: m, M, °, sus2, sus4, 7, maj7, m7 · borrowed degrees: b7, b6, b3, 4m · ringed dot is the root</span>
    </footer>
  );
}
