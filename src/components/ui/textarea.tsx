import * as React from "react";
import { cn } from "@/lib/utils";
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] p-3 font-mono text-[13px] leading-relaxed text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--maj)]",
        className
      )}
      {...props}
    />
  );
}
export { Textarea };
