import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/Store'
import { Page, ProductArt, Empty, Rail, SectionHead, StockBadge, wrap, linkCls } from '../components/common'
import { Icon } from '../components/Icon'
import { naira, shippingFee, couponDiscount, bundleSaving, findCoupon, FREE_SHIP_THRESHOLD, relatedProducts, windowLabel } from '../lib/commerce'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const rowIco = 'inline-flex items-center gap-1.5'
// Text inputs in the storefront (cart, checkout)
export const fieldCls = 'h-auto rounded-lg border-[1.5px] border-line bg-white px-3 py-[9px] text-[length:inherit] shadow-none outline-none focus-visible:border-brand focus-visible:ring-0 md:text-[length:inherit]'

export function useTotals() {
  const { state, getProduct } = useStore()
  return useMemo(() => {
    const lines = state.cart.map((l) => ({ ...l, p: getProduct(l.id) })).filter((l) => l.p)
    const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0)
    const refTotal = lines.reduce((s, l) => s + (l.p.refPrice || l.p.price) * l.qty, 0)
    const bundle = lines.reduce((s, l) => s + bundleSaving(l, l.p), 0)
    const coupon = state.coupon
    const couponOff = couponDiscount(coupon, subtotal - bundle)
    const shipping = lines.length ? shippingFee(state.deliveryState, subtotal - bundle, coupon) : 0
    const total = subtotal - bundle - couponOff + shipping
    const invalid = lines.filter((l) => l.p.stock === 'oos' || !l.p.published)
    return { lines, subtotal, refTotal, bundle, coupon, couponOff, shipping, total, invalid, savings: refTotal - subtotal + bundle + couponOff }
  }, [state.cart, state.coupon, state.deliveryState, getProduct])
}

export function CouponBox() {
  const { state, dispatch, toast } = useStore()
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const apply = (e) => {
    e.preventDefault()
    const c = findCoupon(code, state.admin.coupons || {})
    if (!c) return setErr('That code isn\'t valid.')
    if (state.admin.paused?.[c.code]) return setErr(`${c.code} isn\'t running right now.`)
    if (c.start && Date.now() < c.start) return setErr(`${c.code} starts on ${new Date(c.start).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}.`)
    if (c.end && Date.now() > c.end) return setErr(`${c.code} has ended.`)
    if ((c.code === 'OJA10' || c.firstOrder) && state.usedFirstOrder) return setErr(`${c.code} is for first orders only.`)
    setErr(''); setCode('')
    dispatch({ type: 'applyCoupon', coupon: c })
    toast(`${c.code} applied`, { icon: 'Ticket' })
  }
  return state.coupon ? (
    <motion.div className="flex items-center justify-between gap-2.5 rounded-lg border-[1.5px] border-dashed border-orange bg-[#fff6ee] px-3 py-2 text-[13px]" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
      <span className={rowIco}><Icon name="Ticket" size={16} className="text-orange" /><span><b>{state.coupon.code}</b> — {state.coupon.label}</span></span>
      <button className={linkCls} onClick={() => dispatch({ type: 'applyCoupon', coupon: null })}>Remove</button>
    </motion.div>
  ) : (
    <form className="flex flex-wrap gap-2" onSubmit={apply}>
      <Input className={cn(fieldCls, 'w-auto min-w-0 flex-1')} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon code (try OJA10)" aria-label="Coupon code" aria-invalid={!!err || undefined} />
      <Button variant="outline" size="sm" type="submit">Apply</Button>
      {err && <motion.div className="w-full text-[13px] text-bad" role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>{err}</motion.div>}
    </form>
  )
}

const sumRow = 'flex justify-between text-[14px]'

