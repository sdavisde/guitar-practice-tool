"use client";
import { Loader2Icon, MusicIcon } from "lucide-react";
import { cn } from "cn";
import { formatCount, popularity, type UgResult, type UgSongGroup } from "@/lib/ug-group";

type Props = {
  group: UgSongGroup;
  /** Highest vote count in the whole result set; the popularity bar is scaled against it. */
  maxVotes: number;
  /** URL of the version currently being imported, if any. */
  loadingUrl: string | null;
  onPick: (r: UgResult) => void;
};

const DOTS = [0, 1, 2, 3, 4];

/** Five small dots filled proportionally to a 0–5 rating; fully muted when nobody has voted. */
function RatingDots({ rating, muted }: { rating: number; muted: boolean }) {
  return (
    <span className="flex items-center gap-[3px]" aria-hidden>
      {DOTS.map((i) => {
        const fill = muted ? 0 : Math.round(Math.max(0, Math.min(1, rating - i)) * 100);
        return (
          <span
            key={i}
            className="block size-[6px] rounded-full"
            style={{ background: `linear-gradient(to right, var(--accent) ${fill}%, var(--border) ${fill}%)` }}
          />
        );
      })}
    </span>
  );
}

/**
 * One song in the search results. The whole row is a button that imports the primary version;
 * version pills are sibling buttons layered above it so clicking one never bubbles to the row.
 */
export function UgResultRow({ group, maxVotes, loadingUrl, onPick }: Props) {
  const { primary, versions } = group;
  const pending = versions.some((v) => v.url === loadingUrl);
  const busy = loadingUrl !== null;
  const unrated = group.votes === 0;
  const width = `${Math.round(popularity(group.votes, maxVotes) * 100)}%`;
  const label = `Import ${group.songName} by ${group.artistName}` + (versions.length > 1 ? `, version ${primary.version}` : "");

  return (
    <li
      className={cn(
        "relative border-b border-border transition-colors hover:bg-card has-[button:focus-visible]:bg-card",
        unrated && "opacity-60",
        pending && "opacity-70",
      )}
    >
      <button
        type="button"
        onClick={() => onPick(primary)}
        disabled={busy}
        aria-label={label}
        className="absolute inset-0 w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60 disabled:cursor-default"
      />

      <div className="pointer-events-none relative grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-x-3 px-1 py-2">
        <span className="flex size-11 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
          {pending ? (
            <Loader2Icon className="size-4 animate-spin text-accent" />
          ) : group.cover ? (
            <img src={group.cover} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
          ) : (
            <MusicIcon className="size-4" />
          )}
        </span>

        <span className="flex min-w-0 flex-col gap-y-0.5">
          <span className="truncate text-[14px] leading-tight">{group.songName}</span>
          <span className="truncate text-[12px] leading-tight text-text-secondary">{group.artistName}</span>
          {versions.length > 1 && (
            <span className="pointer-events-auto mt-1 flex flex-wrap gap-1">
              {versions.map((v) => {
                const isPrimary = v.id === primary.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={busy}
                    onClick={() => onPick(v)}
                    aria-label={`Import version ${v.version}, ${v.votes} votes`}
                    className={cn(
                      "inline-flex h-5 items-center gap-1 rounded-full border px-1.5 text-[11px] leading-none tabular-nums transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-default",
                      isPrimary
                        ? "border-accent/50 bg-accent-soft text-foreground"
                        : "border-border text-text-secondary hover:border-accent/40 hover:text-foreground",
                    )}
                  >
                    v{v.version}
                    <span className={cn(isPrimary ? "text-text-secondary" : "text-muted-foreground")}>{formatCount(v.votes)}</span>
                  </button>
                );
              })}
            </span>
          )}
        </span>

        <span className="grid grid-cols-[auto_2.25rem_auto] items-center gap-x-2 gap-y-1.5">
          <RatingDots rating={primary.rating} muted={unrated} />
          <span className="text-[11px] tabular-nums text-text-secondary">{unrated ? "" : primary.rating.toFixed(1)}</span>
          <span
            className={cn(
              "inline-flex h-[18px] min-w-8 items-center justify-center rounded-[4px] border px-1 border-border font-mono text-[11px] leading-none text-text-secondary",
              !primary.key && "invisible",
            )}
            aria-label={primary.key ? `Key ${primary.key}` : undefined}
          >
            {primary.key ?? ""}
          </span>

          <span className="h-1 w-14 overflow-hidden rounded-full bg-border" aria-hidden>
            <span className="block h-full rounded-full bg-accent/60" style={{ width }} />
          </span>
          <span className="text-[11px] tabular-nums text-text-secondary">{unrated ? "" : formatCount(group.votes)}</span>
          <span />
        </span>
      </div>
    </li>
  );
}
