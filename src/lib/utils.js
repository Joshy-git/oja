import { clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Teach tailwind-merge the Oja theme tokens so `cn()` resolves conflicts between
// shadcn/ui defaults and our classes (e.g. text-ink replaces text-foreground/60).
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: ['brand', 'brand-2', 'brand-tint', 'brand-ink', 'orange', 'orange-2', 'sun', 'ink', 'ink-2', 'line', 'good', 'bad', 'warn', 'info', 'adm-bg', 'adm-line', 'good-tint', 'good-ink', 'info-tint', 'info-ink', 'warn-tint', 'warn-ink', 'bad-tint', 'bad-ink'],
      shadow: ['card', 'lift'],
      font: ['display', 'script'],
      breakpoint: ['xs'],
    },
  },
})

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
