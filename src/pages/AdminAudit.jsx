// Operations dashboard: Audit log (every change made in the dashboard). Same layout
// as the other list pages. Real entries come from state.audit (newest 100); sample
// history fills the list so the page reads like a working shop.
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../store/Store'
import { Icon } from '../components/Icon'
import { spring } from '../components/ui'
import { Menu, useOutside } from './AdminOrders'

const DAY = 864e5
const SETTINGS = /^settings|threshold|permission|\brole\b/i
const AREAS = [
  ['orders', 'Orders', 'ReceiptText', /\border\b|OJ-\d/i],
  ['procurement', 'Procurement', 'Factory', /PO-\d|purchase order|supplier payment/i],
  ['logistics', 'Logistics', 'Plane', /SHP-|shipment/i],
  ['inventory', 'Inventory', 'Warehouse', /\bqty\b|stock|restock|received:/i],
  ['products', 'Products', 'Tag', /product|price|publish|visibility|\bp\d+:/i],
  ['promotions', 'Promotions', 'Ticket', /coupon|campaign/i],
  ['support', 'Support', 'LifeBuoy', /\bcase\b|CS-[A-Z0-9]/i],
  ['reviews', 'Reviews', 'Star', /review/i],
  ['customers', 'Customers', 'Users', /customer/i],
]
const OTHER = ['other', 'Settings & other', 'Settings']
const areaOf = (text) => (SETTINGS.test(text) ? OTHER : AREAS.find((a) => a[3].test(text)) || OTHER)
const AREA_TONE = { orders: 'info', procurement: 'warn', logistics: 'info', inventory: 'good', products: 'brand', promotions: 'warn', support: 'bad', reviews: 'brand', customers: 'good', other: 'info' }
const TABS = [['all', 'All'], ...AREAS.map(([k, l]) => [k, l]), ['other', 'Other']]
const initials = (n) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
const when = (t) => new Date(t).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const ago = (t) => { const m = Math.max(0, Math.round((Date.now() - t) / 6e4)); return m < 1 ? 'Just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : (Math.round(m / 1440) === 1 ? "1 day ago" : `${Math.round(m / 1440)} days ago`) }

const SAMPLE = [
  [0.02, 'Logistics Officer', 'SHP-GZ-0928 flagged as delayed'],
  [0.1, 'Support Agent', 'Case CS-B3XZ80 assigned to Amaka (Support)'],
  [0.3, 'Inventory Officer', 'p2: qty → 520'],
  [0.5, 'Super Admin', 'Coupon FREESHIP activated'],
  [0.8, 'Product Manager', 'Edited product p45: Women\'s Ankara Print Midi Dress'],
  [1.1, 'Super Admin', 'Created order OJ-261008-QX4T2 for Ifeoma Obi (2 items)'],
  [1.4, 'Logistics Officer', 'SHP-SZ-0914 → Received at Ikeja WH'],
  [1.6, 'Inventory Officer', 'PO-261040 received: 50 units of OJ-ELE-1000'],
  [2.0, 'Support Agent', 'Case CS-T8RW05 → Resolved'],
  [2.3, 'Product Manager', 'p16: price → 19500'],
  [2.7, 'Super Admin', 'Created campaign 10.10 Super Shopping Day'],
  [3.1, 'Inventory Officer', 'Raised PO-261043: 400 × OJ-ELE-1077 from Yiwu Bright Star Co.'],
  [3.4, 'Super Admin', 'Review p12-r3 hidden'],
  [3.9, 'Logistics Officer', 'Created shipment SHP-YW-0921 (3800 units, Sea)'],
  [4.5, 'Product Manager', 'Added product p53: Baby Cotton Romper Set (5 pcs)'],
  [5.2, 'Super Admin', 'Order OJ-260929-B3XZ8 marked paid'],
  [5.8, 'Support Agent', 'Logged case CS-W6JT38 for Kofi Boateng (Payment issue)'],
  [6.4, 'Inventory Officer', 'p37: stock → oos, qty → 0'],
  [7.0, 'Super Admin', 'Coupon SAVE2K paused'],
  [7.6, 'Super Admin', 'Coupon SAVE2K activated'],
  [8.3, 'Product Manager', 'p4: published → true, visibility → published'],
  [9.1, 'Super Admin', 'Added customer Blessing Udo'],
  [10.2, 'Logistics Officer', 'SHP-XM-0879 → Customs cleared'],
  [11.5, 'Super Admin', 'Settings updated: low-stock threshold 100 units'],
  [12.8, 'Inventory Officer', 'PO-261047 supplier payment completed'],
  [13.6, 'Support Agent', 'Review p31-r1 featured'],
].map(([d, actor, action]) => ({ at: Date.now() - d * DAY, actor, action, sample: true }))

export default function Audit({ products }) {
  const { state, dispatch, toast } = useStore()
  const showStats = (state.admin.auditView || {}).stats !== false
  const nameOf = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products])
  // "p4: qty → 10" reads better as "OJ-ELE-1021 (65W GaN USB-C Charger): qty → 10"
  const pretty = (text) => text.replace(/\bp(\d+)(?=[: ])/g, (m) => { const p = nameOf[m]; return !p ? m : text.includes(p.title) ? p.sku : `${p.sku} (${p.title.split(',')[0]})` })
  const rows = useMemo(() => [...state.audit, ...SAMPLE].map((a, i) => { const [k, l, ico] = areaOf(a.action); return { ...a, id: `${a.at}-${i}`, area: k, areaLabel: l, icon: ico, text: pretty(a.action) } }).sort((a, b) => b.at - a.at), [state.audit, nameOf]) // eslint-disable-line react-hooks/exhaustive-deps

  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [actor, setActor] = useState('')
  const [range, setRange] = useState('all')
  const [sort, setSort] = useState('desc')
  const [per, setPer] = useState(10)
  const [page, setPage] = useState(1)
  const [sel, setSel] = useState(new Set())
  const [filterOpen, setFilterOpen] = useState(false)
  const fRef = useOutside(filterOpen, () => setFilterOpen(false))

  const since = { all: 0, today: new Date().setHours(0, 0, 0, 0), 7: Date.now() - 7 * DAY, 30: Date.now() - 30 * DAY }[range]
  const filtered = rows
    .filter((a) => (tab === 'all' || a.area === tab) && (!actor || a.actor === actor) && a.at >= since && `${a.actor} ${a.text} ${a.areaLabel}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (sort === 'asc' ? a.at - b.at : b.at - a.at))
  const pages = Math.max(1, Math.ceil(filtered.length / per))
  const cur = Math.min(page, pages)
  const shown = filtered.slice((cur - 1) * per, cur * per)
  useEffect(() => { setPage(1); setSel(new Set()) }, [tab, q, actor, range, per, sort])

  const today = new Date().setHours(0, 0, 0, 0)
  const week = rows.filter((a) => a.at >= Date.now() - 7 * DAY)
  const byActor = Object.entries(week.reduce((m, a) => ({ ...m, [a.actor]: (m[a.actor] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1])
  const actors = [...new Set(rows.map((a) => a.actor))].sort()
  const stats = [
    ['History', 't-orange', 'Changes Today', rows.filter((a) => a.at >= today).length, `${state.audit.filter((a) => a.at >= today).length} made in this browser`],
    ['CalendarDays', 't-blue', 'Last 7 Days', week.length, `${new Set(week.map((a) => a.area)).size} areas of the business`],
    ['Users', 't-green', 'Most Active', byActor[0]?.[0] || '—', byActor[0] ? `${byActor[0][1]} changes this week` : 'No changes this week'],
    ['ScrollText', 't-sun', 'Team Members', actors.length, 'Have made changes'],
  ]

  const selected = filtered.filter((a) => sel.has(a.id))
  const exportCsv = () => {
    const list = selected.length ? selected : filtered
    const head = ['Time', 'Team member', 'Area', 'Change']
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`
    const csv = [head, ...list.map((a) => [new Date(a.at).toISOString(), a.actor, a.areaLabel, a.text])].map((r) => r.map(esc).join(',')).join('\n')
    const el = document.createElement('a')
    el.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    el.download = `oja-audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    el.click(); setTimeout(() => URL.revokeObjectURL(el.href), 1000)
    toast(`Exported ${list.length} entr${list.length === 1 ? 'y' : 'ies'} to CSV`, { icon: 'CircleCheck' })
  }
  const allOnPage = shown.length > 0 && shown.every((a) => sel.has(a.id))
  const toggleAll = () => setSel(allOnPage ? new Set([...sel].filter((id) => !shown.some((a) => a.id === id))) : new Set([...sel, ...shown.map((a) => a.id)]))
  const toggle = (id) => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n) }
  const pageNums = pages <= 7 ? Array.from({ length: pages }, (_, i) => i + 1) : [1, ...(cur > 3 ? ['…'] : []), ...[cur - 1, cur, cur + 1].filter((n) => n > 1 && n < pages), ...(cur < pages - 2 ? ['…'] : []), pages]
  const nFilters = (actor !== '') + (range !== 'all')
  const visibleTabs = TABS.filter(([k]) => k === 'all' || rows.some((a) => a.area === k))

  return (
    <div className="ord prd">
      <div className="ord-head">
        <div>
          <h2>Audit log</h2>
          <p className="muted">Every price, stock, order and settings change, with who made it and when</p>
        </div>
        <div className="ord-actions">
          <button type="button" className="btn-mini lg" onClick={exportCsv}><Icon name="Download" size={15} /> Export{selected.length ? ` (${selected.length})` : ''}</button>
        </div>
      </div>

      {showStats && (
        <div className="prd-stats">
          {stats.map(([ico, tone, l, v, note]) => (
            <div key={l} className="prd-stat">
              <span className={`prd-stat-ico ${tone}`}><Icon name={ico} size={22} /></span>
              <div><span className="muted small">{l}</span><b>{v}</b><span className="muted small" title={note}>{note}</span></div>
            </div>
          ))}
        </div>
      )}

      <div className="ord-tabs" role="tablist">
        {visibleTabs.map(([k, l]) => { const n = rows.filter((a) => a.area === k).length; return (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}{k !== 'all' && n > 0 && <i>{n}</i>}</button>
        ) })}
      </div>

      <div className="prd-sub">
        <label className="ord-search"><Icon name="Search" size={16} /><input id="au-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search changes, SKUs, orders or people…" /></label>
        <div className="prd-bar-r">
          {selected.length > 0 && (
            <div className="prd-selbar">
              <b>{selected.length} selected</b>
              <button type="button" className="btn-mini" onClick={() => setSel(new Set())}><Icon name="X" size={14} /> Clear</button>
            </div>
          )}
          <div className="om-wrap" ref={fRef}>
            <button type="button" className={`btn-mini lg ${nFilters ? 'active' : ''}`} onClick={() => setFilterOpen((o) => !o)} aria-expanded={filterOpen}><Icon name="Funnel" size={15} /> Filter{nFilters ? ` (${nFilters})` : ''}</button>
            {filterOpen && (
              <div className="om-menu right ord-filter">
                <label><span>Team member</span><select value={actor} onChange={(e) => setActor(e.target.value)}><option value="">Everyone</option>{actors.map((x) => <option key={x}>{x}</option>)}</select></label>
                <label><span>Period</span><select value={range} onChange={(e) => setRange(e.target.value)}><option value="all">All time</option><option value="today">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select></label>
                <button type="button" className="btn-mini" onClick={() => { setActor(''); setRange('all') }}>Reset filters</button>
              </div>
            )}
          </div>
          <Menu label={<><Icon name="ArrowUpDown" size={15} /> Sort</>} className="btn-mini lg" items={[['desc', 'Newest first'], ['asc', 'Oldest first']].map(([k, l]) => ({ label: l, icon: sort === k ? 'Check' : undefined, onClick: () => setSort(k) }))} />
          <label className="prd-switch">Show Statistics
            <button type="button" className={`toggle ${showStats ? 'on' : ''}`} onClick={() => dispatch({ type: 'setAdmin', key: 'auditView', value: { stats: !showStats } })} aria-pressed={showStats} aria-label="Show statistics"><motion.span layout transition={spring} /></button>
          </label>
        </div>
      </div>

      <div className="table-wrap ord-table prd-table au-table">
        <table className="tbl">
          <thead><tr>
            <th className="ord-cb"><input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Select all entries on this page" /></th>
            <th><button type="button" className="th-sort on" onClick={() => setSort(sort === 'asc' ? 'desc' : 'asc')}>When<Icon name={sort === 'asc' ? 'ChevronUp' : 'ChevronDown'} size={13} /></button></th>
            <th>Team member</th>
            <th>Area</th>
            <th>Change</th>
          </tr></thead>
          <tbody>
            {shown.map((a) => (
              <tr key={a.id} className={sel.has(a.id) ? 'sel' : ''}>
                <td className="ord-cb"><input type="checkbox" checked={sel.has(a.id)} onChange={() => toggle(a.id)} aria-label={`Select change at ${when(a.at)}`} /></td>
                <td className="nowrap small"><b>{when(a.at)}</b><div className="muted">{ago(a.at)}</div></td>
                <td><div className="ord-cust"><span className="cust-av">{initials(a.actor)}</span><span className="small">{a.actor}</span></div></td>
                <td className="nowrap"><em className={`chip ${AREA_TONE[a.area]} row-ico au-area`}><Icon name={a.icon} size={12} /> {a.areaLabel}</em></td>
                <td className="au-text">{a.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <div className="ord-empty"><Icon name="SearchX" size={22} /><b>No changes here</b><span className="muted small">Try another tab, filter or search.</span></div>}
      </div>

      <div className="ord-pager">
        <span className="small muted">{filtered.length ? `Showing ${(cur - 1) * per + 1}–${Math.min(cur * per, filtered.length)} of ${filtered.length}` : '0 entries'}</span>
        <label className="small muted">Per page <select value={per} onChange={(e) => setPer(+e.target.value)}>{[10, 20, 50].map((n) => <option key={n}>{n}</option>)}</select></label>
        <nav className="ord-pages" aria-label="Pages">
          <button type="button" className="pg" disabled={cur === 1} onClick={() => setPage(cur - 1)} aria-label="Previous page"><Icon name="ChevronLeft" size={14} /></button>
          {pageNums.map((n, i) => n === '…' ? <span key={`e${i}`} className="pg-gap">…</span> : <button type="button" key={n} className={`pg ${n === cur ? 'on' : ''}`} aria-current={n === cur ? 'page' : undefined} onClick={() => setPage(n)}>{n}</button>)}
          <button type="button" className="pg" disabled={cur === pages} onClick={() => setPage(cur + 1)} aria-label="Next page"><Icon name="ChevronRight" size={14} /></button>
        </nav>
      </div>
    </div>
  )
}
