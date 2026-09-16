import type { SongMeta } from "@/lib/use-song";

/** "Title · Artist" with a capo pill, or nothing for a typed progression. */
export function SongTitle({ meta }: { meta: SongMeta }) {
  const title = [meta.title, meta.artist].filter(Boolean).join(" · ");
  if (!title) return null;
  return (
    <span className="truncate text-[13px] text-text-secondary">
      {title}
      {meta.capo ? <span className="ml-2 rounded-[5px] border border-border px-1.5 py-px text-[11px]">Capo {meta.capo}</span> : null}
    </span>
  );
}
