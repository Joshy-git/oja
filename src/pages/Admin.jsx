import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from 'framer-motion'
import { useStore } from '../store/Store'
import { ProductArt, StockBadge, spring } from '../components/ui'
import { Logo } from '../components/Layout'
import { Icon } from '../components/Icon'
import { CATEGORIES, STOCK, patchProduct } from '../data/catalog'
import ProductEditor from './ProductEditor'
import Orders from './AdminOrders'
import Products from './AdminProducts'
import Customers from './AdminCustomers'
import Inventory from './AdminInventory'
import Logistics from './AdminLogistics'
import Procurement from './AdminProcurement'
import Reviews from './AdminReviews'
import Support from './AdminSupport'
import Audit from './AdminAudit'
import { naira, stagesFor } from '../lib/commerce'
import { Promotions } from './AdminPages'
import Settings, { DEFAULT_SETTINGS } from './AdminSettings'
import Team from './AdminTeam'

const ROLES = {
  'Super Admin': ['overview', 'orders', 'products', 'customers', 'inventory', 'logistics', 'procurement', 'promotions', 'reviews', 'support', 'audit', 'team', 'settings'],
  'Product Manager': ['overview', 'products', 'promotions', 'reviews'],
  'Inventory Officer': ['inventory', 'procurement'],
  'Logistics Officer': ['orders', 'logistics', 'support'],
  'Support Agent': ['support', 'orders', 'customers', 'reviews'],
  Finance: ['overview', 'orders', 'customers', 'audit', 'settings'],
  Analyst: ['overview', 'customers', 'reviews'],
}
const CAN_EDIT = new Set(['Super Admin', 'Product Manager', 'Inventory Officer', 'Logistics Officer', 'Support Agent'])
const NAV = [
  ['overview', 'LayoutDashboard', 'Overview'], ['orders', 'ReceiptText', 'Orders'], ['products', 'Tag', 'Products'], ['customers', 'Users', 'Customers'],
  ['inventory', 'Package', 'Inventory'], ['logistics', 'Plane', 'Logistics'], ['procurement', 'Factory', 'Procurement'],
  ['promotions', 'Ticket', 'Promotions'], ['reviews', 'Star', 'Reviews'],
  ['support', 'RotateCcw', 'Support cases'], ['audit', 'ScrollText', 'Audit log'], ['team', 'BadgeCheck', 'Team & permissions'], ['settings', 'Settings', 'Settings'],
]
// Saved dashboard settings (Settings page) merged over defaults
const useSettings = () => { const { state } = useStore(); return { ...DEFAULT_SETTINGS, ...(state.admin.settings || {}) } }

function Counter({ value, format = (v) => Math.round(v).toLocaleString() }) {
  const mv = useMotionValue(0)
  const txt = useTransform(mv, format)
  useEffect(() => { const c = animate(mv, value, { duration: 1.1, ease: 'easeOut' }); return c.stop }, [value, mv])
  return <motion.span>{txt}</motion.span>
}

const fmtN = (v) => '₦' + (v / 1e6).toFixed(1) + 'm'

// delta and note are optional (stock cards show units, not a weekly change)
function Kpi({ icon = 'Package', tone = 't-blue', label, value, format, delta, note, i = 0 }) {
  const down = delta?.startsWith('-')
  return (
    <motion.div className="kpi" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
      <div className="kpi-head"><span className={`kpi-ico ${tone}`}><Icon name={icon} size={14} /></span>{label}</div>
      <div className="kpi-v"><Counter value={value} format={format} /></div>
      {(delta || note) && (
        <div className="kpi-foot">
          <span className="muted">{delta ? 'vs last week' : note}</span>
          {delta && <span className={`chg ${down ? 'down' : 'up'}`}><Icon name={down ? 'ArrowDownRight' : 'ArrowUpRight'} size={13} />{delta.replace('-', '')}</span>}
        </div>
      )}
    </motion.div>
  )
}

