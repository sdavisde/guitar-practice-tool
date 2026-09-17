"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { UgResultRow } from "@/components/ug-result-row";
import { ugContentToChart, ugKeyToSongKey } from "@/lib/ug-chart";
import { groupResults, type UgResult } from "@/lib/ug-group";
import type { SongMeta } from "@/lib/use-song";

type SearchPage = { query: string; total: number; page: number; pages: number; results: UgResult[] };
type Tab = { songName: string; artistName: string; key: string | null; capo: number | null; content: string };

type Props = {
  /** Optional inline trigger. Omit it and drive the dialog with `open`/`onOpenChange` instead. */
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onImport: (chart: string, info?: SongMeta & { key?: string }) => string | null;
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status}).`);
  return body as T;
}

/** Search Ultimate Guitar by artist/title and import a chord sheet. `onImport` returns an error message, or null. */
export function UgSearchDialog({ trigger, open: openProp, onOpenChange, onImport }: Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;

  function setOpen(next: boolean) {
    if (openProp === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }
  const [query, setQuery] = useState("");
  const [page, setPage] = useState<SearchPage | null>(null);
  const [results, setResults] = useState<UgResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Pages are appended to the flat list; grouping re-derives, so "Load more" merges into existing songs.
  const groups = useMemo(() => groupResults(results), [results]);
  const maxVotes = useMemo(() => groups.reduce((m, g) => Math.max(m, g.votes), 0), [groups]);

  async function runSearch(pageNo: number) {
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    setError("");
    try {
      const data = await getJson<SearchPage>(`/api/ug/search?q=${encodeURIComponent(q)}&page=${pageNo}`);
      setPage(data);
      setResults((prev) => (pageNo > 1 ? [...prev, ...data.results] : data.results));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
      if (pageNo === 1) { setPage(null); setResults([]); }
    } finally {
      setSearching(false);
    }
  }

  async function pick(r: UgResult) {
    if (loadingUrl) return;
    setLoadingUrl(r.url);
    setError("");
    try {
      const tab = await getJson<Tab>(`/api/ug/tab?url=${encodeURIComponent(r.url)}`);
      const err = onImport(ugContentToChart(tab.content), {
        title: tab.songName || r.songName,
        artist: tab.artistName || r.artistName,
        capo: tab.capo ?? undefined,
        key: ugKeyToSongKey(tab.key ?? r.key) ?? undefined,
        source: "ultimate-guitar",
      });
      if (err) { setError(err); return; }
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setLoadingUrl(null);
    }
  }

  const canLoadMore = !!page && page.page < page.pages;
  const hasResults = groups.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 p-0 sm:max-w-2xl">
        <div className="flex flex-col gap-3 px-4 pt-4 pb-3">
          <DialogHeader>
            <DialogTitle>Search Ultimate Guitar</DialogTitle>
            <DialogDescription className="text-[13px]">
              Try artist and title together, e.g. &ldquo;oasis wonderwall&rdquo;.
            </DialogDescription>
          </DialogHeader>

          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void runSearch(1); }}>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="artist title"
              aria-label="Search text"
              autoFocus
              className="h-[34px] text-[13px]"
            />
            <Button type="submit" className="h-[34px] px-3.5 text-[13px]" disabled={searching || !query.trim()}>
              {searching && !hasResults ? "Searching…" : "Search"}
            </Button>
          </form>

          {error && <p className="text-[13px] text-destructive">{error}</p>}
          {page && !hasResults && !error && (
            <p className="text-[13px] text-text-secondary">Nothing found for &ldquo;{page.query}&rdquo;.</p>
          )}
        </div>

        {hasResults && (
          <div className="min-h-0 flex-1 overflow-y-auto border-t border-border px-4 pb-3">
            <ul className="flex flex-col" aria-busy={!!loadingUrl}>
              {groups.map((g) => (
                <UgResultRow key={g.key} group={g} maxVotes={maxVotes} loadingUrl={loadingUrl} onPick={(r) => void pick(r)} />
              ))}
            </ul>
            <div className="flex items-center justify-between gap-3 pt-3">
              <span className="text-[12px] text-text-secondary">
                {groups.length} {groups.length === 1 ? "song" : "songs"}
                {page ? ` · ${results.length} of ${page.total} sheets` : ""}
              </span>
              {canLoadMore && (
                <Button variant="outline" className="h-[30px] px-3 text-[12px]" disabled={searching} onClick={() => void runSearch(page!.page + 1)}>
                  {searching ? "Loading…" : "Load more"}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
