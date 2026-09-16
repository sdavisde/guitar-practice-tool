"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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

export function SiteHeader({ meta, onImport, onClear }: Props) {
  return (
    <header className="flex min-h-[60px] flex-wrap items-center justify-between gap-2 border-b border-border py-2">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="text-[17px] font-bold">Triad Paths</span>
        <SongTitle meta={meta} />
      </div>
      <div className="flex items-center gap-2.5">
        {onClear && <Button variant="ghost" className="h-[34px] px-3.5 text-[13px]" onClick={onClear}>Clear song</Button>}
        <UgSearchDialog onImport={onImport} trigger={<Button variant="outline" className="h-[34px] px-3.5 text-[13px]">Search Ultimate Guitar</Button>} />
        <ChartDialog onImport={onImport} trigger={<Button variant="outline" className="h-[34px] px-3.5 text-[13px]">Edit chart</Button>} />
        <Button variant="outline" className="h-[34px] px-3.5 text-[13px]" onClick={() => window.print()}>
          <PrinterIcon /> Print
        </Button>
        <Button className="h-[34px] px-3.5 text-[13px]" asChild>
          <Link href="/play">Practice</Link>
        </Button>
      </div>
    </header>
  );
}