// Order activity heatmap: days × 30-minute slots (8 AM – 10 PM). Deterministic demo data.
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SLOTS = Array.from({ length: 28 }, (_, i) => 8 + i / 2)
const RANGES = { '7D': { k: 1, seed: 7 }, '30D': { k: 4.2, seed: 30 }, '90D': { k: 12.6, seed: 90 } }
const slotLabel = (h) => { const hh = Math.floor(h), m = h % 1 ? '30' : '00', ap = hh >= 12 ? 'PM' : 'AM'; return `${((hh + 11) % 12) + 1}:${m} ${ap}` }
function heat(range) {
  const { k, seed } = RANGES[range]
  const dayF = [0.8, 0.75, 0.85, 0.9, 1.05, 1.35, 1.15]
  const curve = (h) => 0.35 + 0.75 * Math.exp(-((h - 12.5) ** 2) / 3) + 1.1 * Math.exp(-((h - 20) ** 2) / 2.5)
  return DAYS.map((_, d) => SLOTS.map((h, s) => {
    const noise = (Math.sin((d + 1) * 12.9898 + (s + 1) * 78.233 + seed) * 43758.5453) % 1
    return Math.max(0, Math.round(k * 9 * dayF[d] * curve(h) * (0.75 + Math.abs(noise) * 0.5)))
  }))
}

function ActivityHeatmap({ totalOrders }) {
  const [range, setRange] = useState('7D')
  const [tip, setTip] = useState(null)
  const grid = useMemo(() => heat(range), [range])
  const flat = grid.flat()
  const max = Math.max(...flat)
  const total = flat.reduce((a, b) => a + b, 0)
  const busy = flat.filter((v) => v >= max * 0.45).length / flat.length
  let peak = { v: -1 }
  grid.forEach((row, d) => row.forEach((v, s) => { if (v > peak.v) peak = { v, d, s } }))
  const level = (v) => (v >= max * 0.75 ? 4 : v >= max * 0.5 ? 3 : v >= max * 0.3 ? 2 : v >= max * 0.15 ? 1 : 0)
  return (
    <div className="adm-card heat-card">
      <div className="card-head">
        <div><h4>Order activity</h4><p className="muted small">When shoppers place orders, by day and time</p></div>
        <div className="seg" role="tablist">{Object.keys(RANGES).map((r) => <button key={r} role="tab" aria-selected={range === r} className={range === r ? 'on' : ''} onClick={() => { setRange(r); setTip(null) }}>{r}</button>)}</div>
      </div>
      <div className="heat-stat">
        <b>{Math.round(busy * 100)}%</b>
        <span className="muted small">of time slots are busy · {(range === '7D' ? totalOrders : total).toLocaleString()} orders · peak {DAYS[peak.d]} {slotLabel(SLOTS[peak.s])}</span>
      </div>
      <div className="heat-wrap" onMouseLeave={() => setTip(null)}>
        <div className="heat-days">{DAYS.map((d) => <span key={d}>{d}</span>)}</div>
        <div className="heat-grid" style={{ gridTemplateColumns: `repeat(${SLOTS.length}, 1fr)` }}>
          {grid.map((row, d) => row.map((v, s) => (
            <span key={`${d}-${s}`} className={`hc l${level(v)}`} onMouseEnter={(e) => setTip({ d, s, v, x: e.currentTarget.offsetLeft, y: e.currentTarget.offsetTop })} />
          )))}
          {tip && (
            <div className="heat-tip" style={{ left: Math.min(tip.x, 9999), top: tip.y }}>
              <b>{DAYS[tip.d]} · {slotLabel(SLOTS[tip.s])}</b>
              <span><i className="hc l4" /> {tip.v} orders</span>
              <span className="muted">{tip.v >= max * 0.75 ? 'Peak ordering window' : tip.v >= max * 0.3 ? 'Steady demand' : 'Quiet period'}</span>
            </div>
          )}
        </div>
        <div className="heat-axis">{['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM', '10 PM'].map((t) => <span key={t}>{t}</span>)}</div>
      </div>
      <div className="heat-legend muted small">Fewer <i className="hc l0" /><i className="hc l1" /><i className="hc l2" /><i className="hc l3" /><i className="hc l4" /> More</div>
    </div>
  )
}

