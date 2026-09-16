/** Client-safe helpers for presenting Ultimate Guitar search results. */

export interface UgResult {
  id: number;
  songName: string;
  artistName: string;
  version: number;
  rating: number;
  votes: number;
  key: string | null;
  cover: string | null;
  url: string;
}

/** One song (title + artist) with every chord-sheet version UG returned for it. */
export interface UgSongGroup {
  key: string;
  songName: string;
  artistName: string;
  cover: string | null;
  /** The version the row body imports: most votes, then highest rating, then lowest version number. */
  primary: UgResult;
  /** Every version including `primary`, sorted by version number. */
  versions: UgResult[];
  /** Highest vote count across versions; drives the popularity bar. */
  votes: number;
}

const groupKey = (r: UgResult) => `${r.songName.trim().toLowerCase()} :: ${r.artistName.trim().toLowerCase()}`;

function better(a: UgResult, b: UgResult): boolean {
  if (a.votes !== b.votes) return a.votes > b.votes;
  if (a.rating !== b.rating) return a.rating > b.rating;
  return a.version < b.version;
}

/**
 * Collapse a flat result list (possibly several pages appended) into one group per song,
 * in order of first appearance. Duplicate ids (a re-fetched page) are ignored.
 */
export function groupResults(results: UgResult[]): UgSongGroup[] {
  const byKey = new Map<string, UgSongGroup>();
  const seen = new Set<number>();
  for (const r of results) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    const k = groupKey(r);
    const g = byKey.get(k);
    if (!g) {
      byKey.set(k, { key: k, songName: r.songName, artistName: r.artistName, cover: r.cover, primary: r, versions: [r], votes: r.votes });
      continue;
    }
    g.versions.push(r);
    g.votes = Math.max(g.votes, r.votes);
    g.cover ??= r.cover;
    if (better(r, g.primary)) g.primary = r;
  }
  const groups = [...byKey.values()];
  for (const g of groups) g.versions.sort((a, b) => a.version - b.version);
  return groups;
}

/** Bar width in [0, 1]: log-scaled so a handful of votes is a sliver and the top result fills. */
export function popularity(votes: number, max: number): number {
  if (votes <= 0 || max <= 0) return 0;
  return Math.min(1, Math.log1p(votes) / Math.log1p(max));
}

/** 229 → "229", 2497 → "2.5k", 12000 → "12k". */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k < 10 ? k.toFixed(1).replace(/\.0$/, "") : Math.round(k)}k`;
}
