"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Switch as SwitchPrimitive } from "radix-ui"

// Oja switches: "pill" (storefront settings) and "toggle" (squarer, used across the dashboard).
// Pass an on-colour with className, e.g. data-[state=checked]:bg-orange.
function Switch({
  className,
  size = "pill",
  ...props
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center transition-colors duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-brand/25 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-brand data-[state=unchecked]:bg-line",
        "data-[size=pill]:h-[26px] data-[size=pill]:w-11 data-[size=pill]:rounded-full",
        "data-[size=toggle]:h-6 data-[size=toggle]:w-[42px] data-[size=toggle]:rounded-lg",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.2)] transition-transform duration-200",
          "group-data-[size=pill]/switch:size-5 group-data-[size=pill]/switch:data-[state=checked]:translate-x-[21px] group-data-[size=pill]/switch:data-[state=unchecked]:translate-x-[3px]",
          "group-data-[size=toggle]/switch:size-[18px] group-data-[size=toggle]/switch:data-[state=checked]:translate-x-[21px] group-data-[size=toggle]/switch:data-[state=unchecked]:translate-x-[3px]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
