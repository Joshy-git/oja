import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStore } from '../store/Store'
import { Page, Empty, Reveal, ProductArt, wrap } from '../components/common'
import { naira, stagesFor } from '../lib/commerce'
import { Icon } from '../components/Icon'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

const fmt = (t) => new Date(t).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const narrow = cn(wrap, 'max-w-[820px]')
const panel = 'mt-4 rounded-lg bg-white p-[22px] shadow-card'
const sumRow = 'flex justify-between text-[14px]'

function statusOf(o) {
  if (o.status === 'cancelled') return { label: 'Cancelled', tone: 'bad' }
  const s = stagesFor(o)[o.stageIdx]
  return { label: s.label, tone: s.key === 'delivered' ? 'good' : 'info' }
}

function MiniArt({ it }) {
  return <ProductArt p={{ id: it.id, title: it.title, hue: it.hue }} size="xs" />
}

export function OrdersList() {
  const { state } = useStore()
  if (!state.orders.length) return <Page className="tw"><div className={wrap}><Empty icon="Package" title="No orders yet" action={<Button asChild><Link to="/">Start shopping</Link></Button>} /></div></Page>
  return (
    <Page className="tw">
      <div className={narrow}>
        <h1 className="mb-4 mt-[22px]">Your orders</h1>
        <div className="flex flex-col gap-3.5">
          {state.orders.map((o, i) => {
            const st = statusOf(o)
            const stages = stagesFor(o)
            return (
              <Reveal key={o.ref} delay={i * 0.05}>
                <Link to={`/orders/${o.ref}`} className="flex flex-col gap-3 rounded-lg bg-white p-[18px] shadow-card transition-[box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:shadow-lift">
                  <div className="flex items-start justify-between gap-2.5">
                    <div><b>{o.ref}</b><div className="text-[13px] text-muted-foreground">Placed {fmt(o.createdAt)} · {o.items.reduce((n, x) => n + x.qty, 0)} item(s)</div></div>
                    <Badge variant={st.tone}>{st.label}</Badge>
                  </div>
                  <div className="flex gap-2">{o.items.map((it) => <MiniArt key={it.id} it={it} />)}</div>
                  {o.status !== 'cancelled' && (
                    <div className="h-1.5 overflow-hidden rounded-[3px] bg-background"><motion.span className="block h-full rounded-[3px] bg-[linear-gradient(90deg,var(--color-brand),var(--color-orange))]" initial={{ width: 0 }} animate={{ width: `${(o.stageIdx / (stages.length - 1)) * 100}%` }} transition={{ duration: 0.8, delay: 0.2 }} /></div>
                  )}
                  <div className="flex items-start justify-between gap-2.5 font-bold"><span>{naira(o.total)}</span><span className="inline-flex items-center gap-0.5 whitespace-nowrap text-[14px] font-semibold text-brand">Track <Icon name="ChevronRight" size={16} /></span></div>
                </Link>
              </Reveal>
            )
          })}
        </div>
      </div>
    </Page>
  )
}

function Confetti() {
  const bits = useMemo(() => Array.from({ length: 36 }, (_, i) => ({ x: (Math.random() - 0.5) * 700, y: -Math.random() * 380 - 120, r: Math.random() * 720, c: ['#ff7a2e', '#0b2045', '#ffc93c', '#4f7fd1', '#1b3a75'][i % 5], d: Math.random() * 0.2 })), [])
  return (
    <div className="pointer-events-none fixed left-1/2 top-[40%] z-100" aria-hidden>
      {bits.map((b, i) => (
        <motion.span key={i} className="absolute h-[14px] w-[9px] rounded-[2px]" style={{ background: b.c }} initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }} animate={{ x: b.x, y: [0, b.y, b.y + 520], opacity: [1, 1, 0], rotate: b.r }} transition={{ duration: 2.2, delay: b.d, ease: 'easeOut' }} />
      ))}
    </div>
  )
}

