// Operations dashboard: Orders list (stats, tabs, search, filters, bulk actions,
// CSV export, list/grid views, pagination). Real orders come from the store; sample
// orders fill the list so the page reads like a live shop. Changes to sample orders
// are saved in state.admin.orders.
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useStore } from '../store/Store'
import { Icon } from '../components/Icon'
import { ProductArt } from '../components/ui'
import { naira, stagesFor, shippingFee, windowLabel, makeOrderRef, STATES } from '../lib/commerce'

const DAY = 864e5
const NAMES = ['Chiamaka Okafor', 'Tunde Adeyemi', 'Ngozi Eze', 'Kwame Mensah', 'Amina Bello', 'Emeka Nwosu', 'Wanjiru Kamau', 'Seyi Lawal', 'Kofi Boateng', 'Halima Yusuf', 'Thabo Ndlovu', 'Blessing Udo', 'Musa Abubakar', 'Zainab Sani', 'Obinna Chukwu', 'Akosua Asante', 'Fatou Diallo', 'Kunle Ajayi', 'Ifeoma Obi', 'Daniel Mwangi', 'Bisi Alade', 'Yemi Bakare', 'Grace Okon']
const CITIES = ['Lagos', 'Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano', 'Enugu', 'Accra', 'Nairobi', 'Lagos', 'Benin City', 'Uyo']
const rnd = (n) => { const x = Math.sin(n * 9301 + 49297) * 233280; return x - Math.floor(x) }

function demoOrders(products) {
  const pool = products.filter((p) => !p.custom)
  return Array.from({ length: 46 }, (_, i) => {
    const n = (k) => rnd(i * 7 + k)
    const count = n(1) < 0.6 ? 1 : n(1) < 0.85 ? 2 : 3
    const items = Array.from({ length: count }, (_, k) => { const p = pool[Math.floor(n(2 + k) * pool.length)]; return { id: p.id, title: p.title, qty: n(5 + k) < 0.8 ? 1 : 2, unitPrice: p.price } })
    const fromChina = items.some((it) => pool.find((p) => p.id === it.id)?.stock !== 'nigeria') || n(9) < 0.2
    const subtotal = items.reduce((s, l) => s + l.unitPrice * l.qty, 0)
    const shipping = subtotal >= 50000 ? 0 : 1500
    const stages = fromChina ? 10 : 6
    const age = Math.floor(n(11) ** 1.6 * 30 * DAY) + Math.floor(n(12) * 10 * 36e5)
    const stageIdx = Math.min(stages - 1, Math.floor((age / (30 * DAY)) * stages * 1.4 + n(13) * 2))
    const pay = n(14) < 0.1 ? 'Failed' : n(14) < 0.22 ? 'Pending' : 'Paid'
    const cancelled = pay !== 'Paid' ? n(15) < 0.35 : n(15) < 0.05
    const name = NAMES[Math.floor(n(16) * NAMES.length)]
    return {
      ref: `OJ-${String(260700 + i * 37).slice(0, 6)}-${Math.floor(n(17) * 36 ** 5).toString(36).toUpperCase().padStart(5, 'X')}`,
      items, fromChina, subtotal, shipping, total: subtotal + shipping, createdAt: Date.now() - age,
      stageIdx: pay === 'Paid' ? Math.max(1, stageIdx) : 0, payment: pay, status: cancelled ? 'cancelled' : 'active',
      returnRequested: pay === 'Paid' && stageIdx >= stages - 1 && n(18) < 0.45,
      delivery: shipping ? 'Standard' : n(19) < 0.15 ? 'Pickup' : 'Free shipping',
      address: { name, state: CITIES[Math.floor(n(20) * CITIES.length)] }, demo: true,
    }
  })
}

