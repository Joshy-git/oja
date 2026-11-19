import * as React from "react"
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

// Oja buttons. Storefront buttons are pills (primary, accent, outline, light);
// the operations dashboard uses squarer buttons (dark, orange, soft, mini, icon).
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold outline-none transition-[background-color,box-shadow,transform,color,border-color] duration-150 focus-visible:ring-[3px] focus-visible:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "rounded-full bg-brand text-white shadow-[0_4px_14px_rgba(11,32,69,.25)] not-disabled:hover:bg-brand-2",
        accent: "rounded-full bg-orange text-white shadow-[0_4px_14px_rgba(255,122,46,.3)] not-disabled:hover:bg-orange-2",
        outline: "rounded-full border-[1.5px] border-line bg-white not-disabled:hover:border-brand not-disabled:hover:text-brand",
        light: "rounded-full bg-white text-ink shadow-[0_6px_20px_rgba(0,0,0,.15)]",
        wish: "rounded-full border-[1.5px] border-line bg-white text-bad aria-pressed:border-[#ffc9c9] aria-pressed:bg-[#fff0f0]",
        dark: "rounded-lg bg-ink text-white not-disabled:hover:bg-brand",
        orange: "gap-1.5 rounded-lg bg-orange text-white shadow-[0_4px_14px_rgba(255,122,46,.3)] hover:bg-[#f26b1d] disabled:shadow-none",
        soft: "gap-1.5 rounded-lg bg-[#e9ecf2] text-ink-2 not-disabled:hover:bg-[#dde1e9] not-disabled:hover:text-ink",
        mini: "gap-1 rounded-lg border border-adm-line bg-white text-ink-2 hover:border-brand hover:text-brand disabled:opacity-45",
        danger: "gap-1 rounded-lg border border-[#f6c7c7] bg-white text-bad not-disabled:hover:border-bad not-disabled:hover:bg-bad not-disabled:hover:text-white disabled:opacity-45",
        destructive: "gap-1 rounded-lg border border-bad bg-bad text-white disabled:opacity-45",
        icon: "rounded-lg text-ink-2 hover:bg-background hover:text-ink",
        link: "font-semibold text-brand underline decoration-[rgba(11,32,69,.3)] underline-offset-3",
      },
      size: {
        md: "px-5 py-[11px] text-[14px]",
        sm: "px-3.5 py-2 text-[13px]",
        xs: "px-2.5 py-1 text-[12px]",
        lg: "px-[26px] py-3.5 text-[15px]",
        dash: "px-4 py-2.5 text-[14px]",
        "dash-sm": "px-4 py-[9px] text-[14px]",
        mini: "px-2.5 py-[5px] text-[13px]",
        "mini-lg": "px-3.5 py-[9px] text-[14px]",
        icon: "grid size-[34px] place-items-center p-0",
        "icon-round": "size-[50px] rounded-full p-0",
        none: "",
      },
    },
  }
)

// Each variant keeps the size it was designed with unless a size is passed
const DEFAULT_SIZE = { wish: "icon-round", primary: "md", accent: "md", outline: "md", light: "md", dark: "dash", soft: "dash", orange: "dash-sm", mini: "mini", danger: "mini", destructive: "mini", icon: "icon", link: "none" }

function Button({
  className,
  variant = "primary",
  size,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot.Root : "button"
  const s = size || DEFAULT_SIZE[variant]

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={s}
      className={cn(buttonVariants({ variant, size: s }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
