// Operations dashboard: Procurement (purchase orders to China suppliers). Same layout
// as Orders, Products, Customers, Inventory and Logistics. Sample POs are
// deterministic; changes and new POs are saved in state.admin.pos.
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useStore } from '../store/Store'
import { Icon } from '../components/Icon'
import { ProductArt, spring } from '../components/ui'
import { patchProduct } from '../data/catalog'
import { naira } from '../lib/commerce'
import { Menu, useOutside } from './AdminOrders'

const DAY = 864e5
const FX = 214.6 // NGN per CNY, same snapshot as the landed-cost breakdown
const yuan = (v) => `¥${v.toLocaleString('en', { maximumFractionDigits: 2 })}`
const compact = (v) => v >= 1e9 ? `₦${(v / 1e9).toFixed(2)}bn` : v >= 1e6 ? `₦${(v / 1e6).toFixed(1)}m` : naira(v)
const fmtDate = (t) => new Date(t).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
const STAGES = ['Sent to supplier', 'In production', 'Shipped', 'Received']
const STAGE_TONE = ['info', 'warn', 'brand', 'good']
const TERMS = [['deposit', '30% deposit, balance before shipping'], ['full', 'Paid in full upfront'], ['delivery', 'Pay on delivery to China warehouse']]
const TABS = [['all', 'All'], ['unpaid', 'Awaiting payment'], ['prod', 'In production'], ['shipped', 'Shipped'], ['received', 'Received'], ['short', 'Discrepancies'], ['cancelled', 'Cancelled']]
const SORTS = [['created', 'Newest'], ['total', 'Order value'], ['qty', 'Units ordered'], ['due', 'Expected date']]

function demoPOs(products) {
  const pool = products.filter((p) => !p.custom)
  return Array.from({ length: 16 }, (_, i) => {
    const p = pool[(i * 7) % pool.length]
    const stage = [3, 1, 2, 0, 3, 1, 2, 3, 0, 1, 3, 2, 1, 3, 0, 2][i]
    const qty = p.moq * (1 + (i % 4))
    const created = Date.now() - (1 + i * 4) * DAY
    const received = stage === 3 ? (i % 5 === 0 ? Math.round(qty * 0.92) : qty) : 0
    const payment = stage >= 2 ? 'Paid' : i % 3 === 0 ? 'Unpaid' : 'Deposit'
    return { id: `PO-26${1040 + i}`, pid: p.id, supplier: p.supplier, unit: p.landed.sourceCost, qty, received, stage, payment, terms: i % 3 === 0 ? 'delivery' : 'deposit', created, due: created + (p.leadDays + 12) * DAY, status: 'open' }
  })
}

