import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/Store'
import { Page, ProductArt, Empty, wrap, linkCls } from '../components/common'
import { useTotals, Summary, CouponBox, fieldCls } from './Cart'
import { Icon } from '../components/Icon'
import { naira, windowLabel, STATES, makeOrderRef, deliveryWindow } from '../lib/commerce'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'

const METHODS = [
  { id: 'card', label: 'Debit card', sub: 'Verve, Mastercard, Visa · via Paystack', ico: 'CreditCard' },
  { id: 'transfer', label: 'Bank transfer', sub: 'Pay to a one-time account number', ico: 'Landmark' },
  { id: 'ussd', label: 'USSD', sub: '*737#, *894#, *919# and more', ico: 'Hash' },
  { id: 'flutterwave', label: 'Flutterwave', sub: 'Card, bank or mobile money', ico: 'Wallet' },
]
const STEPS = ['Delivery', 'Review']

function Stepper({ step }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      {STEPS.map((s, i) => (
        <div key={s} className={cn('flex items-center gap-2 text-[14px] font-semibold text-muted-foreground', i <= step && 'text-ink')} aria-current={i === step ? 'step' : undefined}>
          <motion.span className={cn('grid size-7 place-items-center rounded-full bg-line text-[13px] text-ink-2', i <= step && 'bg-brand text-white')} animate={{ scale: i === step ? 1.12 : 1 }}>{i < step ? <Icon name="Check" size={15} stroke={2.6} /> : i + 1}</motion.span>
          <span>{s}</span>
          {i < STEPS.length - 1 && <span className="block h-[3px] w-[60px] overflow-hidden rounded-[2px] bg-line max-sm:w-5"><motion.span className="block h-full origin-left bg-brand" initial={false} animate={{ scaleX: i < step ? 1 : 0 }} transition={{ duration: 0.4 }} /></span>}
        </div>
      ))}
    </div>
  )
}

// Shared look of the storefront pop-ups (was .modal)
const modal = 'tw z-90 max-w-none rounded-lg border-0 bg-white p-6 shadow-lift sm:max-w-none'

function PaymentFlow({ open, method, total, onDone }) {
  const [phase, setPhase] = useState(0)
  const phases = [
    { t: method === 'transfer' ? 'Generating your account number…' : 'Connecting to payment gateway…', ico: 'Link' },
    { t: 'Waiting for bank confirmation…', ico: 'Landmark' },
    { t: 'Verifying payment on our server…', ico: 'ShieldCheck' },
    { t: 'Payment confirmed', ico: 'CircleCheck' },
  ]
  useEffect(() => {
    if (!open) return
    const ts = [900, 2000, 3200, 4000].map((ms, i) => setTimeout(() => (i < 3 ? setPhase(i + 1) : onDone()), ms))
    return () => ts.forEach(clearTimeout)
  }, [open]) // eslint-disable-line
  // Can't be dismissed: the payment is in progress
  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} overlayClassName="z-80" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}
        className={cn(modal, 'block w-[min(440px,calc(100vw-32px))] text-center')}>
        <DialogTitle className="sr-only">Processing your payment</DialogTitle>
        <div className="mb-4 font-display text-[34px] font-extrabold">{naira(total)}</div>
        <div className="mb-3.5 flex flex-col gap-3 text-left" aria-live="polite">
          {phases.map((p, i) => (
            <motion.div key={i} className={cn('flex items-center gap-3 text-[15px]', i === phase && 'font-semibold')} initial={{ opacity: 0, x: -10 }} animate={{ opacity: i <= phase ? 1 : 0.35, x: 0 }} transition={{ delay: i * 0.05 }}>
              <span className={cn('grid size-[26px] place-items-center rounded-full bg-background text-[13px] text-muted-foreground', i < phase && 'bg-brand text-white')}>{i < phase || (i === 3 && phase === 3) ? <Icon name="Check" size={14} stroke={2.8} /> : i === phase ? <motion.span className="block size-4 rounded-full border-[2.5px] border-line border-t-orange" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} /> : <Icon name={p.ico} size={14} />}</span>
              <span>{p.t}</span>
            </motion.div>
          ))}
        </div>
        <DialogDescription className="my-[1em] text-[13px] text-muted-foreground">Your order is only confirmed after our server verifies the payment with the gateway — never from a redirect alone.</DialogDescription>
      </DialogContent>
    </Dialog>
  )
}

