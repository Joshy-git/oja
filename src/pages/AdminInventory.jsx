// Operations dashboard: Inventory (stock by location, low-stock alerts, quick
// adjustments, restock pop-up, CSV export). Same layout as Orders, Products and Customers.
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useStore } from '../store/Store'
import { Icon } from '../components/Icon'
import { ProductArt, spring } from '../components/ui'
import { CATEGORIES, STOCK, patchProduct } from '../data/catalog'
import { naira } from '../lib/commerce'
import { Menu, useOutside } from './AdminOrders'

const compact = (v) => v >= 1e9 ? `₦${(v / 1e9).toFixed(2)}bn` : v >= 1e6 ? `₦${(v / 1e6).toFixed(1)}m` : naira(v)
const catName = (id) => CATEGORIES.find((c) => c.id === id)?.name || 'Uncategorised'
const LOCATIONS = [['nigeria', 'Lagos warehouse'], ['transit', 'In transit'], ['china', 'China warehouse'], ['preorder', 'Pre-order'], ['oos', 'Out of stock']]
const locName = (k) => LOCATIONS.find((l) => l[0] === k)?.[1] || STOCK[k]?.short
const TABS = [['all', 'All'], ['in', 'In stock'], ['low', 'Low stock'], ['transit', 'In transit'], ['china', 'China warehouse'], ['preorder', 'Pre-order'], ['out', 'Out of stock']]
const SORTS = [['qty', 'On hand'], ['value', 'Stock value'], ['title', 'Name (A–Z)'], ['sold', 'Best sellers']]