const STAGE_TONE = { placed: 'info', paid: 'info', processing: 'info', sourcing: 'warn', chinaWh: 'warn', transit: 'warn', customs: 'warn', ngWh: 'brand', out: 'brand', delivered: 'good' }
const TABS = [['all', 'All'], ['unpaid', 'Unpaid'], ['ship', 'Need to ship'], ['sent', 'Sent'], ['done', 'Completed'], ['cancelled', 'Cancelled'], ['returns', 'Returns']]
const PERIODS = [['today', 'Today', 1], ['7', 'Last 7 days', 7], ['30', 'Last 30 days', 30], ['all', 'All time', 9999]]
const initials = (n) => n.split(' ').map((w) => w[0]).join('').slice(0, 2)
const fmtDate = (t) => new Date(t).toLocaleString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export function useOutside(open, close) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (!ref.current?.contains(e.target)) close() }
    const k = (e) => { if (e.key === 'Escape') close() }
    document.addEventListener('pointerdown', h); document.addEventListener('keydown', k)
    return () => { document.removeEventListener('pointerdown', h); document.removeEventListener('keydown', k) }
  }, [open, close])
  return ref
}
export function Menu({ label, icon, items, align = 'right', className = 'btn-mini' }) {
  const [open, setOpen] = useState(false)
  const ref = useOutside(open, () => setOpen(false))
  return (
    <div className="om-wrap" ref={ref}>
      <button type="button" className={className} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" aria-label={typeof label === 'string' ? undefined : 'More options'}>{icon && <Icon name={icon} size={16} />}{label}</button>
      {open && (
        <div className={`om-menu ${align}`} role="menu">
          {items.filter(Boolean).map((it) => it === '-' ? <hr key={Math.random()} /> : (
            <button key={it.label} role="menuitem" type="button" disabled={it.disabled} className={it.danger ? 'danger' : ''} onClick={() => { setOpen(false); it.onClick() }}>{it.icon && <Icon name={it.icon} size={15} />}{it.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Orders({ edit }) {
  const { state, dispatch, toast, products } = useStore()
  const over = state.admin.orders || {}
  const demo = useMemo(() => demoOrders(products), []) // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => {
    const real = state.orders.map((o) => ({ ...o, method: o.payment, payment: o.paymentStatus || 'Paid', status: o.status === 'cancelled' ? 'cancelled' : 'active', delivery: o.delivery || (o.shipping ? 'Standard' : 'Free shipping'), returnRequested: state.cases.some((c) => c.order === o.ref && ['damaged', 'wrong', 'missing'].includes(c.type)) }))
    return [...real, ...demo.map((o) => ({ ...o, ...over[o.ref] }))].sort((a, b) => b.createdAt - a.createdAt).map((o) => {
      const st = stagesFor(o)
      return { ...o, st, stage: st[Math.min(o.stageIdx, st.length - 1)], count: o.items.reduce((n, i) => n + i.qty, 0), product: products.find((p) => p.id === o.items[0].id) || { id: o.items[0].id, title: o.items[0].title } }
    })
  }, [state.orders, state.cases, demo, over, products])

  const [period, setPeriod] = useState('30')
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [view, setView] = useState('list')
  const [route, setRoute] = useState('all')
  const [pay, setPay] = useState('all')
  const [per, setPer] = useState(10)
  const [page, setPage] = useState(1)
  const [sel, setSel] = useState(new Set())
  const [filterOpen, setFilterOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const recent = useMemo(() => { const seen = new Map(); rows.forEach((o) => { if (!seen.has(o.address.name)) seen.set(o.address.name, { name: o.address.name, phone: o.address.phone, line: o.address.line, state: o.address.state }) }); return [...seen.values()].slice(0, 15) }, [rows])
  const fRef = useOutside(filterOpen, () => setFilterOpen(false))

  const inTab = (o, t) => ({
    all: true,
    unpaid: o.status !== 'cancelled' && o.payment !== 'Paid',
    ship: o.status !== 'cancelled' && o.payment === 'Paid' && ['paid', 'processing', 'ngWh', 'placed'].includes(o.stage.key),
    sent: o.status !== 'cancelled' && ['sourcing', 'chinaWh', 'transit', 'customs', 'out'].includes(o.stage.key),
    done: o.status !== 'cancelled' && o.stage.key === 'delivered',
    cancelled: o.status === 'cancelled',
    returns: !!o.returnRequested,
  }[t])
  const days = PERIODS.find((p) => p[0] === period)[2]
  const since = period === 'today' ? new Date().setHours(0, 0, 0, 0) : Date.now() - days * DAY
  const inPeriod = rows.filter((o) => o.createdAt >= since)
  const stats = [
    ['Total orders', inPeriod.length],
    ['Ordered items', inPeriod.reduce((n, o) => n + o.count, 0)],
    ['Returns', inPeriod.filter((o) => o.returnRequested).length],
    ['Fulfilled orders', inPeriod.filter((o) => o.status !== 'cancelled' && (inTab(o, 'sent') || inTab(o, 'done'))).length],
    ['Delivered orders', inPeriod.filter((o) => inTab(o, 'done')).length],
  ]
  const filtered = inPeriod.filter((o) => inTab(o, tab) && (route === 'all' || (route === 'china') === o.fromChina) && (pay === 'all' || o.payment === pay)
    && `${o.ref} ${o.address.name} ${o.items.map((i) => i.title).join(' ')}`.toLowerCase().includes(q.trim().toLowerCase()))
  const pages = Math.max(1, Math.ceil(filtered.length / per))
  const cur = Math.min(page, pages)
  const shown = filtered.slice((cur - 1) * per, cur * per)
  useEffect(() => { setPage(1); setSel(new Set()) }, [tab, q, route, pay, period, per])

  const change = (o, patch, log) => {
    if (o.demo) dispatch({ type: 'setAdmin', key: 'orders', value: { [o.ref]: { ...over[o.ref], ...patch } }, log })
    else if (patch.stageIdx !== undefined) dispatch({ type: 'advanceOrder', ref: o.ref, actor: 'Super Admin' })
    else if (patch.status === 'cancelled') dispatch({ type: 'cancelOrder', ref: o.ref })
    else if (patch.payment) dispatch({ type: 'updateOrder', ref: o.ref, patch: { paymentStatus: patch.payment, ...(o.stageIdx < 1 ? { stageIdx: 1, events: [...(o.events || []), { at: Date.now(), idx: 1 }] } : {}) }, log })
  }
  const canAdvance = (o) => o.status !== 'cancelled' && o.payment === 'Paid' && o.stageIdx < o.st.length - 1
  const advance = (o) => change(o, { stageIdx: o.stageIdx + 1 }, `Order ${o.ref} → ${o.st[o.stageIdx + 1].label}`)
  const markPaid = (o) => change(o, { payment: 'Paid', stageIdx: Math.max(o.stageIdx, 1) }, `Order ${o.ref} marked paid`)
  const cancel = (o) => change(o, { status: 'cancelled' }, `Order ${o.ref} cancelled`)

  const selected = filtered.filter((o) => sel.has(o.ref))
  const bulk = (fn, label) => { const list = selected.length ? selected : []; list.forEach(fn); toast(`${label} ${list.length} order${list.length === 1 ? '' : 's'}`, { icon: 'CircleCheck' }); setSel(new Set()) }
  const exportCsv = () => {
    const list = selected.length ? selected : filtered
    const head = ['Order', 'Date', 'Customer', 'City', 'Items', 'Total (NGN)', 'Payment', 'Delivery', 'Route', 'Status']
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`
    const csv = [head, ...list.map((o) => [o.ref, new Date(o.createdAt).toISOString(), o.address.name, o.address.state, o.count, o.total, o.payment, o.delivery, o.fromChina ? 'China → Nigeria' : 'Local stock', o.status === 'cancelled' ? 'Cancelled' : o.stage.label])].map((r) => r.map(esc).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `oja-orders-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    toast(`Exported ${list.length} order${list.length === 1 ? '' : 's'} to CSV`, { icon: 'CircleCheck' })
  }
  const allOnPage = shown.length > 0 && shown.every((o) => sel.has(o.ref))
  const toggleAll = () => setSel(allOnPage ? new Set([...sel].filter((r) => !shown.some((o) => o.ref === r))) : new Set([...sel, ...shown.map((o) => o.ref)]))
  const toggle = (ref) => { const s = new Set(sel); s.has(ref) ? s.delete(ref) : s.add(ref); setSel(s) }

  const statusChip = (o) => o.status === 'cancelled' ? <em className="chip bad">Cancelled</em> : o.returnRequested ? <em className="chip warn">Return requested</em> : <em className={`chip ${STAGE_TONE[o.stage.key]}`}>{o.stage.label}</em>
  const payChip = (o) => <span className={`pay-dot ${o.payment.toLowerCase()}`}>{o.payment === 'Paid' ? 'Completed' : o.payment}</span>
  const rowMenu = (o) => [
    canAdvance(o) && { label: `Move to ${o.st[o.stageIdx + 1].label}`, icon: 'ArrowRight', onClick: () => advance(o), disabled: !edit },
    o.status !== 'cancelled' && o.payment !== 'Paid' && { label: 'Mark as paid', icon: 'BadgeCheck', onClick: () => markPaid(o), disabled: !edit },
    !o.demo && { label: 'View tracking page', icon: 'MapPin', onClick: () => window.open(`/orders/${o.ref}`, '_blank') },
    o.status !== 'cancelled' && o.stage.key !== 'delivered' && '-',
    o.status !== 'cancelled' && o.stage.key !== 'delivered' && { label: 'Cancel order', icon: 'X', danger: true, onClick: () => cancel(o), disabled: !edit },
  ].filter(Boolean)
  const pageNums = pages <= 7 ? Array.from({ length: pages }, (_, i) => i + 1) : [1, ...(cur > 3 ? ['…'] : []), ...[cur - 1, cur, cur + 1].filter((n) => n > 1 && n < pages), ...(cur < pages - 2 ? ['…'] : []), pages]

  return (
    <div className="ord">
      <div className="ord-head">
        <h2>Orders</h2>
        <div className="ord-actions">
          <button type="button" className="btn-mini lg" onClick={exportCsv}><Icon name="ArrowDownRight" size={15} /> Export{selected.length ? ` (${selected.length})` : ''}</button>
          <Menu label={<>More actions <Icon name="ChevronDown" size={15} /></>} className="btn-mini lg" items={[
            { label: `Advance selected (${selected.length})`, icon: 'ArrowRight', disabled: !edit || !selected.some(canAdvance), onClick: () => bulk((o) => canAdvance(o) && advance(o), 'Advanced') },
            { label: `Mark selected as paid (${selected.length})`, icon: 'BadgeCheck', disabled: !edit || !selected.some((o) => o.payment !== 'Paid' && o.status !== 'cancelled'), onClick: () => bulk((o) => o.payment !== 'Paid' && o.status !== 'cancelled' && markPaid(o), 'Marked paid:') },
            '-',
            { label: 'Select all on this page', icon: 'Check', onClick: () => setSel(new Set([...sel, ...shown.map((o) => o.ref)])) },
            { label: 'Clear selection', icon: 'X', disabled: !sel.size, onClick: () => setSel(new Set()) },
          ]} />
          <button type="button" className="btn-orange" disabled={!edit} onClick={() => setCreating(true)}><Icon name="Plus" size={16} /> Create Order</button>
        </div>
      </div>

      <div className="ord-stats">
        <label className="ord-period"><Icon name="CalendarDays" size={16} /><select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Period">{PERIODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        {stats.map(([l, v]) => <div key={l} className="ord-stat"><span>{l}</span><b>{v.toLocaleString()}</b></div>)}
      </div>

      <div className="ord-tabs" role="tablist">
        {TABS.map(([k, l]) => { const n = inPeriod.filter((o) => inTab(o, k)).length; return (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}{k !== 'all' && n > 0 && <i>{n}</i>}</button>
        ) })}
      </div>

      <div className="ord-tools">
        <label className="ord-search"><Icon name="Search" size={16} /><input id="ord-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order, customer or product…" /></label>
        <div className="ord-tools-r">
          <div className="seg" role="group" aria-label="View">
            <button type="button" className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')} aria-label="Grid view"><Icon name="LayoutGrid" size={15} /></button>
            <button type="button" className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} aria-label="List view"><Icon name="Menu" size={15} /></button>
          </div>
          <div className="om-wrap" ref={fRef}>
            <button type="button" className={`btn-mini lg ${route !== 'all' || pay !== 'all' ? 'active' : ''}`} onClick={() => setFilterOpen((o) => !o)} aria-expanded={filterOpen}><Icon name="SlidersHorizontal" size={15} /> Filter{(route !== 'all') + (pay !== 'all') ? ` (${(route !== 'all') + (pay !== 'all')})` : ''}</button>
            {filterOpen && (
              <div className="om-menu right ord-filter">
                <label><span>Route</span><select value={route} onChange={(e) => setRoute(e.target.value)}><option value="all">All routes</option><option value="china">China → Nigeria</option><option value="local">Local stock</option></select></label>
                <label><span>Payment</span><select value={pay} onChange={(e) => setPay(e.target.value)}><option value="all">All payments</option><option value="Paid">Completed</option><option value="Pending">Pending</option><option value="Failed">Failed</option></select></label>
                <button type="button" className="btn-mini" onClick={() => { setRoute('all'); setPay('all') }}>Reset filters</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {view === 'list' ? (
        <div className="table-wrap ord-table">
          <table className="tbl">
            <thead><tr>
              <th className="ord-cb"><input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Select all orders on this page" /></th>
              <th>Order</th><th>Customer</th><th>Date</th><th className="num">Total</th><th>Payment</th><th>Items</th><th>Delivery</th><th>Route</th><th>Status</th><th />
            </tr></thead>
            <tbody>
              {shown.map((o) => (
                <tr key={o.ref} className={sel.has(o.ref) ? 'sel' : ''}>
                  <td className="ord-cb"><input type="checkbox" checked={sel.has(o.ref)} onChange={() => toggle(o.ref)} aria-label={`Select ${o.ref}`} /></td>
                  <td><div className="ord-prod"><span className="ord-thumb"><ProductArt p={o.product} size="xs" /></span><div><div className="clamp1">{o.items[0].title}{o.items.length > 1 ? ` +${o.items.length - 1}` : ''}</div>{o.demo ? <span className="muted small">#{o.ref}</span> : <Link to={`/orders/${o.ref}`} className="muted small ord-ref">#{o.ref}</Link>}</div></div></td>
                  <td><div className="ord-cust"><span className="cust-av">{initials(o.address.name)}</span><div>{o.address.name}<div className="muted small">{o.address.state}</div></div></div></td>
                  <td className="small nowrap">{fmtDate(o.createdAt)}</td>
                  <td className="num nowrap"><b>{naira(o.total)}</b></td>
                  <td>{payChip(o)}</td>
                  <td className="small nowrap">{o.count} item{o.count === 1 ? '' : 's'}</td>
                  <td className="small nowrap">{o.delivery}</td>
                  <td className="small nowrap">{o.fromChina ? <span className="row-ico route china" title="Imported: China → Nigeria"><Icon name="Plane" size={14} /> China → NG</span> : <span className="row-ico route local" title="Ships from the Lagos warehouse"><Icon name="Store" size={14} /> Local stock</span>}</td>
                  <td className="nowrap">{statusChip(o)}</td>
                  <td><Menu icon="EllipsisVertical" items={rowMenu(o)} className="icon-btn" label="" /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length && <div className="ord-empty"><Icon name="SearchX" size={22} /><b>No orders here</b><span className="muted small">Try another tab, period or search.</span></div>}
        </div>
      ) : (
        <div className="ord-grid">
          {shown.map((o) => (
            <div key={o.ref} className={`ord-card ${sel.has(o.ref) ? 'sel' : ''}`}>
              <div className="ord-card-top"><input type="checkbox" checked={sel.has(o.ref)} onChange={() => toggle(o.ref)} aria-label={`Select ${o.ref}`} /><span className="muted small">#{o.ref}</span><Menu icon="EllipsisVertical" items={rowMenu(o)} className="icon-btn" label="" /></div>
              <div className="ord-prod"><span className="ord-thumb lg"><ProductArt p={o.product} size="xs" /></span><div><div className="clamp2">{o.items[0].title}{o.items.length > 1 ? ` +${o.items.length - 1}` : ''}</div><b>{naira(o.total)}</b></div></div>
              <div className="ord-card-meta"><span className="row-ico"><span className="cust-av">{initials(o.address.name)}</span>{o.address.name}</span><span className="muted small">{fmtDate(o.createdAt)}</span></div>
              <div className="ord-card-chips">{statusChip(o)}{payChip(o)}<span className="small muted row-ico">{o.fromChina ? <><Icon name="Plane" size={13} /> China → NG</> : <><Icon name="Store" size={13} /> Local</>}</span></div>
            </div>
          ))}
          {!shown.length && <div className="ord-empty"><Icon name="SearchX" size={22} /><b>No orders here</b></div>}
        </div>
      )}

      <div className="ord-pager">
        <label className="small muted">Items per page <select value={per} onChange={(e) => setPer(+e.target.value)}>{[10, 20, 50].map((n) => <option key={n}>{n}</option>)}</select></label>
        <span className="small muted">{filtered.length ? `${(cur - 1) * per + 1}–${Math.min(cur * per, filtered.length)} of ${filtered.length}` : '0 orders'}</span>
        <nav className="ord-pages" aria-label="Pages">
          <button type="button" className="pg-step" disabled={cur === 1} onClick={() => setPage(cur - 1)}><Icon name="ArrowLeft" size={14} /> Previous</button>
          {pageNums.map((n, i) => n === '…' ? <span key={`e${i}`} className="pg-gap">…</span> : <button type="button" key={n} className={`pg ${n === cur ? 'on' : ''}`} aria-current={n === cur ? 'page' : undefined} onClick={() => setPage(n)}>{n}</button>)}
          <button type="button" className="pg-step" disabled={cur === pages} onClick={() => setPage(cur + 1)}>Next <Icon name="ChevronRight" size={14} /></button>
        </nav>
      </div>
      {creating && <CreateOrderModal recent={recent} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); setTab('all'); setQ(''); setRoute('all'); setPay('all'); setPage(1) }} />}
    </div>
  )
}

/* ---------- Create order (phone, WhatsApp or walk-in) ---------- */
const PAY_METHODS = ['Bank transfer', 'Cash on delivery', 'POS on delivery', 'Paystack payment link']
const CHANNELS = ['Phone call', 'WhatsApp', 'Walk-in', 'Instagram DM']
const SLOW = ['nigeria', 'transit', 'china', 'preorder']
const phoneOk = (p) => /^0[789][01]\d{8}$/.test(p.replace(/\s/g, ''))

function CreateOrderModal({ onClose, onCreated, recent }) {
  const { live, dispatch, toast } = useStore()
  const [c, setC] = useState({ pick: 'new', name: '', phone: '', line: '', state: 'Lagos' })
  const [lines, setLines] = useState([])
  const [find, setFind] = useState('')
  const [delivery, setDelivery] = useState('deliver')
  const [method, setMethod] = useState('Bank transfer')
  const [paid, setPaid] = useState(true)
  const [channel, setChannel] = useState('Phone call')
  const [note, setNote] = useState('')
  const [tried, setTried] = useState(false)
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'; document.addEventListener('keydown', esc)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', esc) }
  }, [onClose])
  useEffect(() => { if (method === 'Cash on delivery' || method === 'POS on delivery') setPaid(false) }, [method])

  const buyable = live.filter((p) => p.stock !== 'oos')
  const matches = find.trim() ? buyable.filter((p) => `${p.title} ${p.sku} ${(p.tags || []).join(' ')}`.toLowerCase().includes(find.trim().toLowerCase())).slice(0, 6) : []
  const prod = (id) => buyable.find((p) => p.id === id) || live.find((p) => p.id === id)
  const addLine = (p) => {
    const i = lines.findIndex((l) => l.id === p.id)
    if (i >= 0) setLines(lines.map((l, k) => (k === i ? { ...l, qty: l.qty + 1 } : l)))
    else setLines([...lines, { id: p.id, qty: 1, color: p.variants.color?.[0] || null, size: p.variants.size?.[0] || null }])
    setFind('')
  }
  const setLine = (i, patch) => setLines(lines.map((l, k) => (k === i ? { ...l, ...patch } : l)))
  const maxQty = (p) => (p.stock === 'nigeria' ? p.qty : 99)

  const subtotal = lines.reduce((s, l) => s + prod(l.id).price * l.qty, 0)
  const shipping = delivery === 'pickup' || !lines.length ? 0 : shippingFee(c.state, subtotal)
  const total = subtotal + shipping
  const pickRecent = (v) => {
    if (v === 'new') return setC({ pick: 'new', name: '', phone: '', line: '', state: 'Lagos' })
    const r = recent.find((x) => x.name === v)
    setC({ pick: v, name: r.name, phone: r.phone || '', line: r.line || '', state: r.state || 'Lagos' })
  }
  const errors = {
    name: c.name.trim().length < 2 && 'Enter the customer’s name.',
    phone: !phoneOk(c.phone) && 'Enter a valid Nigerian mobile number, like 0803 123 4567.',
    line: delivery === 'deliver' && c.line.trim().length < 5 && 'Enter the delivery address.',
    items: !lines.length && 'Add at least one product.',
    stock: lines.some((l) => l.qty > maxQty(prod(l.id))) && 'One of the quantities is more than the stock on hand.',
  }
  const firstError = Object.values(errors).find(Boolean)
  const show = (k) => tried && errors[k] && <div className="err small">{errors[k]}</div>

  const create = (e) => {
    e.preventDefault(); setTried(true)
    if (firstError) return
    const now = Date.now()
    const items = lines.map((l) => { const p = prod(l.id); return { id: p.id, title: p.title, hue: p.hue, color: l.color, size: l.size, qty: l.qty, unitPrice: p.price } })
    const stocks = lines.map((l) => prod(l.id).stock)
    const slowest = stocks.reduce((a, b) => (SLOW.indexOf(b) > SLOW.indexOf(a) ? b : a), 'nigeria')
    const order = {
      ref: makeOrderRef(), items, fromChina: stocks.some((s) => s !== 'nigeria'),
      stageIdx: paid ? 1 : 0, events: paid ? [{ at: now - 4000, idx: 0 }, { at: now, idx: 1 }] : [{ at: now, idx: 0 }],
      subtotal, discount: 0, shipping, total, coupon: null,
      address: { name: c.name.trim(), phone: c.phone.trim(), line: delivery === 'pickup' ? 'Pickup at Ikeja warehouse' : c.line.trim(), state: c.state },
      payment: method, paymentStatus: paid ? 'Paid' : 'Pending', delivery: delivery === 'pickup' ? 'Pickup' : shipping ? 'Standard' : 'Free shipping',
      eta: windowLabel(slowest, c.state), createdAt: now, status: 'active', channel, note: note.trim(), manual: true,
    }
    dispatch({ type: 'adminCreateOrder', order })
    toast(`Order ${order.ref} created for ${order.address.name}`, { icon: 'CircleCheck' })
    onCreated(order.ref)
  }

  // Rendered into <body> so the page's animated wrapper can't trap the fixed positioning
  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <form className="co-modal" role="dialog" aria-modal="true" aria-labelledby="co-title" onSubmit={create} noValidate>
        <div className="co-head">
          <div><h3 id="co-title">Create order</h3><p className="muted small">For orders taken by phone, WhatsApp or in person.</p></div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="X" size={20} /></button>
        </div>
        <div className="co-body">
          <section className="co-sec">
            <h4>Customer</h4>
            <label className="set-field"><span>Customer</span>
              <select id="co-pick" value={c.pick} onChange={(e) => pickRecent(e.target.value)}><option value="new">New customer</option>{recent.map((r) => <option key={r.name} value={r.name}>{r.name} · {r.state}</option>)}</select></label>
            <div className="pe-2">
              <label className="set-field"><span>Full name</span><input id="co-name" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} placeholder="Ada Okafor" autoComplete="off" /></label>
              <label className="set-field"><span>Phone</span><input id="co-phone" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} placeholder="0803 123 4567" inputMode="tel" autoComplete="off" /></label>
            </div>
            {show('name')}{show('phone')}
          </section>

          <section className="co-sec">
            <h4>Products</h4>
            <div className="co-find">
              <label className="ord-search"><Icon name="Search" size={16} /><input id="co-find" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Search products by name or SKU…" autoComplete="off" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (matches[0]) addLine(matches[0]) } }} /></label>
              {matches.length > 0 && (
                <div className="co-results" role="listbox">
                  {matches.map((p) => (
                    <button type="button" key={p.id} role="option" onClick={() => addLine(p)}>
                      <span className="ord-thumb"><ProductArt p={p} size="xs" /></span>
                      <span className="co-r-txt"><b className="clamp1">{p.title}</b><span className="muted small">{p.sku} · {p.stock === 'nigeria' ? `${p.qty} in Lagos` : p.stock === 'china' ? 'China stock' : p.stock === 'transit' ? 'In transit' : 'Pre-order'}</span></span>
                      <b className="co-r-price">{naira(p.price)}</b>
                    </button>
                  ))}
                </div>
              )}
              {find.trim() && !matches.length && <div className="co-results co-none muted small">No products match “{find}”.</div>}
            </div>
            {lines.length > 0 ? (
              <div className="co-lines">
                {lines.map((l, i) => { const p = prod(l.id); return (
                  <div key={l.id} className="co-line">
                    <span className="ord-thumb"><ProductArt p={p} size="xs" /></span>
                    <div className="co-line-main">
                      <b className="clamp1">{p.title}</b>
                      <div className="co-line-opts">
                        <span className="muted small">{naira(p.price)}</span>
                        {p.variants.color && <select aria-label="Colour" value={l.color || ''} onChange={(e) => setLine(i, { color: e.target.value })}>{p.variants.color.map((x) => <option key={x}>{x}</option>)}</select>}
                        {p.variants.size && <select aria-label="Size" value={l.size || ''} onChange={(e) => setLine(i, { size: e.target.value })}>{p.variants.size.map((x) => <option key={x}>{x}</option>)}</select>}
                      </div>
                    </div>
                    <div className="co-qty" role="group" aria-label="Quantity">
                      <button type="button" onClick={() => setLine(i, { qty: Math.max(1, l.qty - 1) })} aria-label="Decrease"><Icon name="Minus" size={14} /></button>
                      <span>{l.qty}</span>
                      <button type="button" onClick={() => setLine(i, { qty: l.qty + 1 })} aria-label="Increase"><Icon name="Plus" size={14} /></button>
                    </div>
                    <b className="co-line-total">{naira(p.price * l.qty)}</b>
                    <button type="button" className="icon-btn" onClick={() => setLines(lines.filter((_, k) => k !== i))} aria-label={`Remove ${p.title}`}><Icon name="X" size={16} /></button>
                  </div>
                ) })}
              </div>
            ) : <p className="muted small co-empty">Search above and click a product to add it.</p>}
            {show('items')}{show('stock')}
          </section>

          <section className="co-sec">
            <h4>Delivery</h4>
            <div className="pe-radios">
              <label className={`pe-radio ${delivery === 'deliver' ? 'on' : ''}`}><input type="radio" name="co-del" checked={delivery === 'deliver'} onChange={() => setDelivery('deliver')} /> Home delivery</label>
              <label className={`pe-radio ${delivery === 'pickup' ? 'on' : ''}`}><input type="radio" name="co-del" checked={delivery === 'pickup'} onChange={() => setDelivery('pickup')} /> Pickup at Ikeja</label>
            </div>
            <div className="pe-3 co-addr">
              {delivery === 'deliver' && <label className="set-field pe-span2"><span>Address</span><input id="co-line" value={c.line} onChange={(e) => setC({ ...c, line: e.target.value })} placeholder="12 Admiralty Way, Lekki Phase 1" /></label>}
              <label className="set-field"><span>State</span><select id="co-state" value={c.state} onChange={(e) => setC({ ...c, state: e.target.value })}>{STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
            </div>
            {show('line')}
          </section>

          <section className="co-sec">
            <h4>Payment</h4>
            <div className="pe-3">
              <label className="set-field"><span>Method</span><select id="co-method" value={method} onChange={(e) => setMethod(e.target.value)}>{PAY_METHODS.map((m) => <option key={m}>{m}</option>)}</select></label>
              <label className="set-field"><span>Status</span><select id="co-paid" value={paid ? 'paid' : 'pending'} onChange={(e) => setPaid(e.target.value === 'paid')}><option value="paid">Paid</option><option value="pending">Awaiting payment</option></select></label>
              <label className="set-field"><span>Order came via</span><select id="co-channel" value={channel} onChange={(e) => setChannel(e.target.value)}>{CHANNELS.map((m) => <option key={m}>{m}</option>)}</select></label>
            </div>
            <label className="set-field"><span>Internal note <em className="muted">optional</em></span><input id="co-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Customer wants evening delivery" /></label>
          </section>
        </div>

        <div className="co-foot">
          <div className="co-sum">
            <span>Subtotal <b>{naira(subtotal)}</b></span>
            <span>Delivery <b>{delivery === 'pickup' ? 'Pickup' : !lines.length ? '—' : shipping ? naira(shipping) : 'Free'}</b></span>
            <span className="co-total">Total <b>{naira(total)}</b></span>
          </div>
          {tried && firstError && <div className="err small">Fix the highlighted fields to create the order.</div>}
          <div className="co-actions"><button type="button" className="btn-mini lg" onClick={onClose}>Cancel</button><button className="btn-orange"><Icon name="Plus" size={16} /> Create order</button></div>
        </div>
      </form>
    </>
  , document.body)
}
