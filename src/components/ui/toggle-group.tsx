"use client";
import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cn } from "@/lib/utils";

function ToggleGroup({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return <ToggleGroupPrimitive.Root className={cn("flex flex-wrap items-center gap-1.5", className)} {...props} />;
}
function ToggleGroupItem({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      className={cn(
        "cursor-pointer rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1 text-[13px] text-[var(--ink)] transition-colors hover:border-[var(--ink2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--maj)] data-[state=on]:border-[var(--ink)] data-[state=on]:bg-[var(--ink)] data-[state=on]:text-white",
        className
      )}
      {...props}
    />
  );
}
export { ToggleGroup, ToggleGroupItem };