export function Summary({ t, children }) {
  const minNote = t.coupon && t.couponOff === 0 && t.coupon.type !== 'ship' ? `Spend ${naira(t.coupon.min)} to use ${t.coupon.code}` : null
  const toFree = FREE_SHIP_THRESHOLD - (t.subtotal - t.bundle)
  return (
    <div className="tw flex flex-col gap-2.5 rounded-lg bg-white p-5 shadow-card">
      <h3 className="mb-0">Order summary</h3>
      {t.shipping > 0 && toFree > 0 && (
        <div className="flex flex-col gap-1.5 rounded-lg bg-background px-3 py-2.5">
          <div className="text-[13px]">Add <b>{naira(toFree)}</b> more for free delivery</div>
          <div className="block h-2 overflow-hidden rounded-[4px] bg-background"><motion.span className="block h-full rounded-[4px] bg-[linear-gradient(90deg,var(--color-brand),var(--color-orange))]" animate={{ width: `${Math.min(100, ((t.subtotal - t.bundle) / FREE_SHIP_THRESHOLD) * 100)}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} /></div>
        </div>
      )}
      <div className={sumRow}><span>Items ({t.lines.reduce((n, l) => n + l.qty, 0)})</span><span>{naira(t.subtotal)}</span></div>
      {t.bundle > 0 && <div className={cn(sumRow, 'text-good')}><span>Buy-more-save-more</span><span>−{naira(t.bundle)}</span></div>}
      {t.couponOff > 0 && <div className={cn(sumRow, 'text-good')}><span>Coupon {t.coupon.code}</span><span>−{naira(t.couponOff)}</span></div>}
      {minNote && <div className="text-[13px] text-muted-foreground">{minNote}</div>}
      <div className={sumRow}><span>Delivery to {t.lines.length ? '' : ''}</span><span>{t.shipping === 0 ? <b className="text-good">FREE</b> : naira(t.shipping)}</span></div>
      <div className={cn(sumRow, 'text-muted-foreground')}><span>Import duties & clearing</span><span>Included</span></div>
      <div className="mt-1 flex items-baseline justify-between overflow-hidden border-t border-dashed border-line pt-3 font-bold">
        <span>Total</span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.b key={t.total} className="inline-block font-display text-[26px]" initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>{naira(t.total)}</motion.b>
        </AnimatePresence>
      </div>
      {t.savings > 0 && <div className={cn(rowIco, 'rounded-lg bg-good-tint px-3 py-2 text-center text-[13.5px] font-semibold text-good')}><Icon name="PartyPopper" size={16} /> You're saving {naira(t.savings)}</div>}
      {children}
    </div>
  )
}

const line = 'flex gap-3.5 overflow-hidden rounded-lg bg-white p-3.5 shadow-card'
const qtyBtn = 'size-8 text-[16px] not-disabled:hover:bg-background'

export default function Cart() {
  const { state, dispatch, getProduct, toast } = useStore()
  const nav = useNavigate()
  const t = useTotals()
  const saved = state.saved.map((l) => ({ ...l, p: getProduct(l.id) })).filter((l) => l.p)
  const recs = t.lines.length ? relatedProducts(t.lines[0].p, 10).filter((x) => !state.cart.some((l) => l.id === x.id)).map((x) => getProduct(x.id)) : []

  return (
    <Page className="tw">
      <div className={wrap}>
        <h1 className="mb-4 mt-[22px]">Your cart</h1>
        {t.lines.length === 0 ? (
          <Empty icon="ShoppingCart" title="Your cart is empty" body="Thousands of affordable finds are waiting." action={<Button asChild><Link to="/">Start shopping</Link></Button>} />
        ) : (
          <div className="grid grid-cols-[1fr_360px] items-start gap-6 max-md:grid-cols-1">
            <div>
              {t.invalid.length > 0 && <div role="alert" className={cn(rowIco, 'mb-3 rounded-lg border border-[#ffdd99] bg-warn-tint px-4 py-3 text-[14px] text-[#7a4a00]')}><Icon name="TriangleAlert" size={16} /> {t.invalid.length} item(s) are no longer available. Remove them to continue.</div>}
              <motion.ul layout className="flex flex-col gap-3">
                <AnimatePresence initial={false}>
                  {t.lines.map((l) => {
                    const save = bundleSaving(l, l.p)
                    return (
                      <motion.li layout key={l.key} className={cn(line, 'max-sm:flex-wrap')} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, x: -80, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }} transition={{ duration: 0.3 }}>
                        <Link to={`/p/${l.p.id}`}><ProductArt p={l.p} size="sm" /></Link>
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <Link to={`/p/${l.p.id}`} className="text-[14.5px] font-semibold hover:text-brand">{l.p.title}</Link>
                          <div className="text-[13px] text-muted-foreground">{[l.color, l.size].filter(Boolean).join(' · ')}</div>
                          <div className="flex flex-wrap items-center gap-1.5"><StockBadge stock={l.p.stock} />{l.p.stock !== 'oos' && <span className="text-[13px] text-muted-foreground">Arrives {windowLabel(l.p.stock, state.deliveryState)}</span>}</div>
                          {save > 0 && <div className="text-[13px] text-good">3+ discount: −{naira(save)}</div>}
                          <div className="mt-1.5 flex flex-wrap items-center gap-3.5">
                            <div className="inline-flex items-center overflow-hidden rounded-full border-[1.5px] border-line bg-white">
                              <button className={qtyBtn} onClick={() => dispatch({ type: 'setQty', key: l.key, qty: l.qty - 1 })} disabled={l.qty <= 1} aria-label="Decrease">−</button>
                              <AnimatePresence mode="popLayout" initial={false}><motion.span key={l.qty} className="inline-block min-w-[34px] text-center font-bold" initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }}>{l.qty}</motion.span></AnimatePresence>
                              <button className={qtyBtn} onClick={() => dispatch({ type: 'setQty', key: l.key, qty: l.qty + 1 })} disabled={l.qty >= 10 || (l.p.stock === 'nigeria' && l.qty >= l.p.qty)} aria-label="Increase">+</button>
                            </div>
                            <button className={cn(linkCls, 'text-[13px]')} onClick={() => { dispatch({ type: 'saveForLater', key: l.key }); toast('Saved for later', { icon: 'Bookmark' }) }}>Save for later</button>
                            <button className={cn(linkCls, 'text-[13px] text-bad decoration-[rgba(214,69,69,.3)]')} onClick={() => dispatch({ type: 'removeLine', key: l.key })}>Remove</button>
                          </div>
                        </div>
                        <div className="text-right font-display text-[17px] max-sm:w-full max-sm:text-left">
                          <b>{naira(l.p.price * l.qty)}</b>
                          {l.qty > 1 && <div className="text-[13px] text-muted-foreground">{naira(l.p.price)} each</div>}
                        </div>
                      </motion.li>
                    )
                  })}
                </AnimatePresence>
              </motion.ul>

              {saved.length > 0 && (
                <section className="mt-10">
                  <SectionHead title={`Saved for later (${saved.length})`} />
                  <ul className="flex flex-col gap-3">
                    {saved.map((l) => (
                      <motion.li layout key={l.key} className={cn(line, 'items-center max-sm:flex-wrap')}>
                        <ProductArt p={l.p} size="sm" />
                        <div className="flex min-w-0 flex-1 flex-col gap-1"><div className="text-[14.5px] font-semibold">{l.p.title}</div><div className="text-[13px] text-muted-foreground">{naira(l.p.price)}</div></div>
                        <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'moveToCart', key: l.key })}>Move to cart</Button>
                      </motion.li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
            <aside className="sticky top-[160px] max-md:static">
              <Summary t={t}>
                <CouponBox />
                <Button asChild size="lg" className="w-full"><motion.button whileTap={{ scale: 0.97 }} disabled={t.invalid.length > 0} onClick={() => nav('/checkout')}>Checkout · {naira(t.total)}</motion.button></Button>
                <div className={cn(rowIco, 'text-center text-[13px] text-muted-foreground')}><Icon name="Lock" size={13} /> Secure checkout · payment verified server-side</div>
              </Summary>
            </aside>
          </div>
        )}

        {recs.length > 0 && (
          <section className="mt-10">
            <SectionHead title="Complete your order" kicker="Customers also added" />
            <Rail products={recs} />
          </section>
        )}
      </div>
    </Page>
  )
}
