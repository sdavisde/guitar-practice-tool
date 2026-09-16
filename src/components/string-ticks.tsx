import { Cand } from "@/lib/engine";
import { SET_STRINGS, famCol } from "@/components/diagrams";

/** Six ticks, low E on the left to high e on the right; the strings the shape uses are filled. */
export function StringTicks({ cand }: { cand: Cand }) {
  const used = new Set(SET_STRINGS[cand.set]);
  const col = famCol(cand);
  return (
    <svg width={34} height={10} viewBox="0 0 34 10" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => {
        const string = 6 - i;
        return <rect key={i} x={i * 6} y={0} width={3} height={10} rx={1} fill={used.has(string) ? col : "var(--neck-line)"} />;
      })}
    </svg>
  );
}
