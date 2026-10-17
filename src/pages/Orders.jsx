import { useMemo } from 'react'
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStore } from '../store/Store'
import { Page, Empty, Reveal, ProductArt } from '../components/ui'
import { naira, stagesFor } from '../lib/commerce'
import { Icon } from '../components/Icon'

const fmt = (t) => new Date(t).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

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
  if (!state.orders.length) return <Page><div className="wrap"><Empty icon="Package" title="No orders yet" action={<Link to="/" className="btn btn-primary">Start shopping</Link>} /></div></Page>
  return (
    <Page>
      <div className="wrap narrow">
        <h1 className="page-title">Your orders</h1>
        <div className="orders">
          {state.orders.map((o, i) => {
            const st = statusOf(o)
            const stages = stagesFor(o)
            return (
              <Reveal key={o.ref} delay={i * 0.05}>
                <Link to={`/orders/${o.ref}`} className="order-card">
                  <div className="oc-top">
                    <div><b>{o.ref}</b><div className="muted small">Placed {fmt(o.createdAt)} · {o.items.reduce((n, x) => n + x.qty, 0)} item(s)</div></div>
                    <span className={`badge badge-${st.tone}`}>{st.label}</span>
                  </div>
                  <div className="oc-items">{o.items.map((it) => <MiniArt key={it.id} it={it} />)}</div>
                  {o.status !== 'cancelled' && (
                    <div className="oc-progress"><motion.span initial={{ width: 0 }} animate={{ width: `${(o.stageIdx / (stages.length - 1)) * 100}%` }} transition={{ duration: 0.8, delay: 0.2 }} /></div>
                  )}
                  <div className="oc-foot"><span>{naira(o.total)}</span><span className="see-all">Track <Icon name="ChevronRight" size={16} /></span></div>
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
    <div className="confetti" aria-hidden>
      {bits.map((b, i) => (
        <motion.span key={i} style={{ background: b.c }} initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }} animate={{ x: b.x, y: [0, b.y, b.y + 520], opacity: [1, 1, 0], rotate: b.r }} transition={{ duration: 2.2, delay: b.d, ease: 'easeOut' }} />
      ))}
    </div>
  )
}

export function OrderDetail() {
  const { ref } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { state, dispatch, toast } = useStore()
  const o = state.orders.find((x) => x.ref === ref)
  if (!o) return <Page><div className="wrap"><Empty icon="SearchX" title="Order not found" action={<Link to="/orders" className="btn btn-primary">Your orders</Link>} /></div></Page>

  const stages = stagesFor(o)
  const isNew = params.get('new')
  const cancelled = o.status === 'cancelled'
  const delivered = stages[o.stageIdx].key === 'delivered'
  const canCancel = !cancelled && o.stageIdx <= 2
  const evAt = (idx) => o.events.find((e) => e.idx === idx)?.at

  return (
    <Page>
      {isNew && <Confetti />}
      <div className="wrap narrow">
        {isNew && (
          <motion.div className="placed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', damping: 14 }}>
            <motion.div className="placed-ico" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.15, type: 'spring' }}><Icon name="Check" size={28} stroke={3} /></motion.div>
            <div><h2>Payment confirmed — thank you!</h2><p>Order <b>{o.ref}</b> is in. We've sent a confirmation by SMS and email.</p></div>
          </motion.div>
        )}
        <div className="od-head">
          <div><Link to="/orders" className="small muted row-ico"><Icon name="ArrowLeft" size={14} /> All orders</Link><h1 className="page-title">{o.ref}</h1><div className="muted small">Placed {fmt(o.createdAt)} · {o.payment}</div></div>
          {!cancelled && !delivered && <button className="btn btn-ghost sm" title="Prototype: simulates the next operations event" onClick={() => { dispatch({ type: 'advanceOrder', ref: o.ref }); toast(`Status update: ${stages[o.stageIdx + 1].label}`, { icon: stages[o.stageIdx + 1].icon }) }}><Icon name="ArrowRight" size={14} /> Simulate next update</button>}
        </div>

        {cancelled ? <div className="alert">This order was cancelled on {fmt(o.cancelledAt)}. A refund of {naira(o.total)} has been initiated to your original payment method (3–5 working days).</div> : (
          <div className="eta-hero">
            <span className="eta-ico"><Icon name={stages[o.stageIdx].icon} size={30} /></span>
            <div><div className="muted small">Current status</div><b className="eta-status">{stages[o.stageIdx].label}</b><div className="small">{stages[o.stageIdx].desc}</div></div>
            {o.eta && !delivered && <div className="eta-date"><div className="muted small">Estimated delivery</div><b>{o.eta}</b></div>}
          </div>
        )}

        <section className="panel">
          <h3>Tracking {o.fromChina && <span className="badge badge-info">China → Nigeria</span>}</h3>
          <ol className="timeline">
            {stages.map((s, i) => {
              const done = i <= o.stageIdx && !cancelled
              const now = i === o.stageIdx && !cancelled
              return (
                <motion.li key={s.key} className={`tl ${done ? 'done' : ''} ${now ? 'now' : ''}`} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                  <div className="tl-rail">
                    <motion.span className="tl-dot" animate={now ? { scale: [1, 1.25, 1], boxShadow: ['0 0 0 0 rgba(255,122,46,.5)', '0 0 0 10px rgba(255,122,46,0)', '0 0 0 0 rgba(255,122,46,0)'] } : {}} transition={{ repeat: Infinity, duration: 1.8 }}><Icon name={s.icon} size={16} /></motion.span>
                    {i < stages.length - 1 && <span className="tl-line"><motion.span initial={{ scaleY: 0 }} animate={{ scaleY: i < o.stageIdx && !cancelled ? 1 : 0 }} transition={{ duration: 0.5, delay: 0.2 + i * 0.08 }} /></span>}
                  </div>
                  <div className="tl-body">
                    <b>{s.label}</b>
                    {done && <div className="small">{s.desc}</div>}
                    {evAt(i) && done && <div className="muted small">{fmt(evAt(i))}</div>}
                  </div>
                </motion.li>
              )
            })}
          </ol>
        </section>

        <section className="panel">
          <h3>Items</h3>
          <ul className="review-items">
            {o.items.map((it) => <li key={it.id + it.color + it.size}><MiniArt it={it} /><Link to={`/p/${it.id}`} className="clamp1">{it.qty} × {it.title}{it.color ? ` · ${it.color}` : ''}{it.size ? ` · ${it.size}` : ''}</Link><b>{naira(it.unitPrice * it.qty)}</b></li>)}
          </ul>
          <div className="sum-row"><span>Subtotal</span><span>{naira(o.subtotal)}</span></div>
          {o.discount > 0 && <div className="sum-row good"><span>Discounts</span><span>−{naira(o.discount)}</span></div>}
          <div className="sum-row"><span>Delivery</span><span>{o.shipping ? naira(o.shipping) : 'FREE'}</span></div>
          <div className="sum-total"><span>Paid</span><b>{naira(o.total)}</b></div>
          <div className="muted small">Deliver to {o.address.name}, {o.address.line}, {o.address.state}</div>
        </section>

        <div className="od-actions">
          {canCancel && <button className="btn btn-ghost" onClick={() => { if (confirm('Cancel this order? You\'ll be refunded in full.')) { dispatch({ type: 'cancelOrder', ref: o.ref }); toast('Order cancelled — refund initiated', { icon: 'RotateCcw' }) } }}>Cancel order</button>}
          {delivered && <button className="btn btn-primary" onClick={() => nav(`/help?order=${o.ref}&type=return`)}>Return or report a problem</button>}
          <button className="btn btn-ghost" onClick={() => nav(`/help?order=${o.ref}`)}>Get help with this order</button>
        </div>
      </div>
    </Page>
  )
}
