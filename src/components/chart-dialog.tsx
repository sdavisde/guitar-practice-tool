"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  /** Optional inline trigger. Omit it and drive the dialog with `open`/`onOpenChange` instead. */
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onImport: (chart: string) => string | null;
};

/** Paste-a-chart dialog. `onImport` returns an error message, or null on success. */
export function ChartDialog({ trigger, open: openProp, onOpenChange, onImport }: Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;

  function setOpen(next: boolean) {
    if (openProp === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }
  const [chart, setChart] = useState("");
  const [error, setError] = useState("");

  function submit() {
    const err = onImport(chart);
    setError(err ?? "");
    if (!err) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Paste a chord chart</DialogTitle>
          <DialogDescription>
            Number charts (Nashville, dots or spaces between chords), chords above lyrics,
            or ChordPro [G]inline all work. Sections like Verse.1 or [Chorus] are kept separate.
            Letter charts get their key detected; number charts use the key you picked.
          </DialogDescription>
        </DialogHeader>
        <Textarea rows={12} value={chart} onChange={(e) => setChart(e.target.value)} aria-label="Chord chart text" className="max-h-[50dvh] min-h-48 resize-none overflow-y-auto font-mono text-[13px] leading-relaxed" />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={submit}>Import</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
