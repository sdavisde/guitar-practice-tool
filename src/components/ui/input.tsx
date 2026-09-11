import * as React from "react";
import { cn } from "@/lib/utils";
function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 text-lg tracking-wider text-[var(--ink)] placeholder:text-[var(--muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--maj)]",
        className
      )}
      {...props}
    />
  );
}
export { Input };
