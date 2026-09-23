"use client";
import { useEffect, useRef } from "react";
import type { ReactElement } from "react";
import { stopAudio } from "@/lib/audio";
import { useMediaQuery } from "@/lib/use-media-query";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Roughly the popover's height with four voicings to a string set. */
const ROOM = 680;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Names the chord for screen readers ("Voicing for 4, C"). */
  title: string;
  /** The chord card button that opens the picker. */
  trigger: ReactElement;
  /** The picker itself, given the layout the container calls for; rendered only while open. */
  children: (layout: "popover" | "sheet") => ReactElement;
};

/**
 * Where the voicing picker opens: a popover under the card from `lg` up, a bottom sheet below it.
 * The sheet is a Dialog, like the header's menu — a floating Radix menu did not open on a phone.
 */
export function VoicingPickerFrame({ open, onOpenChange, title, trigger, children }: Props) {
  // False on the server and on the first client render, so the page hydrates as the sheet variant
  // (which renders nothing until opened) and switches after mount.
  const wide = useMediaQuery("(min-width: 64rem)");
  const card = useRef<HTMLButtonElement>(null);
  const change = (next: boolean) => { if (!next) stopAudio(); onOpenChange(next); };

  // The popover is tall. When it fits neither under nor over the card, bring the card to the top
  // of the window so it opens whole underneath (the popover follows the scroll), padding the page
  // for as long as it is open when the page is too short to scroll that far.
  useEffect(() => {
    const box = card.current?.getBoundingClientRect();
    if (!open || !wide || !box || window.innerHeight - box.bottom >= ROOM || box.top >= ROOM) return;
    const by = box.top - 16;
    const page = document.documentElement;
    const short = by - (page.scrollHeight - window.innerHeight - window.scrollY);
    if (short > 0) document.body.style.paddingBottom = `${Math.ceil(short)}px`;
    window.scrollBy({ top: by, behavior: "smooth" });
    return () => { document.body.style.paddingBottom = ""; };
  }, [open, wide]);

  if (wide) {
    return (
      <Popover open={open} onOpenChange={change}>
        <PopoverTrigger ref={card} asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          align="start" sideOffset={10} collisionPadding={16} aria-label={title}
          className="max-h-(--radix-popover-content-available-height) w-[760px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-[14px] border border-border p-[18px] shadow-2xl shadow-black/50 ring-0"
        >
          {children("popover")}
        </PopoverContent>
      </Popover>
    );
  }
  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="top-auto bottom-0 flex max-h-[85dvh] max-w-full translate-y-0 flex-col gap-2 rounded-t-xl rounded-b-none p-0 pt-2.5 sm:max-w-full"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">Pick another shape for this chord. Tap one to hear it and pin it.</DialogDescription>
        {children("sheet")}
      </DialogContent>
    </Dialog>
  );
}
