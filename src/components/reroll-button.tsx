"use client";
import { Button } from "@/components/ui/button";
import { DiceIcon } from "@/components/icons";

type Props = {
  /** Which alternative is showing; the counter reads `alt % maxCount + 1`. */
  alt: number;
  anyWander: boolean;
  maxCount: number;
  onReroll: () => void;
};

/** "Re-roll" (next alternative) or "Roll again" (a phrase wanders), with an "n of m" counter. */
export function RerollButton({ alt, anyWander, maxCount, onReroll }: Props) {
  return (
    <>
      <Button
        variant="outline"
        className="h-[34px] px-3.5 text-[13px]"
        disabled={!anyWander && maxCount < 2}
        onClick={onReroll}
      >
        <DiceIcon /> {anyWander ? "Roll again" : "Re-roll"}
      </Button>
      {!anyWander && maxCount > 0 && <span className="text-[12px] text-muted-foreground">{(alt % maxCount) + 1} of {maxCount}</span>}
    </>
  );
}
