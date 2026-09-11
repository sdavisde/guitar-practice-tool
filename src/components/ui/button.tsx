import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--maj)] disabled:pointer-events-none disabled:opacity-45 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-[var(--ink)] text-white hover:bg-[var(--ink)]/90",
        outline: "border border-[var(--line)] bg-[var(--panel)] text-[var(--ink)] hover:border-[var(--ink)]",
        ghost: "text-[var(--ink)] hover:bg-[var(--ink)]/5",
      },
      size: { default: "h-9 px-4", sm: "h-8 px-3 text-[13px]", lg: "h-10 px-6" },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

function Button({ className, variant, size, asChild = false, ...props }:
  React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
export { Button, buttonVariants };
