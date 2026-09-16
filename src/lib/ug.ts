/**
 * Ultimate Guitar scraper. Server-only: import this from route handlers, never from client code.
 *
 * UG has no API. Every tab and search page embeds its data as an HTML-escaped JSON blob in
 * `<div class="js-store" data-content="...">`; we fetch the page, unescape, parse, and walk it.
 * Verified against live pages 2026-09-16. If UG changes its markup, `fetchStore` throws.
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const ALLOWED_HOSTS = new Set(["tabs.ultimate-guitar.com", "www.ultimate-guitar.com"]);

export class UgError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "UgError";
  }
}

const ENTITIES: Record<string, string> = { quot: '"', amp: "&", lt: "<", gt: ">", apos: "'", nbsp: " " };
const unescapeHtml = (s: string) =>
  s.replace(/&(?:#(\d+)|#[xX]([0-9a-fA-F]+)|([a-zA-Z]+));/g, (m, dec, hex, name) => {
    if (dec) return String.fromCodePoint(+dec);
    if (hex) return String.fromCodePoint(parseInt(hex, 16));
    return name in ENTITIES ? ENTITIES[name] : m;
  });

type Json = Record<string, unknown>;
const obj = (x: unknown): Json => (x && typeof x === "object" && !Array.isArray(x) ? (x as Json) : {});
const str = (x: unknown): string | null => (typeof x === "string" ? x : null);
const num = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x) ? x : null);

/** Is this a URL we are willing to fetch? Keeps the tab route from becoming an open proxy. */
export function isUgUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && ALLOWED_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

/** Fetch a UG page and return `store.page.data` from its embedded JSON blob. */
async function fetchStore(url: string, revalidate: number): Promise<Json> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      next: { revalidate },
    });
  } catch {
    throw new UgError("Could not reach Ultimate Guitar.", 502);
  }
  if (res.status === 404) throw new UgError("Ultimate Guitar has no page at that address.", 404);
  if (!res.ok) throw new UgError(`Ultimate Guitar answered ${res.status}.`, 502);
  const html = await res.text();
  const m = html.match(/<div class="js-store" data-content="([^"]*)"/);
  if (!m) throw new UgError("Ultimate Guitar page had no data (blocked, or the site changed).", 502);
  let parsed: unknown;
  try {
    parsed = JSON.parse(unescapeHtml(m[1]));
  } catch {
    throw new UgError("Ultimate Guitar page data was unreadable.", 502);
  }
  return obj(obj(obj(obj(parsed).store).page).data);
}

export interface UgSearchResult {
  id: number;
  songName: string;
  artistName: string;
  version: number;
  rating: number;
  votes: number;
  key: string | null;
  /** Album cover (falling back to artist photo) thumbnail URL on UG's CDN, if any. */
  cover: string | null;
  url: string;
}

export interface UgSearch {
  query: string;
  total: number;
  page: number;
  pages: number;
  results: UgSearchResult[];
}

const httpsUrl = (x: unknown): string | null => {
  const s = str(x);
  return s && s.startsWith("https://") ? s : null;
};

/** Album cover thumbnail, else artist photo, else null. */
function coverUrl(r: Json): string | null {
  return (
    httpsUrl(obj(obj(r.album_cover).web_album_cover).small) ??
    httpsUrl(obj(obj(r.artist_cover).web_artist_cover).small)
  );
}

/** Title search (artist + title in one box works best), chord sheets only. */
export async function search(query: string, page = 1): Promise<UgSearch> {
  const url =
    `https://www.ultimate-guitar.com/search.php?search_type=title` +
    `&value=${encodeURIComponent(query)}&page=${page}`;
  const d = await fetchStore(url, 3600);
  const rows = Array.isArray(d.results) ? d.results.map(obj) : [];
  const results: UgSearchResult[] = [];
  for (const r of rows) {
    // Rows without `type`/`tab_url` are UG's own upsell entries; only "Chords" have a chord sheet.
    if (r.type !== "Chords" || !str(r.tab_url) || !isUgUrl(r.tab_url as string)) continue;
    results.push({
      id: num(r.id) ?? 0,
      songName: str(r.song_name) ?? "",
      artistName: str(r.artist_name) ?? "",
      version: num(r.version) ?? 1,
      rating: num(r.rating) ?? 0,
      votes: num(r.votes) ?? 0,
      key: str(r.tonality_name) || null,
      cover: coverUrl(r),
      url: r.tab_url as string,
    });
  }
  const pagination = obj(d.pagination);
  return {
    query: str(d.search_query) ?? query,
    total: num(d.results_count) ?? results.length,
    page: num(pagination.current) ?? page,
    pages: num(pagination.total) ?? 1,
    results,
  };
}

export interface UgTab {
  id: number;
  songName: string;
  artistName: string;
  version: number;
  key: string | null;
  capo: number | null;
  tuning: string | null;
  /** Chord sheet in UG markup: `[ch]G[/ch]` chords, `[tab]...[/tab]` chord/lyric pairs, `[Verse 1]` headers. */
  content: string;
}

/** One tab page. Throws a 422 UgError for Pro/Official tabs, which have no text content. */
export async function getTab(tabUrl: string): Promise<UgTab> {
  if (!isUgUrl(tabUrl)) throw new UgError("Not an Ultimate Guitar URL.", 400);
  const d = await fetchStore(tabUrl, 86400);
  const tab = obj(d.tab);
  const view = obj(d.tab_view);
  // UG serialises an empty meta as `[]` (PHP array), not `{}`.
  const meta = Array.isArray(view.meta) ? {} : obj(view.meta);
  const content = str(obj(view.wiki_tab).content);
  if (!content) throw new UgError("That tab has no chord sheet (Pro and Official tabs can't be imported).", 422);
  return {
    id: num(tab.id) ?? 0,
    songName: str(tab.song_name) ?? "",
    artistName: str(tab.artist_name) ?? "",
    version: num(tab.version) ?? 1,
    key: str(meta.tonality) || str(tab.tonality_name) || null,
    capo: num(meta.capo),
    tuning: str(obj(meta.tuning).value),
    content: content.replace(/\r\n?/g, "\n"),
  };
}
