import * as React from "react"
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

// Oja badges: tone (colour) x shape. "pill" is the storefront stock/status badge,
// "chip" is the small squared label used across the operations dashboard.
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap font-semibold not-italic transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive text-white",
        outline: "border border-border text-foreground",
        good: "bg-good-tint text-good-ink",
        info: "bg-info-tint text-info-ink",
        warn: "bg-warn-tint text-warn-ink",
        bad: "bg-bad-tint text-bad-ink",
        brand: "bg-brand-tint text-brand",
        muted: "bg-adm-bg text-ink-2",
      },
      shape: {
        pill: "mr-1 rounded-full px-2 py-[3px] text-[11.5px]",
        chip: "rounded-[5px] px-[7px] py-px text-[11px]",
      },
    },
    defaultVariants: {
      variant: "default",
      shape: "pill",
    },
  }
)

function Badge({
  className,
  variant = "default",
  shape = "pill",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, shape }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
