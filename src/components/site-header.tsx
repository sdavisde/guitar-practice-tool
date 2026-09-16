"use client";
import { Button } from "@/components/ui/button";
import { ChartDialog } from "@/components/chart-dialog";
import { PrinterIcon } from "@/components/icons";

type Props = { onImport: (chart: string) => string | null; onClear?: () => void };

export function SiteHeader({ onImport, onClear }: Props) {
  return (
    <header className="flex min-h-[60px] flex-wrap items-center justify-between gap-2 border-b border-border py-2">
      <span className="text-[17px] font-bold">Triad Paths</span>
      <div className="flex items-center gap-2.5">
        {onClear && <Button variant="ghost" className="h-[34px] px-3.5 text-[13px]" onClick={onClear}>Clear song</Button>}
        <ChartDialog onImport={onImport} trigger={<Button variant="outline" className="h-[34px] px-3.5 text-[13px]">Edit chart</Button>} />
        <Button className="h-[34px] px-3.5 text-[13px]" onClick={() => window.print()}>
          <PrinterIcon /> Print
        </Button>
      </div>
    </header>
  );
}
