"use client";
import { KEYS } from "@/lib/engine";
import { Label } from "@/components/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function KeyPicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <div className="flex flex-col gap-2.5">
      <Label>Key</Label>
      <span className="text-[40px] font-bold leading-none">{value}</span>
      <ToggleGroup type="single" value={value} onValueChange={(v) => v && onChange(v)} aria-label="Key" className="w-full flex-wrap gap-1">
        {KEYS.map((k) => (
          <ToggleGroupItem
            key={k}
            value={k}
            className="h-[26px] min-w-[30px] rounded-[6px] border border-border px-1.5 text-[12px] font-normal text-text-secondary hover:bg-card hover:text-foreground data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:font-semibold data-[state=on]:text-background"
          >
            {k}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
