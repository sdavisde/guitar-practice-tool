"use client";
import { STRATEGIES } from "@/lib/engine";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export const WANDER_ID = "wander";

const ITEMS = [
  ...STRATEGIES.map((s) => ({ id: s.id, name: s.name, blurb: s.blurb })),
  { id: WANDER_ID, name: "Wander", blurb: "A random valid path." },
];

export function MovementChips({ value, onChange, label }: { value: string; onChange: (id: string) => void; label: string }) {
  return (
    <ToggleGroup type="single" value={value} onValueChange={(v) => v && onChange(v)} aria-label={label} className="w-full flex-wrap gap-1.5">
      {ITEMS.map((item) => (
        <ToggleGroupItem
          key={item.id}
          value={item.id}
          title={item.blurb}
          className="h-8 rounded-full border border-border bg-card px-3.5 text-[13px] font-normal text-text-secondary hover:bg-card hover:text-foreground data-[state=on]:border-transparent data-[state=on]:bg-accent-soft data-[state=on]:font-semibold data-[state=on]:text-accent"
        >
          {item.name}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