export default function Inventory({ products, edit, lowStock }) {
  const { state, dispatch, toast } = useStore()
  const showStats = (state.admin.inventoryView || {}).stats !== false
  const status = (p) => p.stock === 'oos' || (p.stock === 'nigeria' && p.qty <= 0) ? ['out', 'Out of stock', 'bad']
    : p.stock === 'nigeria' ? (p.qty < lowStock ? ['low', 'Low stock', 'warn'] : ['in', 'In stock', 'good'])
    : p.stock === 'transit' ? ['transit', 'In transit', 'info'] : p.stock === 'china' ? ['china', 'China stock', 'info'] : ['preorder', 'Pre-order', 'warn']
  const rows = useMemo(() => products.map((p) => { const units = p.stock === 'oos' ? 0 : p.qty; return { ...p, st: status(p), units, value: units * p.landed.total } }), [products, lowStock]) // eslint-disable-line react-hooks/exhaustive-deps

  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [sort, setSort] = useState(['qty', 'asc'])
  const [per, setPer] = useState(10)
  const [page, setPage] = useState(1)
  const [sel, setSel] = useState(new Set())
  const [filterOpen, setFilterOpen] = useState(false)
  const [restock, setRestock] = useState(null) // product id, '' for blank form, or null
  const fRef = useOutside(filterOpen, () => setFilterOpen(false))

  const inTab = (p, t) => t === 'all' || p.st[0] === t
  const val = { qty: (p) => p.units, value: (p) => p.value, title: (p) => p.title.toLowerCase(), sold: (p) => p.sold || 0 }[sort[0]]
  const filtered = rows
    .filter((p) => inTab(p, tab) && (!cat || p.category === cat) && `${p.title} ${p.sku} ${catName(p.category)}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * (sort[1] === 'asc' ? 1 : -1) })
  const pages = Math.max(1, Math.ceil(filtered.length / per))
  const cur = Math.min(page, pages)
  const shown = filtered.slice((cur - 1) * per, cur * per)
  useEffect(() => { setPage(1); setSel(new Set()) }, [tab, q, cat, per, sort])

  const sum = (list) => list.reduce((n, p) => n + p.units, 0)
  const local = rows.filter((p) => p.stock === 'nigeria')
  const incoming = rows.filter((p) => p.stock === 'transit' || p.stock === 'china')
  const low = rows.filter((p) => p.st[0] === 'low')
  const stats = [
    ['Warehouse', 't-green', 'Units in Lagos', sum(local).toLocaleString(), `${local.length} SKUs ready to ship`],
    ['Ship', 't-blue', 'Incoming Units', sum(incoming).toLocaleString(), `${rows.filter((p) => p.stock === 'transit').length} in transit · ${rows.filter((p) => p.stock === 'china').length} in China`],
    ['TriangleAlert', 't-orange', 'Low Stock SKUs', low.length, `Under ${lowStock} units in Lagos`],
    ['Banknote', 't-sun', 'Stock Value', compact(rows.reduce((n, p) => n + p.value, 0)), 'At landed cost'],
  ]

  const update = (p, patch) => { patchProduct(p.id, patch); dispatch({ type: 'updateCatalog', id: p.id, patch }) }
  const selected = filtered.filter((p) => sel.has(p.id))
  const moveSelected = (loc) => { selected.forEach((p) => update(p, loc === 'oos' ? { stock: 'oos', qty: 0 } : { stock: loc })); toast(`Moved ${selected.length} product${selected.length === 1 ? '' : 's'} to ${locName(loc)}`, { icon: 'CircleCheck' }); setSel(new Set()) }
  const exportCsv = () => {
    const list = selected.length ? selected : filtered
    const head = ['SKU', 'Product', 'Category', 'Location', 'On hand', 'Landed cost (NGN)', 'Stock value (NGN)', 'Status']
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`
    const csv = [head, ...list.map((p) => [p.sku, p.title, catName(p.category), locName(p.stock), p.units, p.landed.total, p.value, p.st[1]])].map((r) => r.map(esc).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `oja-inventory-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    toast(`Exported ${list.length} product${list.length === 1 ? '' : 's'} to CSV`, { icon: 'CircleCheck' })
  }
  const allOnPage = shown.length > 0 && shown.every((p) => sel.has(p.id))
  const toggleAll = () => setSel(allOnPage ? new Set([...sel].filter((id) => !shown.some((p) => p.id === id))) : new Set([...sel, ...shown.map((p) => p.id)]))
  const toggle = (id) => { const s = new Set(sel); s.has(id) ? s.delete(id) : s.add(id); setSel(s) }
  const sortBy = (k) => setSort(([sk, dir]) => [k, sk === k ? (dir === 'asc' ? 'desc' : 'asc') : k === 'title' || k === 'qty' ? 'asc' : 'desc'])
  const Th = ({ k, label }) => (
    <th aria-sort={sort[0] === k ? (sort[1] === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button type="button" className={`th-sort ${sort[0] === k ? 'on' : ''}`} onClick={() => sortBy(k)}>{label}<Icon name={sort[0] === k ? (sort[1] === 'asc' ? 'ChevronUp' : 'ChevronDown') : 'ChevronsUpDown'} size={13} /></button>
    </th>
  )
  const rowMenu = (p) => [
    { label: 'Restock…', icon: 'Plus', disabled: !edit, onClick: () => setRestock(p.id) },
    p.stock !== 'nigeria' && { label: 'Mark as arrived in Lagos', icon: 'Warehouse', disabled: !edit, onClick: () => { update(p, { stock: 'nigeria' }); toast(`${p.sku} is now in the Lagos warehouse`, { icon: 'CircleCheck' }) } },
    '-',
    p.stock !== 'oos' && { label: 'Mark out of stock', icon: 'PackageX', danger: true, disabled: !edit, onClick: () => { update(p, { stock: 'oos', qty: 0 }); toast(`${p.sku} marked out of stock`, { icon: 'CircleCheck' }) } },
  ].filter(Boolean)
  const pageNums = pages <= 7 ? Array.from({ length: pages }, (_, i) => i + 1) : [1, ...(cur > 3 ? ['…'] : []), ...[cur - 1, cur, cur + 1].filter((n) => n > 1 && n < pages), ...(cur < pages - 2 ? ['…'] : []), pages]

  return (
    <div className="ord prd">
      <div className="ord-head">
        <div>
          <h2>Inventory</h2>
          <p className="muted">Track stock by location, restock fast, and catch low stock early</p>
        </div>
        <div className="ord-actions">
          <button type="button" className="btn-mini lg" onClick={exportCsv}><Icon name="Download" size={15} /> Export{selected.length ? ` (${selected.length})` : ''}</button>
          <button type="button" className="btn-orange" disabled={!edit} onClick={() => setRestock('')}><Icon name="Plus" size={16} /> Restock</button>
        </div>
      </div>

      {showStats && (
        <div className="prd-stats">
          {stats.map(([ico, tone, l, v, note]) => (
            <div key={l} className="prd-stat">
              <span className={`prd-stat-ico ${tone}`}><Icon name={ico} size={22} /></span>
              <div><span className="muted small">{l}</span><b>{v}</b><span className="muted small">{note}</span></div>
            </div>
          ))}
        </div>
      )}

      <div className="ord-tabs" role="tablist">
        {TABS.map(([k, l]) => { const n = rows.filter((p) => inTab(p, k)).length; return (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}{k !== 'all' && n > 0 && <i>{n}</i>}</button>
        ) })}
      </div>

      <div className="prd-sub">
        <label className="ord-search"><Icon name="Search" size={16} /><input id="inv-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product, SKU or category…" /></label>
        <div className="prd-bar-r">
          {selected.length > 0 && (
            <div className="prd-selbar">
              <b>{selected.length} selected</b>
              <Menu label={<>Move to <Icon name="ChevronDown" size={14} /></>} className="btn-mini" items={LOCATIONS.map(([k, l]) => ({ label: l, disabled: !edit, onClick: () => moveSelected(k) }))} />
              <button type="button" className="btn-mini" onClick={() => setSel(new Set())}><Icon name="X" size={14} /> Clear</button>
            </div>
          )}
          <div className="om-wrap" ref={fRef}>
            <button type="button" className={`btn-mini lg ${cat ? 'active' : ''}`} onClick={() => setFilterOpen((o) => !o)} aria-expanded={filterOpen}><Icon name="Funnel" size={15} /> Filter{cat ? ' (1)' : ''}</button>
            {filterOpen && (
              <div className="om-menu right ord-filter">
                <label><span>Category</span><select value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{CATEGORIES.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
                <button type="button" className="btn-mini" onClick={() => setCat('')}>Reset filters</button>
              </div>
            )}
          </div>
          <Menu label={<><Icon name="ArrowUpDown" size={15} /> Sort</>} className="btn-mini lg" items={SORTS.map(([k, l]) => ({ label: `${l}${sort[0] === k ? (sort[1] === 'asc' ? ' ↑' : ' ↓') : ''}`, icon: sort[0] === k ? 'Check' : undefined, onClick: () => sortBy(k) }))} />
          <label className="prd-switch">Show Statistics
            <button type="button" className={`toggle ${showStats ? 'on' : ''}`} onClick={() => dispatch({ type: 'setAdmin', key: 'inventoryView', value: { stats: !showStats } })} aria-pressed={showStats} aria-label="Show statistics"><motion.span layout transition={spring} /></button>
          </label>
        </div>
      </div>

      <div className="table-wrap ord-table prd-table inv-table">
        <table className="tbl">
          <thead><tr>
            <th className="ord-cb"><input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Select all products on this page" /></th>
            <Th k="title" label="Product" />
            <th>Category</th>
            <th>Location</th>
            <Th k="qty" label="On hand" />
            <Th k="value" label="Stock value" />
            <th>Status</th>
            <th>Adjust</th>
            <th>Action</th>
          </tr></thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id} className={sel.has(p.id) ? 'sel' : ''}>
                <td className="ord-cb"><input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Select ${p.title}`} /></td>
                <td><div className="ord-prod prd-name"><span className="ord-thumb"><ProductArt p={p} size="xs" /></span><div><div className="clamp1">{p.title}</div><span className="muted small">{p.sku}</span></div></div></td>
                <td className="small nowrap">{catName(p.category)}</td>
                <td>
                  <select className="inv-loc" value={p.stock} disabled={!edit} onChange={(e) => update(p, e.target.value === 'oos' ? { stock: 'oos', qty: 0 } : { stock: e.target.value })} aria-label={`Location of ${p.title}`}>
                    {LOCATIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </td>
                <td className={`nowrap ${p.st[0] === 'low' || p.st[0] === 'out' ? 'bad' : ''}`}><b>{p.units.toLocaleString()}</b> pcs</td>
                <td className="nowrap">{compact(p.value)}</td>
                <td className="nowrap"><em className={`chip ${p.st[2]}`}>{p.st[1]}</em></td>
                <td>
                  <div className="inv-adj">
                    {[-10, 10, 100].map((d) => <button key={d} type="button" className="btn-mini" disabled={!edit || p.stock === 'oos' || (d < 0 && p.qty <= 0)} onClick={() => update(p, { qty: Math.max(0, p.qty + d) })} aria-label={`${d > 0 ? 'Add' : 'Remove'} ${Math.abs(d)} units of ${p.title}`}>{d > 0 ? '+' : '−'}{Math.abs(d)}</button>)}
                  </div>
                </td>
                <td><Menu icon="Ellipsis" items={rowMenu(p)} className="icon-btn" label="" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <div className="ord-empty"><Icon name="SearchX" size={22} /><b>No products here</b><span className="muted small">Try another tab, filter or search.</span></div>}
      </div>

      <div className="ord-pager">
        <span className="small muted">{filtered.length ? `Showing ${(cur - 1) * per + 1}–${Math.min(cur * per, filtered.length)} of ${filtered.length}` : '0 products'}</span>
        <label className="small muted">Per page <select value={per} onChange={(e) => setPer(+e.target.value)}>{[10, 20, 50].map((n) => <option key={n}>{n}</option>)}</select></label>
        <nav className="ord-pages" aria-label="Pages">
          <button type="button" className="pg" disabled={cur === 1} onClick={() => setPage(cur - 1)} aria-label="Previous page"><Icon name="ChevronLeft" size={14} /></button>
          {pageNums.map((n, i) => n === '…' ? <span key={`e${i}`} className="pg-gap">…</span> : <button type="button" key={n} className={`pg ${n === cur ? 'on' : ''}`} aria-current={n === cur ? 'page' : undefined} onClick={() => setPage(n)}>{n}</button>)}
          <button type="button" className="pg" disabled={cur === pages} onClick={() => setPage(cur + 1)} aria-label="Next page"><Icon name="ChevronRight" size={14} /></button>
        </nav>
      </div>
      {restock !== null && <RestockModal products={rows} initial={restock} onClose={() => setRestock(null)} onSave={(p, patch, n) => { update(p, patch); toast(`Added ${n.toLocaleString()} units of ${p.sku} at ${locName(patch.stock)}`, { icon: 'CircleCheck' }); setRestock(null) }} />}
    </div>
  )
}

