import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/Store'
import { Page, ProductArt, Empty, spring } from '../components/ui'
import { useTotals, Summary, CouponBox } from './Cart'
import { Icon } from '../components/Icon'
import { naira, windowLabel, STATES, makeOrderRef, deliveryWindow } from '../lib/commerce'

const METHODS = [
  { id: 'card', label: 'Debit card', sub: 'Verve, Mastercard, Visa · via Paystack', ico: 'CreditCard' },
  { id: 'transfer', label: 'Bank transfer', sub: 'Pay to a one-time account number', ico: 'Landmark' },
  { id: 'ussd', label: 'USSD', sub: '*737#, *894#, *919# and more', ico: 'Hash' },
  { id: 'flutterwave', label: 'Flutterwave', sub: 'Card, bank or mobile money', ico: 'Wallet' },
]
const STEPS = ['Delivery', 'Review']

function Stepper({ step }) {
  return (
    <div className="stepper">
      {STEPS.map((s, i) => (
        <div key={s} className={`step ${i <= step ? 'done' : ''}`}>
          <motion.span className="step-n" animate={{ scale: i === step ? 1.12 : 1 }}>{i < step ? <Icon name="Check" size={15} stroke={2.6} /> : i + 1}</motion.span>
          <span>{s}</span>
          {i < STEPS.length - 1 && <span className="step-line"><motion.span initial={false} animate={{ scaleX: i < step ? 1 : 0 }} transition={{ duration: 0.4 }} /></span>}
        </div>
      ))}
    </div>
  )
}

