import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/Store'
import { Page, ProductArt, Empty, Rail, SectionHead, StockBadge } from '../components/ui'
import { Icon } from '../components/Icon'
import { naira, shippingFee, couponDiscount, bundleSaving, findCoupon, FREE_SHIP_THRESHOLD, relatedProducts, windowLabel } from '../lib/commerce'

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
    <motion.div className="coupon-on" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
      <span className="row-ico"><Icon name="Ticket" size={16} className="accent" /><span><b>{state.coupon.code}</b> — {state.coupon.label}</span></span>
      <button className="link" onClick={() => dispatch({ type: 'applyCoupon', coupon: null })}>Remove</button>
    </motion.div>
  ) : (
    <form className="coupon-form" onSubmit={apply}>
      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon code (try OJA10)" aria-label="Coupon code" />
      <button className="btn btn-ghost sm" type="submit">Apply</button>
      {err && <motion.div className="err small" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>{err}</motion.div>}
    </form>
  )
}

export function Summary({ t, children }) {
  const minNote = t.coupon && t.couponOff === 0 && t.coupon.type !== 'ship' ? `Spend ${naira(t.coupon.min)} to use ${t.coupon.code}` : null
  const toFree = FREE_SHIP_THRESHOLD - (t.subtotal - t.bundle)
  return (
    <div className="summary">
      <h3>Order summary</h3>
      {t.shipping > 0 && toFree > 0 && (
        <div className="freeship">
          <div className="small">Add <b>{naira(toFree)}</b> more for free delivery</div>
          <div className="bar"><motion.span animate={{ width: `${Math.min(100, ((t.subtotal - t.bundle) / FREE_SHIP_THRESHOLD) * 100)}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} /></div>
        </div>
      )}
      <div className="sum-row"><span>Items ({t.lines.reduce((n, l) => n + l.qty, 0)})</span><span>{naira(t.subtotal)}</span></div>
      {t.bundle > 0 && <div className="sum-row good"><span>Buy-more-save-more</span><span>−{naira(t.bundle)}</span></div>}
      {t.couponOff > 0 && <div className="sum-row good"><span>Coupon {t.coupon.code}</span><span>−{naira(t.couponOff)}</span></div>}
      {minNote && <div className="small muted">{minNote}</div>}
      <div className="sum-row"><span>Delivery to {t.lines.length ? '' : ''}</span><span>{t.shipping === 0 ? <b className="good">FREE</b> : naira(t.shipping)}</span></div>
      <div className="sum-row muted small"><span>Import duties & clearing</span><span>Included</span></div>
      <div className="sum-total">
        <span>Total</span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.b key={t.total} initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>{naira(t.total)}</motion.b>
        </AnimatePresence>
      </div>
      {t.savings > 0 && <div className="savings row-ico"><Icon name="PartyPopper" size={16} /> You're saving {naira(t.savings)}</div>}
      {children}
    </div>
  )
}

export default function Cart() {
  const { state, dispatch, getProduct, toast } = useStore()
  const nav = useNavigate()
  const t = useTotals()
  const saved = state.saved.map((l) => ({ ...l, p: getProduct(l.id) })).filter((l) => l.p)
  const recs = t.lines.length ? relatedProducts(t.lines[0].p, 10).filter((x) => !state.cart.some((l) => l.id === x.id)).map((x) => getProduct(x.id)) : []

  return (
    <Page>
      <div className="wrap">
        <h1 className="page-title">Your cart</h1>
        {t.lines.length === 0 ? (
          <Empty icon="ShoppingCart" title="Your cart is empty" body="Thousands of affordable finds are waiting." action={<Link to="/" className="btn btn-primary">Start shopping</Link>} />
        ) : (
          <div className="cart-layout">
            <div>
              {t.invalid.length > 0 && <div className="alert row-ico"><Icon name="TriangleAlert" size={16} /> {t.invalid.length} item(s) are no longer available. Remove them to continue.</div>}
              <motion.ul layout className="cart-list">
                <AnimatePresence initial={false}>
                  {t.lines.map((l) => {
                    const save = bundleSaving(l, l.p)
                    return (
                      <motion.li layout key={l.key} className="cart-line" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, x: -80, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }} transition={{ duration: 0.3 }}>
                        <Link to={`/p/${l.p.id}`}><ProductArt p={l.p} size="sm" /></Link>
                        <div className="cl-info">
                          <Link to={`/p/${l.p.id}`} className="cl-title">{l.p.title}</Link>
                          <div className="muted small">{[l.color, l.size].filter(Boolean).join(' · ')}</div>
                          <div className="cl-badges"><StockBadge stock={l.p.stock} />{l.p.stock !== 'oos' && <span className="small muted">Arrives {windowLabel(l.p.stock, state.deliveryState)}</span>}</div>
                          {save > 0 && <div className="small good">3+ discount: −{naira(save)}</div>}
                          <div className="cl-actions">
                            <div className="qty sm">
                              <button onClick={() => dispatch({ type: 'setQty', key: l.key, qty: l.qty - 1 })} disabled={l.qty <= 1} aria-label="Decrease">−</button>
                              <AnimatePresence mode="popLayout" initial={false}><motion.span key={l.qty} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }}>{l.qty}</motion.span></AnimatePresence>
                              <button onClick={() => dispatch({ type: 'setQty', key: l.key, qty: l.qty + 1 })} disabled={l.qty >= 10 || (l.p.stock === 'nigeria' && l.qty >= l.p.qty)} aria-label="Increase">+</button>
                            </div>
                            <button className="link small" onClick={() => { dispatch({ type: 'saveForLater', key: l.key }); toast('Saved for later', { icon: 'Bookmark' }) }}>Save for later</button>
                            <button className="link small danger" onClick={() => dispatch({ type: 'removeLine', key: l.key })}>Remove</button>
                          </div>
                        </div>
                        <div className="cl-price">
                          <b>{naira(l.p.price * l.qty)}</b>
                          {l.qty > 1 && <div className="muted small">{naira(l.p.price)} each</div>}
                        </div>
                      </motion.li>
                    )
                  })}
                </AnimatePresence>
              </motion.ul>

              {saved.length > 0 && (
                <section>
                  <SectionHead title={`Saved for later (${saved.length})`} />
                  <ul className="cart-list">
                    {saved.map((l) => (
                      <motion.li layout key={l.key} className="cart-line compact">
                        <ProductArt p={l.p} size="sm" />
                        <div className="cl-info"><div className="cl-title">{l.p.title}</div><div className="muted small">{naira(l.p.price)}</div></div>
                        <button className="btn btn-ghost sm" onClick={() => dispatch({ type: 'moveToCart', key: l.key })}>Move to cart</button>
                      </motion.li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
            <aside className="cart-side">
              <Summary t={t}>
                <CouponBox />
                <motion.button whileTap={{ scale: 0.97 }} className="btn btn-primary lg block" disabled={t.invalid.length > 0} onClick={() => nav('/checkout')}>Checkout · {naira(t.total)}</motion.button>
                <div className="secure small muted row-ico"><Icon name="Lock" size={13} /> Secure checkout · payment verified server-side</div>
              </Summary>
            </aside>
          </div>
        )}

        {recs.length > 0 && (
          <section>
            <SectionHead title="Complete your order" kicker="Customers also added" />
            <Rail products={recs} />
          </section>
        )}
      </div>
    </Page>
  )
}
