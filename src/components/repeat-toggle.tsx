"use client";
import { RepeatMode, DEFAULT_REPEAT } from "@/lib/engine";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const REPEATS: { value: RepeatMode; label: string; blurb: string }[] = [
  { value: "same", label: "Same", blurb: "Play every repeat with the same shapes." },
  { value: "vary", label: "Vary", blurb: "Give each repeat different shapes." },
];

type Props = { value: RepeatMode | undefined; sectionName: string; onChange: (mode: RepeatMode) => void };

/** Same / Vary: whether repeats of a pattern reuse the first occurrence's shapes. */
export function RepeatToggle({ value, sectionName, onChange }: Props) {
  return (
    <ToggleGroup
      type="single"
      value={value ?? DEFAULT_REPEAT}
      onValueChange={(v) => { if (v) onChange(v as RepeatMode); }}
      aria-label={`How the ${sectionName} repeats are played`}
      className="gap-1"
    >
      {REPEATS.map((r) => (
        <ToggleGroupItem
          key={r.value}
          value={r.value}
          title={r.blurb}
          className="h-[26px] rounded-[6px] border border-border px-2.5 text-[12px] font-normal text-text-secondary hover:bg-card hover:text-foreground data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:font-semibold data-[state=on]:text-background"
        >
          {r.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