// Payment comes after the review step: shoppers confirm the order first, then pick how to pay
function PaymentChooser({ open, method, setMethod, total, onCancel, onPay }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent showCloseButton={false} overlayClassName="z-80"
        className={cn(modal, 'grid max-h-[calc(100dvh-32px)] w-[min(620px,calc(100vw-32px))] gap-3.5 overflow-y-auto')}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <DialogTitle className="mb-3 font-display text-[22px] font-bold leading-[1.15]">Payment</DialogTitle>
            <DialogDescription className="mt-0.5 text-[13px] text-muted-foreground">Choose how you'd like to pay {naira(total)}</DialogDescription>
          </div>
          <Button variant="icon" onClick={onCancel} aria-label="Close"><Icon name="X" size={20} /></Button>
        </div>
        <RadioGroup value={method} onValueChange={setMethod} aria-label="Payment method" className="grid grid-cols-2 gap-2.5 max-sm:grid-cols-1">
          {METHODS.map((m) => {
            const on = method === m.id
            return (
              <motion.label key={m.id} className={cn('relative flex cursor-pointer items-center gap-3 rounded-lg border-[1.5px] border-line p-3.5 text-[14px] has-focus-visible:ring-[3px] has-focus-visible:ring-brand/20', on && 'border-brand bg-[#f2f5fb]')} whileTap={{ scale: 0.98 }}>
                <RadioGroupItem value={m.id} className="absolute opacity-0" />
                <span className={cn('grid size-[42px] shrink-0 place-items-center rounded-lg bg-background text-brand', on && 'bg-brand-tint')}><Icon name={m.ico} size={22} /></span>
                <div><b>{m.label}</b><div className="text-[13px] text-muted-foreground">{m.sub}</div></div>
                {on && <motion.span layoutId="method-check" className="absolute right-2.5 top-2.5 grid size-[22px] place-items-center rounded-full bg-brand text-[12px] text-white"><Icon name="Check" size={13} stroke={3} /></motion.span>}
              </motion.label>
            )
          })}
        </RadioGroup>
        <p className="text-[13px] text-muted-foreground">All amounts are charged in Naira (NGN). Oja never stores your card details.</p>
        <div className="flex flex-wrap justify-end gap-2.5">
          <Button variant="outline" className="max-xs:flex-1" onClick={onCancel}>Back to review</Button>
          <Button asChild variant="accent" size="lg" className="max-xs:flex-1"><motion.button whileTap={{ scale: 0.97 }} onClick={onPay}>Pay {naira(total)}</motion.button></Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const panel = 'mt-4 rounded-lg bg-white p-[22px] shadow-card'
const rowGap = 'flex flex-wrap items-center gap-2.5'
const inlineIco = 'mr-1 align-[-3px]'

export default function Checkout() {
  const { state, dispatch } = useStore()
  const nav = useNavigate()
  const t = useTotals()
  const [step, setStep] = useState(0)
  const [addrId, setAddrId] = useState(state.addresses.find((a) => a.default)?.id || state.addresses[0]?.id)
  const [adding, setAdding] = useState(state.addresses.length === 0)
  const [form, setForm] = useState({ name: state.user?.name || '', phone: '', line: '', state: state.deliveryState })
  const [phoneOk, setPhoneOk] = useState(false)
  const [method, setMethod] = useState('card')
  const [choosing, setChoosing] = useState(false)
  const [paying, setPaying] = useState(false)
  const idem = useRef(makeOrderRef()) // idempotency key = order ref; stable across double-clicks
  const placed = useRef(false)

  if (!t.lines.length && !paying) return <Page className="tw"><div className={wrap}><Empty icon="ReceiptText" title="Nothing to check out" action={<Button asChild><Link to="/">Browse products</Link></Button>} /></div></Page>

  const addr = state.addresses.find((a) => a.id === addrId)
  const phoneValid = /^0[789][01]\d{8}$/.test((form.phone || '').replace(/\s/g, ''))
  const saveAddr = (e) => {
    e.preventDefault()
    if (!form.name || !form.line || !phoneValid) return
    const a = { id: 'a' + Date.now(), ...form, default: state.addresses.length === 0 }
    dispatch({ type: 'addAddress', addr: a })
    setAddrId(a.id); setAdding(false); setPhoneOk(true)
  }
  const pickAddr = (id) => { const a = state.addresses.find((x) => x.id === id); setAddrId(a.id); dispatch({ type: 'setDeliveryState', state: a.state }) }
  const fromChina = t.lines.some((l) => l.p.stock !== 'nigeria')
  const slowest = t.lines.reduce((w, l) => (deliveryWindow(l.p.stock, addr?.state)[1] > deliveryWindow(w, addr?.state)[1] ? l.p.stock : w), 'nigeria')

  const finish = () => {
    if (placed.current) return
    placed.current = true
    const order = {
      ref: idem.current,
      items: t.lines.map((l) => ({ id: l.p.id, title: l.p.title, hue: l.p.hue, color: l.color, size: l.size, qty: l.qty, unitPrice: l.p.price })), // price snapshot
      fromChina,
      stageIdx: 1,
      events: [{ at: Date.now() - 4000, idx: 0 }, { at: Date.now(), idx: 1 }],
      subtotal: t.subtotal, discount: t.bundle + t.couponOff, shipping: t.shipping, total: t.total,
      coupon: t.coupon?.code || null,
      address: addr, payment: METHODS.find((m) => m.id === method).label,
      eta: windowLabel(slowest, addr.state),
      createdAt: Date.now(), status: 'active',
    }
    dispatch({ type: 'placeOrder', order })
    nav(`/orders/${order.ref}?new=1`, { replace: true })
  }

  return (
    <Page className="tw">
      <div className={wrap}>
        <h1 className="mb-4 mt-[22px]">Checkout</h1>
        <Stepper step={step} />
        <div className="grid grid-cols-[1fr_360px] items-start gap-6 max-md:grid-cols-1">
          <div>
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.section key="s0" className={panel} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                  <h3>Delivery address</h3>
                  <RadioGroup value={addrId || ''} onValueChange={pickAddr} aria-label="Delivery address" className="mb-3 flex flex-col gap-2.5">
                    {state.addresses.map((a) => (
                      <label key={a.id} className={cn('flex cursor-pointer items-center gap-3 rounded-lg border-[1.5px] border-line bg-white px-3.5 py-3 text-[14px]', addrId === a.id && 'border-brand bg-[#f2f5fb]')}>
                        <RadioGroupItem value={a.id} className="ml-[5px] mr-[3px] mt-[3px] size-[13px]" />
                        <div className="flex-1"><b>{a.name}</b> · {a.phone}<div className="text-[13px] text-muted-foreground">{a.line}, {a.state}</div></div>
                        {a.default && <Badge variant="info">Default</Badge>}
                      </label>
                    ))}
                  </RadioGroup>
                  <AnimatePresence>
                    {adding ? (
                      <motion.form key="f" className="flex flex-col gap-2.5 overflow-hidden p-0.5" onSubmit={saveAddr} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                        <Input className={fieldCls} placeholder="Full name" aria-label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        <Input className={fieldCls} placeholder="Phone (e.g. 08031234567)" aria-label="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required inputMode="tel" aria-invalid={(form.phone && !phoneValid) || undefined} />
                        {form.phone && !phoneValid && <div className="text-[13px] text-bad">Enter a valid Nigerian mobile number</div>}
                        <Input className={fieldCls} placeholder="Street address, area, landmark" aria-label="Street address" value={form.line} onChange={(e) => setForm({ ...form, line: e.target.value })} required />
                        <NativeSelect wrapperClassName="w-full" className={cn(fieldCls, 'pr-7 leading-[21px] max-sm:leading-[19px]')} iconClassName="right-3 text-ink opacity-70" aria-label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>{STATES.map((s) => <NativeSelectOption key={s}>{s}</NativeSelectOption>)}</NativeSelect>
                        <div className={rowGap}><Button size="sm" type="submit" disabled={!phoneValid}>Save address</Button>{state.addresses.length > 0 && <button type="button" className={linkCls} onClick={() => setAdding(false)}>Cancel</button>}</div>
                      </motion.form>
                    ) : <button className={linkCls} onClick={() => setAdding(true)}>+ Add a new address</button>}
                  </AnimatePresence>
                  {addr && (
                    <label className="mt-3.5 flex items-center gap-2.5 text-[14px]">
                      <Checkbox className="m-[3px] ml-1 size-[18px]" checked={phoneOk} onCheckedChange={(v) => setPhoneOk(v === true)} />
                      <span>Our rider can reach me on <b>{addr.phone}</b></span>
                    </label>
                  )}
                  {addr && <div className="mt-3.5 rounded-lg bg-background px-3.5 py-3 text-[14px]"><Icon name="Truck" size={16} className={cn(inlineIco, 'text-brand')} /> Estimated delivery to {addr.state}: <b>{windowLabel(slowest, addr.state)}</b>{fromChina && <div className="text-[13px] text-muted-foreground">Some items ship from our China warehouse — you'll get tracking at every step.</div>}</div>}
                  <Button size="lg" className="mt-3.5" disabled={!addr || !phoneOk} onClick={() => setStep(1)}>Continue to review</Button>
                </motion.section>
              )}
              {step === 1 && (
                <motion.section key="s1" className={panel} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                  <h3>Review your order</h3>
                  <div className="relative border-b border-line py-2.5 text-[14px]"><div className="text-[13px] text-muted-foreground">Deliver to</div><b>{addr.name}</b> · {addr.phone}<div>{addr.line}, {addr.state}</div><button className={cn(linkCls, 'absolute right-0 top-3 text-[13px]')} onClick={() => setStep(0)}>Change</button></div>
                  <ul className="my-3 flex flex-col gap-2.5">
                    {t.lines.map((l) => (
                      <li key={l.key} className="flex items-center gap-3 text-[14px]"><ProductArt p={l.p} size="xs" /><span className="min-w-0 flex-1 truncate">{l.qty} × {l.p.title}</span><b>{naira(l.p.price * l.qty)}</b></li>
                    ))}
                  </ul>
                  <div className="my-3 rounded-lg bg-brand-tint px-3.5 py-3 text-[14px] text-brand"><Icon name="CircleCheck" size={16} className={inlineIco} /> The total below is the <b>final amount</b>. It already includes international freight, customs duties and clearing. No charges on delivery.</div>
                  <div className={rowGap}><Button variant="outline" onClick={() => setStep(0)}>Back</Button>
                    <Button asChild variant="accent" size="lg"><motion.button whileTap={{ scale: 0.97 }} disabled={paying} onClick={() => setChoosing(true)}>Continue to payment · {naira(t.total)}</motion.button></Button>
                  </div>
                  <div className="mt-4 text-[13px] text-muted-foreground">Order reference: <code className="rounded-[6px] bg-[#eef1f6] px-1.5 py-0.5 text-[13px]">{idem.current}</code></div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>
          <aside className="sticky top-[160px] max-md:static">
            <Summary t={t}><CouponBox /></Summary>
          </aside>
        </div>
      </div>
      <PaymentChooser open={choosing} method={method} setMethod={setMethod} total={t.total} onCancel={() => setChoosing(false)} onPay={() => { setChoosing(false); setPaying(true) }} />
      <PaymentFlow open={paying} method={method} total={t.total} onDone={finish} />
    </Page>
  )
}
