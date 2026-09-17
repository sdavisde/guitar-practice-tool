"use client";
import { useState } from "react";
import Link from "next/link";
import { EllipsisIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  // One shared slot so each dialog is rendered exactly once, outside the dropdown
  // (a dialog mounted inside a menu item would unmount the moment the menu closes).
  const [dialog, setDialog] = useState<"search" | "chart" | null>(null);

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="More" className="size-[34px] shrink-0">
              <EllipsisIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setDialog("search")}>Search Ultimate Guitar</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setDialog("chart")}>Edit chart</DropdownMenuItem>
            <DropdownMenuItem onSelect={printPage}>
              <PrinterIcon /> Print
            </DropdownMenuItem>
            {onClear && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onClear()}>Clear song</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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