// Monthly orders (thousands); Nov–Dec are a forecast
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const ORDERS_K = [1.9, 2.3, 2.9, 2.7, 3.4, 3.9, 3.6, 4.4, 4.9, 5.4, 6.0, 6.6]
function GrowthChart() {
  const W = 640, H = 230, L = 36, R = 12, Tp = 14, B = 28
  const x = (i) => L + (i * (W - L - R)) / (MONTHS.length - 1)
  const y = (v) => Tp + (1 - v / 8) * (H - Tp - B)
  const pts = ORDERS_K.map((v, i) => [x(i), y(v)])
  const smooth = (p) => p.reduce((d, [px, py], i) => {
    if (!i) return `M${px},${py}`
    const [ax, ay] = p[i - 1], [bx, by] = p[Math.max(i - 2, 0)], [cx, cy] = p[Math.min(i + 1, p.length - 1)]
    return `${d} C${ax + (px - bx) / 6},${ay + (py - by) / 6} ${px - (cx - ax) / 6},${py - (cy - ay) / 6} ${px},${py}`
  }, '')
  const actual = pts.slice(0, 10), forecast = pts.slice(9)
  const [hover, setHover] = useState(9)
  return (
    <div className="adm-card">
      <div className="card-head">
        <div><h4>Order growth</h4><p className="muted small">Monthly orders in 2026 · Nov–Dec forecast</p></div>
        <span className="pill-date"><Icon name="CalendarDays" size={14} /> 2026</span>
      </div>
      <svg className="growth" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Monthly orders chart" onMouseLeave={() => setHover(9)}>
        <defs><linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff7a2e" stopOpacity=".22" /><stop offset="1" stopColor="#ff7a2e" stopOpacity="0" /></linearGradient></defs>
        {[0, 2, 4, 6, 8].map((v) => <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="g-grid" /><text x={L - 8} y={y(v) + 4} textAnchor="end" className="g-lab">{v}k</text></g>)}
        <path d={`${smooth(actual)} L${actual[9][0]},${y(0)} L${actual[0][0]},${y(0)} Z`} fill="url(#gArea)" />
        <path d={smooth(actual)} className="g-line" />
        <path d={smooth(forecast)} className="g-line dash" />
        {MONTHS.map((m, i) => <text key={m} x={x(i)} y={H - 6} textAnchor="middle" className="g-lab">{m}</text>)}
        {pts.map(([px, py], i) => <circle key={i} cx={px} cy={py} r={hover === i ? 5 : 3.2} className={`g-dot ${i > 9 ? 'fc' : ''}`} />)}
        {pts.map(([px], i) => <rect key={`h${i}`} x={px - (W - L - R) / 22} y={Tp} width={(W - L - R) / 11} height={H - Tp - B} fill="transparent" onMouseEnter={() => setHover(i)} />)}
        {(() => { const [px, py] = pts[hover]; const tx = Math.min(Math.max(px - 52, L), W - R - 104); return (
          <g pointerEvents="none"><line x1={px} x2={px} y1={py + 6} y2={y(0)} className="g-guide" /><rect x={tx} y={py - 44} width="104" height="32" rx="6" className="g-tip" /><text x={tx + 52} y={py - 31} textAnchor="middle" className="g-tip-a">{MONTHS[hover]} {hover > 9 ? '(forecast)' : ''}</text><text x={tx + 52} y={py - 18} textAnchor="middle" className="g-tip-b">{Math.round(ORDERS_K[hover] * 1000).toLocaleString()} orders</text></g>
        ) })()}
      </svg>
    </div>
  )
}

function ActivityFeed({ products, orders, go }) {
  const { lowStock } = useSettings()
  const low = products.filter((p) => p.stock === 'nigeria' && p.qty < lowStock).sort((a, b) => a.qty - b.qty)[0]
  const latest = orders[0]
  const items = [
    { ico: 'Ship', title: 'Shipment held at customs', chip: ['Delayed', 'warn'], sub: 'SHP-GZ-0928 · Air · Guangzhou → Lagos · +2 days', to: 'logistics' },
    latest && { ico: 'ReceiptText', title: `New order ${latest.ref}`, chip: ['New', 'info'], sub: `${latest.items.reduce((n, i) => n + i.qty, 0)} item(s) · ${naira(latest.total)}`, to: 'orders' },
    low && { ico: 'TriangleAlert', title: `Low stock: ${low.title.split(',')[0]}`, chip: ['Restock', 'bad'], sub: `${low.qty} left in Lagos warehouse`, to: 'inventory' },
    { ico: 'Warehouse', title: 'Shipment received at warehouse', chip: ['Done', 'good'], sub: 'SHP-SZ-0915 · 610 units checked in at Ikeja', to: 'logistics' },
  ].filter(Boolean)
  return (
    <div className="adm-card">
      <div className="card-head">
        <div><h4>Operations activity</h4><p className="muted small">What needs attention right now</p></div>
        <button className="btn-mini" onClick={() => go('audit')}>View all <Icon name="ChevronRight" size={14} /></button>
      </div>
      <div className="feed">
        {items.map((it) => (
          <button key={it.title} className="feed-item" onClick={() => go(it.to)}>
            <span className="feed-ico"><Icon name={it.ico} size={16} /></span>
            <span className="feed-txt"><span className="feed-title">{it.title} <em className={`chip ${it.chip[1]}`}>{it.chip[0]}</em></span><span className="muted small">{it.sub}</span></span>
          </button>
        ))}
      </div>
    </div>
  )
}