export default function Procurement({ products, edit, openNew, onOpened }) {
  const { state, dispatch, toast } = useStore()
  const saved = state.admin.pos || {}
  const showStats = (state.admin.procurementView || {}).stats !== false
  const rows = useMemo(() => {
    const demo = demoPOs(products).map((po) => ({ ...po, ...saved[po.id] }))
    const added = Object.values(saved).filter((po) => po && po.custom)
    return [...added, ...demo].map((po) => ({ ...po, p: products.find((x) => x.id === po.pid), totalY: po.unit * po.qty, total: Math.round(po.unit * po.qty * FX), short: po.stage === 3 ? Math.max(0, po.qty - po.received) : 0 })).filter((po) => po.p)
  }, [saved, products])

  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [supplier, setSupplier] = useState('')
  const [sort, setSort] = useState(['created', 'desc'])
  const [per, setPer] = useState(10)
  const [page, setPage] = useState(1)
  const [sel, setSel] = useState(new Set())
  const [filterOpen, setFilterOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const fRef = useOutside(filterOpen, () => setFilterOpen(false))
  useEffect(() => { if (openNew) { if (edit) setCreating(true); onOpened?.() } }, [openNew]) // eslint-disable-line react-hooks/exhaustive-deps

  const live = (po) => po.status !== 'cancelled'
  const inTab = (po, t) => ({
    all: true,
    unpaid: live(po) && po.payment !== 'Paid',
    prod: live(po) && po.stage <= 1,
    shipped: live(po) && po.stage === 2,
    received: live(po) && po.stage === 3,
    short: live(po) && po.short > 0,
    cancelled: !live(po),
  }[t])
  const val = { created: (po) => po.created, total: (po) => po.total, qty: (po) => po.qty, due: (po) => po.due }[sort[0]]
  const filtered = rows
    .filter((po) => inTab(po, tab) && (!supplier || po.supplier === supplier) && `${po.id} ${po.supplier} ${po.p.title} ${po.p.sku}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * (sort[1] === 'asc' ? 1 : -1) })
  const pages = Math.max(1, Math.ceil(filtered.length / per))
  const cur = Math.min(page, pages)
  const shown = filtered.slice((cur - 1) * per, cur * per)
  useEffect(() => { setPage(1); setSel(new Set()) }, [tab, q, supplier, per, sort])

  const open = rows.filter((po) => live(po) && po.stage < 3)
  const owed = rows.filter((po) => live(po) && po.payment !== 'Paid').reduce((n, po) => n + (po.payment === 'Deposit' ? po.total * 0.7 : po.total), 0)
  const shortUnits = rows.filter(live).reduce((n, po) => n + po.short, 0)
  const stats = [
    ['ReceiptText', 't-orange', 'Open POs', open.length, `${new Set(open.map((po) => po.supplier)).size} suppliers`],
    ['Banknote', 't-blue', 'Committed Spend', compact(open.reduce((n, po) => n + po.total, 0)), `${yuan(Math.round(open.reduce((n, po) => n + po.totalY, 0)))} at ₦${FX}/¥`],
    ['Wallet', 't-sun', 'Owed to Suppliers', compact(owed), `${rows.filter((po) => live(po) && po.payment !== 'Paid').length} POs not fully paid`],
    ['TriangleAlert', 't-red', 'Units Short', shortUnits.toLocaleString(), `${rows.filter((po) => live(po) && po.short > 0).length} POs received with gaps`],
  ]

  const save = (po, patch, log) => dispatch({ type: 'setAdmin', key: 'pos', value: { [po.id]: { ...saved[po.id], ...patch } }, log })
  const advance = (po) => {
    const next = po.stage + 1
    if (next === 3) receive(po)
    else save(po, { stage: next, ...(next === 2 && po.payment !== 'Paid' && po.terms !== 'delivery' ? { payment: 'Paid' } : {}) }, `${po.id} → ${STAGES[next]}`)
  }
  // Receiving adds the units to Lagos stock so Inventory and the storefront see them
  const receive = (po) => {
    save(po, { stage: 3, received: po.qty, payment: 'Paid' }, `${po.id} received: ${po.qty} units of ${po.p.sku}`)
    const patch = { stock: 'nigeria', qty: (po.p.stock === 'nigeria' ? po.p.qty : 0) + po.qty }
    patchProduct(po.p.id, patch); dispatch({ type: 'updateCatalog', id: po.p.id, patch })
  }
  const markPaid = (po) => save(po, { payment: 'Paid' }, `${po.id} supplier payment completed`)
  const cancel = (po) => save(po, { status: 'cancelled' }, `${po.id} cancelled`)
  const selected = filtered.filter((po) => sel.has(po.id))
  const bulkPaid = () => { const list = selected.filter((po) => live(po) && po.payment !== 'Paid'); list.forEach(markPaid); toast(`Marked ${list.length} PO${list.length === 1 ? '' : 's'} as paid`, { icon: 'CircleCheck' }); setSel(new Set()) }
  const exportCsv = () => {
    const list = selected.length ? selected : filtered
    const head = ['PO', 'Created', 'Supplier', 'SKU', 'Product', 'Unit cost (CNY)', 'Ordered', 'Received', 'Total (CNY)', 'Total (NGN)', 'Payment', 'Status']
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`
    const csv = [head, ...list.map((po) => [po.id, new Date(po.created).toISOString().slice(0, 10), po.supplier, po.p.sku, po.p.title, po.unit, po.qty, po.received, po.totalY.toFixed(2), po.total, po.payment, live(po) ? STAGES[po.stage] : 'Cancelled'])].map((r) => r.map(esc).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `oja-purchase-orders-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    toast(`Exported ${list.length} purchase order${list.length === 1 ? '' : 's'} to CSV`, { icon: 'CircleCheck' })
  }
  const allOnPage = shown.length > 0 && shown.every((po) => sel.has(po.id))
  const toggleAll = () => setSel(allOnPage ? new Set([...sel].filter((id) => !shown.some((po) => po.id === id))) : new Set([...sel, ...shown.map((po) => po.id)]))
  const toggle = (id) => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n) }
  const sortBy = (k) => setSort(([sk, dir]) => [k, sk === k ? (dir === 'asc' ? 'desc' : 'asc') : k === 'due' ? 'asc' : 'desc'])
  const Th = ({ k, label }) => (
    <th aria-sort={sort[0] === k ? (sort[1] === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button type="button" className={`th-sort ${sort[0] === k ? 'on' : ''}`} onClick={() => sortBy(k)}>{label}<Icon name={sort[0] === k ? (sort[1] === 'asc' ? 'ChevronUp' : 'ChevronDown') : 'ChevronsUpDown'} size={13} /></button>
    </th>
  )
  const statusChip = (po) => !live(po) ? <em className="chip bad">Cancelled</em> : <em className={`chip ${STAGE_TONE[po.stage]}`}>{STAGES[po.stage]}</em>
  const payChip = (po) => <span className={`pay-dot ${po.payment === 'Paid' ? 'paid' : po.payment === 'Deposit' ? 'pending' : 'failed'}`}>{po.payment === 'Deposit' ? '30% deposit' : po.payment}</span>
  const rowMenu = (po) => !live(po) ? [{ label: 'Restore PO', icon: 'RotateCcw', disabled: !edit, onClick: () => save(po, { status: 'open' }, `${po.id} restored`) }] : [
    po.stage < 2 && { label: `Move to “${STAGES[po.stage + 1]}”`, icon: 'ArrowRight', disabled: !edit, onClick: () => advance(po) },
    po.stage === 2 && { label: `Receive ${po.qty.toLocaleString()} units into Lagos`, icon: 'Warehouse', disabled: !edit, onClick: () => { receive(po); toast(`${po.qty.toLocaleString()} units of ${po.p.sku} added to Lagos stock`, { icon: 'CircleCheck' }) } },
    po.payment !== 'Paid' && { label: 'Mark supplier as paid', icon: 'BadgeCheck', disabled: !edit, onClick: () => markPaid(po) },
    po.stage < 3 && '-',
    po.stage < 3 && { label: 'Cancel PO', icon: 'X', danger: true, disabled: !edit, onClick: () => cancel(po) },
  ].filter(Boolean)
  const pageNums = pages <= 7 ? Array.from({ length: pages }, (_, i) => i + 1) : [1, ...(cur > 3 ? ['…'] : []), ...[cur - 1, cur, cur + 1].filter((n) => n > 1 && n < pages), ...(cur < pages - 2 ? ['…'] : []), pages]
  const suppliers = [...new Set(rows.map((po) => po.supplier))].sort()

  return (
    <div className="ord prd">
      <div className="ord-head">
        <div>
          <h2>Procurement</h2>
          <p className="muted">Raise purchase orders, pay suppliers, and check what arrives</p>
        </div>
        <div className="ord-actions">
          <button type="button" className="btn-mini lg" onClick={exportCsv}><Icon name="Download" size={15} /> Export{selected.length ? ` (${selected.length})` : ''}</button>
          <button type="button" className="btn-orange" disabled={!edit} onClick={() => setCreating(true)}><Icon name="Plus" size={16} /> New Purchase Order</button>
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
        {TABS.map(([k, l]) => { const n = rows.filter((po) => inTab(po, k)).length; return (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}{k !== 'all' && n > 0 && <i>{n}</i>}</button>
        ) })}
      </div>

      <div className="prd-sub">
        <label className="ord-search"><Icon name="Search" size={16} /><input id="po-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search PO, supplier or product…" /></label>
        <div className="prd-bar-r">
          {selected.length > 0 && (
            <div className="prd-selbar">
              <b>{selected.length} selected</b>
              <button type="button" className="btn-mini" disabled={!edit || !selected.some((po) => live(po) && po.payment !== 'Paid')} onClick={bulkPaid}><Icon name="BadgeCheck" size={14} /> Mark paid</button>
              <button type="button" className="btn-mini" onClick={() => setSel(new Set())}><Icon name="X" size={14} /> Clear</button>
            </div>
          )}
          <div className="om-wrap" ref={fRef}>
            <button type="button" className={`btn-mini lg ${supplier ? 'active' : ''}`} onClick={() => setFilterOpen((o) => !o)} aria-expanded={filterOpen}><Icon name="Funnel" size={15} /> Filter{supplier ? ' (1)' : ''}</button>
            {filterOpen && (
              <div className="om-menu right ord-filter">
                <label><span>Supplier</span><select value={supplier} onChange={(e) => setSupplier(e.target.value)}><option value="">All suppliers</option>{suppliers.map((x) => <option key={x}>{x}</option>)}</select></label>
                <button type="button" className="btn-mini" onClick={() => setSupplier('')}>Reset filters</button>
              </div>
            )}
          </div>
          <Menu label={<><Icon name="ArrowUpDown" size={15} /> Sort</>} className="btn-mini lg" items={SORTS.map(([k, l]) => ({ label: `${l}${sort[0] === k ? (sort[1] === 'asc' ? ' ↑' : ' ↓') : ''}`, icon: sort[0] === k ? 'Check' : undefined, onClick: () => sortBy(k) }))} />
          <label className="prd-switch">Show Statistics
            <button type="button" className={`toggle ${showStats ? 'on' : ''}`} onClick={() => dispatch({ type: 'setAdmin', key: 'procurementView', value: { stats: !showStats } })} aria-pressed={showStats} aria-label="Show statistics"><motion.span layout transition={spring} /></button>
          </label>
        </div>
      </div>

      <div className="table-wrap ord-table prd-table po-table">
        <table className="tbl">
          <thead><tr>
            <th className="ord-cb"><input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Select all purchase orders on this page" /></th>
            <Th k="created" label="PO" />
            <th>Supplier</th>
            <th>Product</th>
            <Th k="qty" label="Units" />
            <Th k="total" label="Total" />
            <th>Payment</th>
            <Th k="due" label="Expected" />
            <th>Status</th>
            <th>Action</th>
          </tr></thead>
          <tbody>
            {shown.map((po) => (
              <tr key={po.id} className={sel.has(po.id) ? 'sel' : ''}>
                <td className="ord-cb"><input type="checkbox" checked={sel.has(po.id)} onChange={() => toggle(po.id)} aria-label={`Select ${po.id}`} /></td>
                <td className="nowrap"><b>{po.id}</b><div className="muted small">{fmtDate(po.created)}</div></td>
                <td className="small po-sup">{po.supplier}</td>
                <td><div className="ord-prod"><span className="ord-thumb"><ProductArt p={po.p} size="xs" /></span><div><div className="clamp1">{po.p.title}</div><span className="muted small">{yuan(po.unit)} / unit</span></div></div></td>
                <td className="nowrap">{po.stage === 3 ? <>{po.received.toLocaleString()}<span className="muted"> / {po.qty.toLocaleString()}</span>{po.short > 0 && <div><em className="chip warn">−{po.short} short</em></div>}</> : po.qty.toLocaleString()}</td>
                <td className="nowrap"><b>{naira(po.total)}</b><div className="muted small">{yuan(Math.round(po.totalY))}</div></td>
                <td>{payChip(po)}</td>
                <td className="small nowrap">{po.stage === 3 ? '—' : fmtDate(po.due)}</td>
                <td className="nowrap">{statusChip(po)}</td>
                <td><Menu icon="Ellipsis" items={rowMenu(po)} className="icon-btn" label="" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <div className="ord-empty"><Icon name="SearchX" size={22} /><b>No purchase orders here</b><span className="muted small">Try another tab, filter or search.</span></div>}
      </div>

      <div className="ord-pager">
        <span className="small muted">{filtered.length ? `Showing ${(cur - 1) * per + 1}–${Math.min(cur * per, filtered.length)} of ${filtered.length}` : '0 purchase orders'}</span>
        <label className="small muted">Per page <select value={per} onChange={(e) => setPer(+e.target.value)}>{[10, 20, 50].map((n) => <option key={n}>{n}</option>)}</select></label>
        <nav className="ord-pages" aria-label="Pages">
          <button type="button" className="pg" disabled={cur === 1} onClick={() => setPage(cur - 1)} aria-label="Previous page"><Icon name="ChevronLeft" size={14} /></button>
          {pageNums.map((n, i) => n === '…' ? <span key={`e${i}`} className="pg-gap">…</span> : <button type="button" key={n} className={`pg ${n === cur ? 'on' : ''}`} aria-current={n === cur ? 'page' : undefined} onClick={() => setPage(n)}>{n}</button>)}
          <button type="button" className="pg" disabled={cur === pages} onClick={() => setPage(cur + 1)} aria-label="Next page"><Icon name="ChevronRight" size={14} /></button>
        </nav>
      </div>
      {creating && <NewPOModal products={products} taken={rows} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); setTab('all'); setQ(''); setSupplier(''); setSort(['created', 'desc']) }} />}
    </div>
  )
}

/* ---------- New purchase order ---------- */
function NewPOModal({ products, taken, onClose, onCreated }) {
  const { dispatch, toast } = useStore()
  const sorted = useMemo(() => [...products].filter((p) => !p.custom || p.supplier).sort((a, b) => (a.stock === 'nigeria' && a.qty < 100 ? 0 : a.stock === 'oos' ? 0 : 1) - (b.stock === 'nigeria' && b.qty < 100 ? 0 : b.stock === 'oos' ? 0 : 1) || a.title.localeCompare(b.title)), [products])
  const [pid, setPid] = useState('')
  const p = products.find((x) => x.id === pid)
  const [f, setF] = useState({ qty: '', unit: '', terms: 'deposit', due: '' })
  const [tried, setTried] = useState(false)
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  const pick = (id) => {
    setPid(id)
    const np = products.find((x) => x.id === id)
    if (np) setF({ ...f, qty: String(np.moq || 50), unit: String(np.landed.sourceCost), due: new Date(Date.now() + ((np.leadDays || 7) + 12) * DAY).toISOString().slice(0, 10) })
  }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const qty = Math.floor(Number(f.qty)), unit = Number(f.unit)
  const dueT = f.due ? new Date(f.due + 'T12:00:00').getTime() : NaN
  const errors = {
    prod: !p ? 'Choose a product.' : '',
    qty: !(qty > 0 && qty <= 1e6) ? 'Enter how many units, from 1 to 1,000,000.' : '',
    unit: !(unit > 0 && unit < 1e5) ? 'Enter the unit cost in yuan.' : '',
    due: !(dueT > Date.now() - DAY) ? 'Choose a date from today on.' : '',
  }
  const bad = Object.values(errors).some(Boolean)
  const show = (k) => tried && errors[k] && <div className="err small">{errors[k]}</div>
  const totalY = qty > 0 && unit > 0 ? qty * unit : 0
  const create = (e) => {
    e.preventDefault(); setTried(true)
    if (bad) { document.getElementById(`po-${Object.keys(errors).find((k) => errors[k])}`)?.focus(); return }
    let n = 1040 + taken.length, id
    do { id = `PO-26${n++}` } while (taken.some((po) => po.id === id))
    const po = { id, pid: p.id, supplier: p.supplier, unit, qty, received: 0, stage: 0, payment: f.terms === 'full' ? 'Paid' : f.terms === 'deposit' ? 'Deposit' : 'Unpaid', terms: f.terms, created: Date.now(), due: dueT, status: 'open', custom: true }
    dispatch({ type: 'setAdmin', key: 'pos', value: { [id]: po }, log: `Raised ${id}: ${qty} × ${p.sku} from ${p.supplier}` })
    toast(`${id} sent to ${p.supplier}`, { icon: 'CircleCheck' })
    onCreated()
  }
  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <form className="co-modal ac-modal" role="dialog" aria-modal="true" aria-labelledby="po-title" onSubmit={create} noValidate>
        <div className="co-head">
          <div><h3 id="po-title">New purchase order</h3><p className="muted small">Order stock from a supplier in China.</p></div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="X" size={20} /></button>
        </div>
        <div className="co-body">
          <section className="co-sec">
            <label className="set-field"><span>Product</span>
              <select id="po-prod" value={pid} onChange={(e) => pick(e.target.value)}>
                <option value="">Choose a product…</option>
                {sorted.map((x) => <option key={x.id} value={x.id}>{(x.stock === 'nigeria' && x.qty < 100) || x.stock === 'oos' ? '⚠ Low · ' : ''}{x.title.slice(0, 48)} ({x.sku})</option>)}
              </select>
            </label>
            {show('prod')}
            {p && <div className="rs-now"><span className="ord-thumb"><ProductArt p={p} size="xs" /></span><div className="small"><b>{p.supplier}</b><div className="muted">Minimum order {p.moq} units · {p.leadDays} days to make · {p.stock === 'oos' ? 0 : p.qty} in stock now</div></div></div>}
            <div className="pe-2">
              <label className="set-field"><span>Units</span><input id="po-qty" type="number" min="1" inputMode="numeric" value={f.qty} onChange={set('qty')} placeholder="e.g. 200" /></label>
              <label className="set-field"><span>Unit cost (¥)</span><input id="po-unit" type="number" min="0" step="0.01" inputMode="decimal" value={f.unit} onChange={set('unit')} placeholder="e.g. 28.50" /></label>
            </div>
            {show('qty')}{show('unit')}
            {p && qty > 0 && qty < p.moq && <p className="small po-warn"><Icon name="TriangleAlert" size={14} /> Below the supplier’s minimum of {p.moq} units, so they may refuse or charge more.</p>}
            <div className="pe-2">
              <label className="set-field"><span>Payment terms</span><select id="po-terms" value={f.terms} onChange={set('terms')}>{TERMS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
              <label className="set-field"><span>Expected ready date</span><input id="po-due" type="date" value={f.due} onChange={set('due')} /></label>
            </div>
            {show('due')}
          </section>
        </div>
        <div className="co-foot">
          <div className="co-sum"><span>Total <b>{yuan(Math.round(totalY * 100) / 100)}</b></span><span>≈ <b>{naira(Math.round(totalY * FX))}</b> at ₦{FX}/¥</span></div>
          {tried && bad && <div className="err small">Fix the highlighted fields to raise the purchase order.</div>}
          <div className="co-actions"><button type="button" className="btn-mini lg" onClick={onClose}>Cancel</button><button className="btn-orange"><Icon name="Plus" size={16} /> Raise PO</button></div>
        </div>
      </form>
    </>
  , document.body)
}
