import { cn } from "@/lib/utils";

/** Small mono uppercase label used above controls and figures. */
export function Label({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground", className)}
      {...props}
    />
  );
}
