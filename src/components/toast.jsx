// App notifications, built on shadcn/ui's Sonner toaster with Oja's dark pill toast.
import { useEffect, useState } from 'react'
import { toast as sonner } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { Icon } from './Icon'

export function showToast(msg, { icon, ms = 2600 } = {}) {
  sonner.custom((id) => (
    <div role="status" onClick={() => sonner.dismiss(id)}
      className="ml-auto flex w-fit max-w-[360px] cursor-pointer items-center gap-2.5 rounded-lg bg-ink px-4 py-3 text-[14px] text-white shadow-lift max-md:ml-0 max-md:w-full max-md:max-w-none">
      {icon && <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/12 text-sun"><Icon name={icon} size={16} /></span>}
      <span>{msg}</span>
    </div>
  ), { duration: ms })
}

const useNarrow = () => {
  const q = '(max-width: 900px)'
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => { const m = window.matchMedia(q); const on = () => setNarrow(m.matches); m.addEventListener('change', on); return () => m.removeEventListener('change', on) }, [])
  return narrow
}

// Bottom-right on desktop; above the mobile tab bar, full width, on phones and tablets
export function Toasts() {
  const narrow = useNarrow()
  return (
    <Toaster position="bottom-right" gap={8} visibleToasts={4}
      offset={narrow ? { bottom: 140, left: 12, right: 12 } : 20}
      mobileOffset={{ bottom: 140, left: 12, right: 12 }}
      style={narrow ? { '--width': 'calc(100vw - 24px)' } : undefined} />
  )
}
