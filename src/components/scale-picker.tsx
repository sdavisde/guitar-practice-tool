"use client";
import { SCALES, ScaleId } from "@/lib/scales";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/** Which scale the neck above the song is showing. */
export function ScalePicker({ value, onChange }: { value: ScaleId; onChange: (id: ScaleId) => void }) {
  return (
    <ToggleGroup type="single" value={value} onValueChange={(v) => v && onChange(v as ScaleId)} aria-label="Scale" className="w-full flex-wrap gap-1.5">
      {SCALES.map((s) => (
        <ToggleGroupItem
          key={s.id}
          value={s.id}
          title={s.blurb}
          className="h-8 rounded-full border border-border bg-card px-3.5 text-[13px] font-normal text-text-secondary hover:bg-card hover:text-foreground data-[state=on]:border-transparent data-[state=on]:bg-accent-soft data-[state=on]:font-semibold data-[state=on]:text-accent"
        >
          {s.name}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
