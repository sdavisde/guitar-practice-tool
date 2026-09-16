"use client";
import { MOVEMENTS } from "@/components/movement-chips";

type Props = {
  /** The phrase's own movement, or undefined to follow the section. */
  value: string | undefined;
  phraseIndex: number;
  onChange: (id: string | undefined) => void;
};

/** Let one phrase move differently from the rest of its section. */
export function PhraseMovementSelect({ value, phraseIndex, onChange }: Props) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || undefined)}
      aria-label={`Movement for phrase ${phraseIndex + 1}`}
      title="Play this phrase differently from the rest of the section"
      className="h-7 rounded-md border border-border bg-card px-2 text-[12px] text-text-secondary outline-none focus-visible:border-ring"
    >
      <option value="">Section movement</option>
      {MOVEMENTS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
    </select>
  );
}