function PaymentFlow({ method, total, onDone }) {
  const [phase, setPhase] = useState(0)
  const phases = [
    { t: method === 'transfer' ? 'Generating your account number…' : 'Connecting to payment gateway…', ico: 'Link' },
    { t: 'Waiting for bank confirmation…', ico: 'Landmark' },
    { t: 'Verifying payment on our server…', ico: 'ShieldCheck' },
    { t: 'Payment confirmed', ico: 'CircleCheck' },
  ]
  useEffect(() => {
    const ts = [900, 2000, 3200, 4000].map((ms, i) => setTimeout(() => (i < 3 ? setPhase(i + 1) : onDone()), ms))
    return () => ts.forEach(clearTimeout)
  }, []) // eslint-disable-line
  return (
    <>
      <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      <motion.div className="modal pay-modal" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={spring}>
        <div className="pay-amount">{naira(total)}</div>
        <div className="pay-phases">
          {phases.map((p, i) => (
            <motion.div key={i} className={`pay-phase ${i < phase ? 'ok' : i === phase ? 'now' : ''}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: i <= phase ? 1 : 0.35, x: 0 }} transition={{ delay: i * 0.05 }}>
              <span className="pp-ico">{i < phase || (i === 3 && phase === 3) ? <Icon name="Check" size={14} stroke={2.8} /> : i === phase ? <motion.span className="spinner" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} /> : <Icon name={p.ico} size={14} />}</span>
              <span>{p.t}</span>
            </motion.div>
          ))}
        </div>
        <p className="small muted">Your order is only confirmed after our server verifies the payment with the gateway — never from a redirect alone.</p>
      </motion.div>
    </>
  )
}

// Payment comes after the review step: shoppers confirm the order first, then pick how to pay
function PaymentChooser({ method, setMethod, total, onCancel, onPay }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onCancel])
  return createPortal(
    <>
      <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} />
      <motion.div className="modal pay-choose" role="dialog" aria-modal="true" aria-labelledby="pay-title" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={spring}>
        <div className="pay-choose-head">
          <div><h3 id="pay-title">Payment</h3><p className="muted small">Choose how you'd like to pay {naira(total)}</p></div>
          <button className="icon-btn" onClick={onCancel} aria-label="Close"><Icon name="X" size={20} /></button>
        </div>
        <div className="methods">
          {METHODS.map((m) => (
            <motion.label key={m.id} className={`method ${method === m.id ? 'on' : ''}`} whileTap={{ scale: 0.98 }}>
              <input type="radio" name="pay-method" checked={method === m.id} onChange={() => setMethod(m.id)} />
              <span className="method-ico"><Icon name={m.ico} size={22} /></span>
              <div><b>{m.label}</b><div className="muted small">{m.sub}</div></div>
              {method === m.id && <motion.span layoutId="method-check" className="method-check"><Icon name="Check" size={13} stroke={3} /></motion.span>}
            </motion.label>
          ))}
        </div>
        <p className="small muted">All amounts are charged in Naira (NGN). Oja never stores your card details.</p>
        <div className="pay-choose-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Back to review</button>
          <motion.button whileTap={{ scale: 0.97 }} className="btn btn-accent lg" onClick={onPay}>Pay {naira(total)}</motion.button>
        </div>
      </motion.div>
    </>
  , document.body)
}

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

  if (!t.lines.length && !paying) return <Page><div className="wrap"><Empty icon="ReceiptText" title="Nothing to check out" action={<Link className="btn btn-primary" to="/">Browse products</Link>} /></div></Page>

  const addr = state.addresses.find((a) => a.id === addrId)
  const phoneValid = /^0[789][01]\d{8}$/.test((form.phone || '').replace(/\s/g, ''))
  const saveAddr = (e) => {
    e.preventDefault()
    if (!form.name || !form.line || !phoneValid) return
    const a = { id: 'a' + Date.now(), ...form, default: state.addresses.length === 0 }
    dispatch({ type: 'addAddress', addr: a })
    setAddrId(a.id); setAdding(false); setPhoneOk(true)
  }
  const pickAddr = (a) => { setAddrId(a.id); dispatch({ type: 'setDeliveryState', state: a.state }) }
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
    <Page>
      <div className="wrap">
        <h1 className="page-title">Checkout</h1>
        <Stepper step={step} />
        <div className="cart-layout">
          <div>
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.section key="s0" className="panel" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                  <h3>Delivery address</h3>
                  <div className="addr-list">
                    {state.addresses.map((a) => (
                      <label key={a.id} className={`addr ${addrId === a.id ? 'on' : ''}`}>
                        <input type="radio" checked={addrId === a.id} onChange={() => pickAddr(a)} />
                        <div><b>{a.name}</b> · {a.phone}<div className="muted small">{a.line}, {a.state}</div></div>
                        {a.default && <span className="badge badge-info">Default</span>}
                      </label>
                    ))}
                  </div>
                  <AnimatePresence>
                    {adding ? (
                      <motion.form key="f" className="addr-form" onSubmit={saveAddr} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                        <input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        <input placeholder="Phone (e.g. 08031234567)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required inputMode="tel" />
                        {form.phone && !phoneValid && <div className="err small">Enter a valid Nigerian mobile number</div>}
                        <input placeholder="Street address, area, landmark" value={form.line} onChange={(e) => setForm({ ...form, line: e.target.value })} required />
                        <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>{STATES.map((s) => <option key={s}>{s}</option>)}</select>
                        <div className="row-gap"><button className="btn btn-primary sm" type="submit" disabled={!phoneValid}>Save address</button>{state.addresses.length > 0 && <button type="button" className="link" onClick={() => setAdding(false)}>Cancel</button>}</div>
                      </motion.form>
                    ) : <button className="link" onClick={() => setAdding(true)}>+ Add a new address</button>}
                  </AnimatePresence>
                  {addr && (
                    <label className="confirm-phone">
                      <input type="checkbox" checked={phoneOk} onChange={(e) => setPhoneOk(e.target.checked)} />
                      <span>Our rider can reach me on <b>{addr.phone}</b></span>
                    </label>
                  )}
                  {addr && <div className="eta-box"><Icon name="Truck" size={16} className="brand inline" /> Estimated delivery to {addr.state}: <b>{windowLabel(slowest, addr.state)}</b>{fromChina && <div className="small muted">Some items ship from our China warehouse — you'll get tracking at every step.</div>}</div>}
                  <button className="btn btn-primary lg" disabled={!addr || !phoneOk} onClick={() => setStep(1)}>Continue to review</button>
                </motion.section>
              )}
              {step === 1 && (
                <motion.section key="s1" className="panel" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                  <h3>Review your order</h3>
                  <div className="review-block"><div className="muted small">Deliver to</div><b>{addr.name}</b> · {addr.phone}<div>{addr.line}, {addr.state}</div><button className="link small" onClick={() => setStep(0)}>Change</button></div>
                  <ul className="review-items">
                    {t.lines.map((l) => (
                      <li key={l.key}><ProductArt p={l.p} size="xs" /><span className="clamp1">{l.qty} × {l.p.title}</span><b>{naira(l.p.price * l.qty)}</b></li>
                    ))}
                  </ul>
                  <div className="disclosure"><Icon name="CircleCheck" size={16} className="inline" /> The total below is the <b>final amount</b>. It already includes international freight, customs duties and clearing. No charges on delivery.</div>
                  <div className="row-gap"><button className="btn btn-ghost" onClick={() => setStep(0)}>Back</button>
                    <motion.button whileTap={{ scale: 0.97 }} className="btn btn-accent lg" disabled={paying} onClick={() => setChoosing(true)}>Continue to payment · {naira(t.total)}</motion.button>
                  </div>
                  <div className="small muted">Order reference: <code>{idem.current}</code></div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>
          <aside className="cart-side">
            <Summary t={t}><CouponBox /></Summary>
          </aside>
        </div>
      </div>
      <AnimatePresence>{choosing && <PaymentChooser method={method} setMethod={setMethod} total={t.total} onCancel={() => setChoosing(false)} onPay={() => { setChoosing(false); setPaying(true) }} />}</AnimatePresence>
      <AnimatePresence>{paying && <PaymentFlow method={method} total={t.total} onDone={finish} />}</AnimatePresence>
    </Page>
  )
}