const PROMO_TEMPLATES = [
  ['Urgency', 'warn', (t) => `${t} — today only, while stock lasts`],
  ['Value', 'good', (t) => `Up to 30% off ${t}, import duties included`],
  ['Delivery', 'info', (t) => `${t} delivered free on orders over ₦50,000`],
  ['First order', 'brand', (t) => `New to Oja? Take 10% off ${t} with OJA10`],
]
function PromoGenerator() {
  const [topic, setTopic] = useState('')
  const [shown, setShown] = useState('power banks')
  const [page, setPage] = useState(0)
  const ideas = [0, 1].map((k) => PROMO_TEMPLATES[(page * 2 + k) % PROMO_TEMPLATES.length]).map(([tag, tone, f]) => [tag, tone, f(shown.charAt(0).toUpperCase() + shown.slice(1))])
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); toast('Copied to clipboard', { icon: 'Copy' }) } catch { toast('Select the text to copy it', { icon: 'Copy' }) }
  }
  return (
    <div className="adm-card">
      <div className="card-head"><div><h4>Promo line generator</h4><p className="muted small">Banner and push copy built from Oja's real offers</p></div></div>
      <form className="gen-form" onSubmit={(e) => { e.preventDefault(); if (topic.trim()) { setShown(topic.trim()); setPage(0) } }}>
        <label className="small muted" htmlFor="promo-topic">Product or campaign</label>
        <input id="promo-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Rechargeable fans this weekend" />
        <button className="btn-dark" disabled={!topic.trim()}><Icon name="WandSparkles" size={16} /> Generate ideas</button>
      </form>
      <div className="gen-list">
        <div className="gen-list-head"><span className="small muted">Ideas for “{shown}”</span><button type="button" className="btn-mini" onClick={() => setPage((p) => p + 1)}><Icon name="Repeat" size={13} /> More ideas</button></div>
        {ideas.map(([tag, tone, text]) => (
          <div key={tag} className="gen-item">
            <div><em className={`chip ${tone}`}>{tag}</em><p>{text}</p></div>
            <button className="icon-btn" onClick={() => copy(text)} aria-label="Copy idea"><Icon name="Copy" size={15} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

function Overview({ products, orders, go }) {
  const gmvDays = [3.1, 2.8, 3.6, 4.2, 4.9, 6.3, 5.4].map((v) => v * 1e6)
  const liveGmv = orders.reduce((s, o) => s + o.total, 0)
  const gmv = gmvDays.reduce((s, v) => s + v, 0) + liveGmv
  const nOrders = 1248 + orders.length
  const { lowStock } = useSettings()
  const low = products.filter((p) => p.stock === 'nigeria' && p.qty < lowStock)
  const top = [...products].sort((a, b) => b.sold * b.price - a.sold * a.price).slice(0, 5)
  const margin = products.reduce((s, p) => s + (p.price - p.landed.total) / p.price, 0) / products.length
  let zero = {}
  try { zero = JSON.parse(localStorage.getItem('ooja-zero-results') || '{}') } catch {}
  const zeroList = Object.entries(zero).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const health = [['Contribution margin', (margin * 100).toFixed(1) + '%', '-0.8pt'], ['On-time delivery', '92.6%', '+1.9pt'], ['Refund rate', '1.8%', '-0.2pt'], ['Repeat purchase', '27%', '+2pt']]
  return (
    <>
      <div className="kpis">
        <Kpi i={0} icon="Wallet" tone="t-blue" label="GMV (7 days)" value={gmv} format={fmtN} delta="+18.4%" />
        <Kpi i={1} icon="ReceiptText" tone="t-orange" label="Orders" value={nOrders} delta="+11.2%" />
        <Kpi i={2} icon="ShoppingBag" tone="t-green" label="Avg order value" value={gmv / nOrders} format={(v) => naira(v)} delta="+6.5%" />
        <Kpi i={3} icon="Percent" tone="t-sun" label="Conversion rate" value={3.4} format={(v) => v.toFixed(1) + '%'} delta="+0.3pt" />
      </div>
      <div className="dash-grid">
        <div className="dash-main">
          <ActivityHeatmap totalOrders={nOrders} />
          <GrowthChart />
        </div>
        <div className="dash-side">
          <ActivityFeed products={products} orders={orders} go={go} />
          <PromoGenerator />
        </div>
      </div>
      <div className="dash-more">
        <div className="adm-card">
          <div className="card-head"><div><h4>Top products by revenue</h4></div></div>
          {top.map((p, i) => (
            <div key={p.id} className="adm-row">
              <span className="row-ico">{i + 1}. <span className="tbl-thumb sm"><ProductArt p={p} size="xs" /></span>{p.title.slice(0, 30)}</span>
              <b>{fmtN(p.sold * p.price)}</b>
            </div>
          ))}
        </div>
        <div className="adm-card">
          <div className="card-head"><div><h4>Operations health</h4></div></div>
          {health.map(([l, v, d]) => (
            <div key={l} className="adm-row"><span>{l}</span><span className="row-ico"><b>{v}</b><span className={`chg ${d.startsWith('-') ? (l === 'Refund rate' ? 'up' : 'down') : 'up'}`}>{d}</span></span></div>
          ))}
        </div>
        <div className="adm-card">
          <div className="card-head"><div><h4>Low stock in Lagos</h4></div><button className="btn-mini" onClick={() => go('inventory')}>Restock <Icon name="ChevronRight" size={14} /></button></div>
          {low.length ? low.slice(0, 5).map((p) => <div key={p.id} className="adm-row"><span className="row-ico"><span className="tbl-thumb sm"><ProductArt p={p} size="xs" /></span>{p.title.slice(0, 26)}…</span><b className={p.qty < 50 ? 'bad' : ''}>{p.qty}</b></div>) : <p className="muted small">All good.</p>}
        </div>
        <div className="adm-card">
          <div className="card-head"><div><h4>Zero-result searches</h4><p className="muted small">Unmet demand for sourcing</p></div></div>
          {zeroList.length ? zeroList.map(([q, n]) => <div key={q} className="adm-row"><span>“{q}”</span><b>{n}</b></div>) : <p className="muted small">None yet. Searches with no results appear here.</p>}
        </div>
      </div>
    </>
  )
}







const NAV_GROUPS = [['Main', ['overview', 'orders', 'products', 'customers']], ['Operations', ['inventory', 'logistics', 'procurement']], ['Marketing', ['promotions', 'reviews']], ['System & support', ['support', 'audit', 'team', 'settings']]]
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }

export default function Admin() {
  const { products, state } = useStore()
  const [role, setRole] = useState('Super Admin')
  const allowed = ROLES[role]
  const [view, setView] = useState('overview')
  const [newPO, setNewPO] = useState(false) // opens the New purchase order pop-up from other pages
  const [editing, setEditing] = useState(null) // product id being edited, 'new', or null
  const [menu, setMenu] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => { if (!allowed.includes(view)) setView(allowed[0]) }, [role]) // eslint-disable-line
  const edit = CAN_EDIT.has(role)
  const title = NAV.find((n) => n[0] === view)[2]
  const go = (v) => { if (allowed.includes(v)) { setView(v); setEditing(null); setMenu(false) } }
  const settings = useSettings()
  const lowCount = settings.alertLowStock ? products.filter((p) => p.stock === 'nigeria' && p.qty < settings.lowStock).length : 0
  const today = new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className={`admin ${collapsed ? 'collapsed' : ''}`}>
      {menu && <div className="adm-scrim" onClick={() => setMenu(false)} />}
      <aside className={`adm-side ${menu ? 'open' : ''}`}>
        <div className="adm-brand">
          <Logo />
          <span className="adm-tag">Ops</span>
          <button className="icon-btn adm-collapse" onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}><Icon name="PanelLeft" size={17} /></button>
        </div>
        <nav className="adm-nav-wrap">
          {NAV_GROUPS.map(([group, keys]) => {
            const items = NAV.filter(([k]) => keys.includes(k) && allowed.includes(k))
            if (!items.length) return null
            return (
              <div key={group} className="adm-group">
                <div className="adm-group-label">{group}</div>
                {items.map(([k, ico, label]) => (
                  <button key={k} className={`adm-nav ${view === k ? 'on' : ''}`} onClick={() => go(k)} title={collapsed ? label : undefined}>
                    {view === k && <motion.span layoutId="adm-nav" className="adm-nav-bg" transition={spring} />}
                    <span className="adm-nav-ico"><Icon name={ico} size={17} /></span><span className="adm-nav-label">{label}</span>
                  </button>
                ))}
              </div>
            )
          })}
          <div className="adm-group">
            <Link to="/help" className="adm-nav" title={collapsed ? 'Help centre' : undefined}><span className="adm-nav-ico"><Icon name="LifeBuoy" size={17} /></span><span className="adm-nav-label">Help centre</span></Link>
            <Link to="/" className="adm-nav" title={collapsed ? 'Storefront' : undefined}><span className="adm-nav-ico"><Icon name="Store" size={17} /></span><span className="adm-nav-label">View storefront</span></Link>
          </div>
        </nav>
        {allowed.includes('logistics') && settings.alertCustoms && (
          <div className="adm-alert">
            <span className="adm-alert-ico"><Icon name="Zap" size={15} fill="currentColor" /></span>
            <b>Customs delay</b>
            <p>SHP-GZ-0928 is held 2 extra days at Lagos customs. 420 units affected.</p>
            <button className="btn-light-mini" onClick={() => go('logistics')}>Open logistics</button>
          </div>
        )}
        <div className="adm-user">
          <span className="adm-avatar">{role.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
          <div className="adm-user-txt">
            <b>Cargoland Ops</b>
            <label className="sr-only" htmlFor="adm-role">Role</label>
            <select id="adm-role" value={role} onChange={(e) => setRole(e.target.value)}>{Object.keys(ROLES).map((r) => <option key={r}>{r}</option>)}</select>
            {!edit && <span className="adm-ro"><Icon name="Lock" size={11} /> Read-only</span>}
          </div>
        </div>
      </aside>

      <main className="adm-main">
        <div className="adm-top">
          <button className="icon-btn only-mobile" onClick={() => setMenu(!menu)} aria-label="Open menu"><Icon name="Menu" size={18} /></button>
          <div className="crumbs"><Icon name="House" size={15} /><Icon name="ChevronRight" size={13} />{editing && view === 'products' ? <><button className="crumb-link" onClick={() => setEditing(null)}>Products</button><Icon name="ChevronRight" size={13} /><b>{editing === 'new' ? 'New product' : 'Edit product'}</b></> : <b>{title}</b>}</div>
          <div className="adm-top-r">
            <span className="pill-date"><Icon name="CalendarDays" size={14} /> {today}</span>
            <button className="icon-btn bell" onClick={() => go('inventory')} aria-label={`${lowCount} low-stock alerts`}><Icon name="Bell" size={17} />{lowCount > 0 && <i>{lowCount}</i>}</button>
          </div>
        </div>
        {!['products', 'orders', 'customers', 'inventory', 'logistics', 'procurement', 'promotions', 'reviews', 'support', 'audit', 'team', 'settings'].includes(view) && <div className="adm-hello">
          <div>
            <h1>{view === 'overview' ? `${greeting()}, ${role.split(' ')[0] === 'Super' ? 'team' : role}` : title}</h1>
            <p className="muted">{view === 'overview' ? 'Here’s how Oja is performing this week' : 'Cargoland operations'}</p>
          </div>
          {allowed.includes('procurement') && <button className="btn-dark" onClick={() => { setNewPO(true); go('procurement') }}><Icon name="Plus" size={16} /> New purchase order</button>}
        </div>}
        <AnimatePresence mode="wait">
          <motion.div key={view + role + (editing || '')} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
            {view === 'overview' && <Overview products={products} orders={state.orders} go={go} />}
            {view === 'products' && (editing
              ? <ProductEditor productId={editing} minMargin={settings.minMargin} edit={edit} onBack={() => setEditing(null)} onOpen={(id) => setEditing(id)} />
              : <Products products={products} edit={edit} onEdit={setEditing} lowStock={settings.lowStock} />)}
            {view === 'orders' && <Orders edit={edit} />}
            {view === 'inventory' && <Inventory products={products} edit={edit} lowStock={settings.lowStock} />}
            {view === 'logistics' && <Logistics orders={state.orders} edit={edit} />}
            {view === 'procurement' && <Procurement products={products} edit={edit} openNew={newPO} onOpened={() => setNewPO(false)} />}
            {view === 'audit' && <Audit products={products} />}
            {view === 'customers' && <Customers edit={edit} />}
            {view === 'promotions' && <Promotions edit={edit} />}
            {view === 'reviews' && <Reviews products={products} edit={edit} />}
            {view === 'support' && <Support edit={edit} />}
            {view === 'team' && <Team roles={ROLES} nav={NAV} canEdit={CAN_EDIT} edit={edit} />}
            {view === 'settings' && <Settings edit={edit} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