export function OrderDetail() {
  const { ref } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { state, dispatch, toast } = useStore()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const o = state.orders.find((x) => x.ref === ref)
  if (!o) return <Page className="tw"><div className={wrap}><Empty icon="SearchX" title="Order not found" action={<Button asChild><Link to="/orders">Your orders</Link></Button>} /></div></Page>

  const stages = stagesFor(o)
  const isNew = params.get('new')
  const cancelled = o.status === 'cancelled'
  const delivered = stages[o.stageIdx].key === 'delivered'
  const canCancel = !cancelled && o.stageIdx <= 2
  const evAt = (idx) => o.events.find((e) => e.idx === idx)?.at
  const cancel = () => { dispatch({ type: 'cancelOrder', ref: o.ref }); toast('Order cancelled — refund initiated', { icon: 'RotateCcw' }) }

  return (
    <Page className="tw">
      {isNew && <Confetti />}
      <div className={narrow}>
        {isNew && (
          <motion.div className="mt-5 flex items-center gap-[18px] rounded-lg bg-[linear-gradient(120deg,var(--color-brand),var(--color-brand-2))] px-6 py-[22px] text-white" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', damping: 14 }}>
            <motion.div className="grid size-14 shrink-0 place-items-center rounded-full bg-white text-[28px] font-extrabold text-brand" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.15, type: 'spring' }}><Icon name="Check" size={28} stroke={3} /></motion.div>
            <div><h2 className="text-white">Payment confirmed — thank you!</h2><p className="mt-1 opacity-90">Order <b>{o.ref}</b> is in. We've sent a confirmation by SMS and email.</p></div>
          </motion.div>
        )}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><Link to="/orders" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground"><Icon name="ArrowLeft" size={14} /> All orders</Link><h1 className="mb-0.5 mt-1.5">{o.ref}</h1><div className="text-[13px] text-muted-foreground">Placed {fmt(o.createdAt)} · {o.payment}</div></div>
          {!cancelled && !delivered && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => { dispatch({ type: 'advanceOrder', ref: o.ref }); toast(`Status update: ${stages[o.stageIdx + 1].label}`, { icon: stages[o.stageIdx + 1].icon }) }}><Icon name="ArrowRight" size={14} /> Simulate next update</Button>
              </TooltipTrigger>
              <TooltipContent>Prototype: simulates the next operations event</TooltipContent>
            </Tooltip>
          )}
        </div>

        {cancelled ? <div role="status" className="mb-3 rounded-lg border border-[#ffdd99] bg-warn-tint px-4 py-3 text-[14px] text-[#7a4a00]">This order was cancelled on {fmt(o.cancelledAt)}. A refund of {naira(o.total)} has been initiated to your original payment method (3–5 working days).</div> : (
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg bg-white px-[22px] py-[18px] shadow-card">
            <span className="grid size-[58px] shrink-0 place-items-center rounded-full bg-[#fff4ea] text-orange"><Icon name={stages[o.stageIdx].icon} size={30} /></span>
            <div><div className="text-[13px] text-muted-foreground">Current status</div><b className="font-display text-[22px]">{stages[o.stageIdx].label}</b><div className="text-[13px]">{stages[o.stageIdx].desc}</div></div>
            {o.eta && !delivered && <div className="ml-auto text-right max-sm:ml-0 max-sm:text-left"><div className="text-[13px] text-muted-foreground">Estimated delivery</div><b>{o.eta}</b></div>}
          </div>
        )}

        <section className={panel}>
          <h3>Tracking {o.fromChina && <Badge variant="info">China → Nigeria</Badge>}</h3>
          <ol>
            {stages.map((s, i) => {
              const done = i <= o.stageIdx && !cancelled
              const now = i === o.stageIdx && !cancelled
              return (
                <motion.li key={s.key} className="flex min-h-[58px] gap-3.5" aria-current={now ? 'step' : undefined} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                  <div className="flex w-[34px] flex-col items-center">
                    <motion.span className={cn('grid size-[34px] shrink-0 place-items-center rounded-full border-2 border-line bg-background text-[16px] text-[#b8c0cf]', done && 'border-brand bg-brand-tint text-brand', now && 'border-orange bg-[#fff4ea] text-orange')} animate={now ? { scale: [1, 1.25, 1], boxShadow: ['0 0 0 0 rgba(255,122,46,.5)', '0 0 0 10px rgba(255,122,46,0)', '0 0 0 0 rgba(255,122,46,0)'] } : {}} transition={{ repeat: Infinity, duration: 1.8 }}><Icon name={s.icon} size={16} /></motion.span>
                    {i < stages.length - 1 && <span className="my-[3px] block w-[3px] flex-1 overflow-hidden rounded-[2px] bg-line"><motion.span className="block size-full origin-top bg-brand" initial={{ scaleY: 0 }} animate={{ scaleY: i < o.stageIdx && !cancelled ? 1 : 0 }} transition={{ duration: 0.5, delay: 0.2 + i * 0.08 }} /></span>}
                  </div>
                  <div className={cn('pb-3 pt-[5px] text-[14px] text-muted-foreground', done && 'text-ink')}>
                    <b className={cn(now && 'text-orange')}>{s.label}</b>
                    {done && <div className="text-[13px]">{s.desc}</div>}
                    {evAt(i) && done && <div className="text-[13px] text-muted-foreground">{fmt(evAt(i))}</div>}
                  </div>
                </motion.li>
              )
            })}
          </ol>
        </section>

        <section className={panel}>
          <h3>Items</h3>
          <ul className="my-3 flex flex-col gap-2.5">
            {o.items.map((it) => <li key={it.id + it.color + it.size} className="flex items-center gap-3 text-[14px]"><MiniArt it={it} /><Link to={`/p/${it.id}`} className="min-w-0 flex-1 truncate">{it.qty} × {it.title}{it.color ? ` · ${it.color}` : ''}{it.size ? ` · ${it.size}` : ''}</Link><b>{naira(it.unitPrice * it.qty)}</b></li>)}
          </ul>
          <div className={sumRow}><span>Subtotal</span><span>{naira(o.subtotal)}</span></div>
          {o.discount > 0 && <div className={cn(sumRow, 'text-good')}><span>Discounts</span><span>−{naira(o.discount)}</span></div>}
          <div className={sumRow}><span>Delivery</span><span>{o.shipping ? naira(o.shipping) : 'FREE'}</span></div>
          <div className="mt-1 flex items-baseline justify-between overflow-hidden border-t border-dashed border-line pt-3 font-bold"><span>Paid</span><b className="inline-block font-display text-[26px]">{naira(o.total)}</b></div>
          <div className="text-[13px] text-muted-foreground">Deliver to {o.address.name}, {o.address.line}, {o.address.state}</div>
        </section>

        <div className="mt-[18px] flex flex-wrap gap-2.5">
          {canCancel && <Button variant="outline" onClick={() => setConfirmCancel(true)}>Cancel order</Button>}
          {delivered && <Button onClick={() => nav(`/help?order=${o.ref}&type=return`)}>Return or report a problem</Button>}
          <Button variant="outline" onClick={() => nav(`/help?order=${o.ref}`)}>Get help with this order</Button>
        </div>
      </div>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent className="tw z-90 w-[min(440px,calc(100vw-32px))] max-w-none gap-0 rounded-lg border-0 p-6 shadow-lift sm:max-w-none" overlayClassName="z-80">
          <AlertDialogHeader className="gap-0 text-left sm:text-left">
            <AlertDialogTitle className="mb-3 font-display text-[19px] font-bold leading-[1.15]">Cancel this order?</AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] text-ink-2">You'll be refunded {naira(o.total)} in full to your original payment method (3–5 working days).</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2.5">
            <AlertDialogCancel>Keep order</AlertDialogCancel>
            <AlertDialogAction variant="destructive" size="md" className="rounded-full" onClick={cancel}>Cancel order</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  )
}
