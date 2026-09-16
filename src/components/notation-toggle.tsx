"use client";
import type { Notation } from "@/lib/use-song";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const NOTATIONS: { value: Notation; label: string }[] = [
  { value: "numbers", label: "Numbers" },
  { value: "names", label: "Names" },
];

/** Numbers / Names: which notation the big chord labels use (the other shows small). */
export function NotationToggle({ value, onChange }: { value: Notation; onChange: (notation: Notation) => void }) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as Notation)}
      aria-label="Chord notation"
      className="gap-1"
    >
      {NOTATIONS.map((n) => (
        <ToggleGroupItem
          key={n.value}
          value={n.value}
          className="h-[26px] rounded-[6px] border border-border px-2.5 text-[12px] font-normal text-text-secondary hover:bg-card hover:text-foreground data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:font-semibold data-[state=on]:text-background"
        >
          {n.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