/* ---------- Restock (receive a delivery or log incoming units) ---------- */
function RestockModal({ products, initial, onClose, onSave }) {
  const sorted = useMemo(() => [...products].sort((a, b) => (a.st[0] === 'low' || a.st[0] === 'out' ? 0 : 1) - (b.st[0] === 'low' || b.st[0] === 'out' ? 0 : 1) || a.title.localeCompare(b.title)), [products])
  const [id, setId] = useState(initial || '')
  const p = products.find((x) => x.id === id)
  const [loc, setLoc] = useState(p && p.stock !== 'oos' && p.stock !== 'preorder' ? p.stock : 'nigeria')
  const [units, setUnits] = useState('')
  const [tried, setTried] = useState(false)
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  const n = Math.floor(Number(units))
  const errors = { id: !p ? 'Choose a product.' : '', units: !(n > 0 && n <= 100000) ? 'Enter how many units, from 1 to 100,000.' : '' }
  const bad = Object.values(errors).some(Boolean)
  const same = p && p.stock === loc
  const after = p ? (same ? p.qty : 0) + (n > 0 ? n : 0) : 0
  const save = (e) => {
    e.preventDefault(); setTried(true)
    if (bad) { document.getElementById(errors.id ? 'rs-prod' : 'rs-units')?.focus(); return }
    onSave(p, { stock: loc, qty: after }, n)
  }
  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <form className="co-modal ac-modal" role="dialog" aria-modal="true" aria-labelledby="rs-title" onSubmit={save} noValidate>
        <div className="co-head">
          <div><h3 id="rs-title">Restock</h3><p className="muted small">Receive a delivery into Lagos, or log units on their way.</p></div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="X" size={20} /></button>
        </div>
        <div className="co-body">
          <section className="co-sec">
            <label className="set-field"><span>Product</span>
              <select id="rs-prod" value={id} onChange={(e) => { setId(e.target.value); const np = products.find((x) => x.id === e.target.value); if (np && np.stock !== 'oos' && np.stock !== 'preorder') setLoc(np.stock) }}>
                <option value="">Choose a product…</option>
                {sorted.map((x) => <option key={x.id} value={x.id}>{x.st[0] === 'low' || x.st[0] === 'out' ? `⚠ ${x.st[1]} · ` : ''}{x.title.slice(0, 48)} ({x.sku})</option>)}
              </select>
            </label>
            {tried && errors.id && <div className="err small">{errors.id}</div>}
            {p && <div className="rs-now"><span className="ord-thumb"><ProductArt p={p} size="xs" /></span><div className="small"><b>{p.units.toLocaleString()} units</b> now · {locName(p.stock)}<div className="muted">Landed cost {naira(p.landed.total)} per unit</div></div></div>}
            <div className="pe-2">
              <label className="set-field"><span>Units to add</span><input id="rs-units" type="number" min="1" step="1" inputMode="numeric" value={units} onChange={(e) => setUnits(e.target.value)} placeholder="e.g. 200" /></label>
              <label className="set-field"><span>Arriving at</span><select id="rs-loc" value={loc} onChange={(e) => setLoc(e.target.value)}>{LOCATIONS.slice(0, 3).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
            </div>
            {tried && errors.units && <div className="err small">{errors.units}</div>}
            {p && n > 0 && (
              <p className="small rs-after">
                After saving: <b>{after.toLocaleString()} units</b> at {locName(loc)}
                {!same && p.units > 0 && <span className="muted"> · moves this product from {locName(p.stock)}; its {p.units.toLocaleString()} units there aren’t counted</span>}
              </p>
            )}
          </section>
        </div>
        <div className="co-foot">
          {tried && bad && <div className="err small">Fix the highlighted fields to restock.</div>}
          <div className="co-actions"><button type="button" className="btn-mini lg" onClick={onClose}>Cancel</button><button className="btn-orange"><Icon name="Plus" size={16} /> Add stock</button></div>
        </div>
      </form>
    </>
  , document.body)
}
