"use client";
import { MOODS, MoodId, moodById } from "@/lib/random-progression";

type Props = { value: MoodId; onChange: (mood: MoodId) => void };

/** Which style the random progressions come out in. */
export function MoodSelect({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as MoodId)}
      aria-label="Mood for random progressions"
      title={moodById(value).blurb}
      className="h-[26px] rounded-[6px] border border-border bg-card px-2 text-[12px] text-text-secondary outline-none focus-visible:border-ring"
    >
      {MOODS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
    </select>
  );
}
