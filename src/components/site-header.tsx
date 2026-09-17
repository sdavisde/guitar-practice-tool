"use client";
import { useState } from "react";
import Link from "next/link";
import { EllipsisIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ChartDialog } from "@/components/chart-dialog";
import { UgSearchDialog } from "@/components/ug-search-dialog";
import { PrinterIcon } from "@/components/icons";
import { SongTitle } from "@/components/song-title";
import type { SongMeta } from "@/lib/use-song";

type Props = {
  meta: SongMeta;
  onImport: (chart: string, info?: SongMeta & { key?: string }) => string | null;
  onClear?: () => void;
};

/** Let the dropdown finish unmounting before the (blocking) print dialog snapshots the page. */
function printPage() {
  setTimeout(() => window.print(), 200);
}

export function SiteHeader({ meta, onImport, onClear }: Props) {
  // One shared slot so each dialog is rendered exactly once, outside the action sheet
  // (a dialog mounted inside the sheet would unmount the moment the sheet closes).
  const [dialog, setDialog] = useState<"search" | "chart" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex min-h-[60px] flex-wrap items-center justify-between gap-2 border-b border-border py-2">
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="text-[17px] font-bold">Triad Paths</span>
        <SongTitle meta={meta} />
      </div>

      {/* md and up: the full button row. */}
      <div className="hidden min-w-0 flex-wrap items-center justify-end gap-2.5 md:flex">
        {onClear && <Button variant="ghost" className="h-[34px] px-3.5 text-[13px]" onClick={onClear}>Clear song</Button>}
        <Button variant="outline" className="h-[34px] px-3.5 text-[13px]" onClick={() => setDialog("search")}>Search Ultimate Guitar</Button>
        <Button variant="outline" className="h-[34px] px-3.5 text-[13px]" onClick={() => setDialog("chart")}>Edit chart</Button>
        <Button variant="outline" className="h-[34px] px-3.5 text-[13px]" onClick={() => window.print()}>
          <PrinterIcon /> Print
        </Button>
        <Button className="h-[34px] px-3.5 text-[13px]" asChild>
          <Link href="/play">Practice</Link>
        </Button>
      </div>

      {/* Below md: Practice plus an overflow menu, so the row can never outgrow a phone. */}
      <div className="flex min-w-0 shrink-0 items-center gap-2 md:hidden">
        <Button className="h-[34px] px-3.5 text-[13px]" asChild>
          <Link href="/play">Practice</Link>
        </Button>
        <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" aria-label="More" className="size-[34px] shrink-0">
              <EllipsisIcon />
            </Button>
          </DialogTrigger>
          <DialogContent
            showCloseButton={false}
            className="top-auto bottom-0 max-w-full translate-y-0 rounded-t-xl rounded-b-none px-2 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:max-w-full"
          >
            <DialogHeader className="px-2">
              <DialogTitle>Song</DialogTitle>
              <DialogDescription className="sr-only">Song actions</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col">
              <Button
                variant="ghost"
                className="h-11 justify-start px-3 text-[15px] font-normal"
                onClick={() => {
                  setMenuOpen(false);
                  setDialog("search");
                }}
              >
                Search Ultimate Guitar
              </Button>
              <Button
                variant="ghost"
                className="h-11 justify-start px-3 text-[15px] font-normal"
                onClick={() => {
                  setMenuOpen(false);
                  setDialog("chart");
                }}
              >
                Edit chart
              </Button>
              <Button
                variant="ghost"
                className="h-11 justify-start px-3 text-[15px] font-normal"
                onClick={() => {
                  setMenuOpen(false);
                  printPage();
                }}
              >
                <PrinterIcon /> Print
              </Button>
              {onClear && (
                <Button
                  variant="ghost"
                  className="mt-1 h-11 justify-start border-t border-border px-3 pt-1 text-[15px] font-normal"
                  onClick={() => {
                    setMenuOpen(false);
                    onClear();
                  }}
                >
                  Clear song
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <UgSearchDialog
        onImport={onImport}
        open={dialog === "search"}
        onOpenChange={(open) => setDialog(open ? "search" : null)}
      />
      <ChartDialog
        onImport={onImport}
        open={dialog === "chart"}
        onOpenChange={(open) => setDialog(open ? "chart" : null)}
      />
    </header>
  );
}
