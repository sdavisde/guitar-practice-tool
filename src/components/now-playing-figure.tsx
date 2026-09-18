import { Cand } from "@/lib/engine";
import { FretMap } from "@/components/diagrams";
import { Label } from "@/components/label";

/** The neck box: the path's shapes on a neck cropped at `maxFret`, with a "Frets 0–n" label. */
export function NowPlayingFigure({ path, maxFret }: { path: Cand[]; maxFret: number }) {
  return (
    <div className="rounded-[12px] border border-border bg-background px-3.5 pt-3 pb-0">
      <FretMap path={path} maxFret={maxFret} />
      <Label className="mb-2 block">Frets 0–{maxFret}</Label>
    </div>
  );
}
