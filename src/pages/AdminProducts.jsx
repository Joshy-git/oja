// Operations dashboard: Products list (statistics, stock tabs, search, filter, sort,
// column picker, table view, bulk publish, CSV export, pagination).
// Column and statistics choices are saved in state.admin.productView.
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../store/Store'
import { Icon } from '../components/Icon'
import { ProductArt, spring } from '../components/ui'
import { CATEGORIES, patchProduct } from '../data/catalog'
import { naira } from '../lib/commerce'
import { Menu, useOutside } from './AdminOrders'

const MONTH = 30 * 864e5
const compact = (v) => v >= 1e9 ? `₦${(v / 1e9).toFixed(2)}bn` : v >= 1e6 ? `₦${(v / 1e6).toFixed(1)}m` : naira(v)
const catName = (id) => CATEGORIES.find((c) => c.id === id)?.name || 'Uncategorised'

// [key, label, shown by default]
const COLS = [
  ['category', 'Category', true],
  ['price', 'Price', true],
  ['sales', 'Sales', true],
  ['revenue', 'Revenue', true],
  ['stock', 'Stock', true],
  ['status', 'Status', true],
  ['rating', 'Rating', true],
  ['margin', 'Margin', false],
  ['published', 'Published', true],
]
const SORTS = [['newest', 'Newest first'], ['title', 'Name (A–Z)'], ['price', 'Price'], ['sales', 'Sales'], ['revenue', 'Revenue'], ['stock', 'Stock'], ['rating', 'Rating']]
const TABS = [['all', 'All'], ['in', 'In stock'], ['low', 'Low stock'], ['out', 'Out of stock'], ['incoming', 'Incoming'], ['hidden', 'Hidden']]

export default function Products({ products, edit, onEdit, lowStock }) {
  const { state, dispatch, toast } = useStore()
  const pv = state.admin.productView || {}
  const cols = new Set(pv.cols || COLS.filter((c) => c[2]).map((c) => c[0]))
  const showStats = pv.stats !== false
  const savePv = (patch) => dispatch({ type: 'setAdmin', key: 'productView', value: patch })

  const status = (p) => p.stock === 'oos' || (p.stock === 'nigeria' && p.qty <= 0) ? ['out', 'Out of Stock', 'bad']
    : p.stock === 'nigeria' ? (p.qty < lowStock ? ['low', 'Low Stock', 'warn'] : ['in', 'In Stock', 'good'])
    : p.stock === 'transit' ? ['incoming', 'In Transit', 'info'] : p.stock === 'china' ? ['incoming', 'China Stock', 'info'] : ['incoming', 'Pre-order', 'warn']
  const rows = useMemo(() => products.map((p) => ({ ...p, st: status(p), revenue: p.price * (p.sold || 0), margin: (p.price - p.landed.total) / p.price, units: p.stock === 'oos' ? 0 : p.qty })), [products, lowStock]) // eslint-disable-line react-hooks/exhaustive-deps

  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [vis, setVis] = useState('all')
  const [sort, setSort] = useState(['newest', 'desc'])
  const [per, setPer] = useState(10)
  const [page, setPage] = useState(1)
  const [sel, setSel] = useState(new Set())
  const [filterOpen, setFilterOpen] = useState(false)
  const fRef = useOutside(filterOpen, () => setFilterOpen(false))

  const inTab = (p, t) => t === 'all' || (t === 'hidden' ? !p.published : p.st[0] === t)
  const val = { newest: (p) => p.createdAt, title: (p) => p.title.toLowerCase(), price: (p) => p.price, sales: (p) => p.sold || 0, revenue: (p) => p.revenue, stock: (p) => p.units, rating: (p) => p.rating || 0 }[sort[0]]
  const filtered = rows
    .filter((p) => inTab(p, tab) && (!cat || p.category === cat) && (vis === 'all' || (vis === 'live') === !!p.published)
      && `${p.title} ${p.sku} ${catName(p.category)}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * (sort[1] === 'asc' ? 1 : -1) })
  const pages = Math.max(1, Math.ceil(filtered.length / per))
  const cur = Math.min(page, pages)
  const shown = filtered.slice((cur - 1) * per, cur * per)
  useEffect(() => { setPage(1); setSel(new Set()) }, [tab, q, cat, vis, per, sort])

  const sold = rows.reduce((n, p) => n + (p.sold || 0), 0)
  const months = Math.max(1, (Date.now() - Math.min(...rows.map((p) => p.createdAt))) / MONTH)
  const monthly = sold / months
  const stats = [
    ['Package', 't-orange', 'Total Products', rows.length.toLocaleString(), `${rows.filter((p) => p.published).length} live · ${rows.filter((p) => !p.published).length} hidden`],
    ['Banknote', 't-green', 'Product Revenue', compact(rows.reduce((n, p) => n + p.revenue, 0)), 'Lifetime, at current prices'],
    ['ShoppingBag', 't-blue', 'Products Sold', sold.toLocaleString(), `Across ${CATEGORIES.filter((c) => rows.some((p) => p.category === c.id)).length} categories`],
    ['TrendingUp', 't-sun', 'Avg. Monthly Sales', Math.round(monthly).toLocaleString(), `Units / month over ${Math.round(months)} months`],
  ]

  const setLive = (list, on) => {
    list.forEach((p) => { const patch = { published: on, visibility: on ? 'published' : 'hidden' }; patchProduct(p.id, patch); dispatch({ type: 'updateCatalog', id: p.id, patch }) })
  }
  const selected = filtered.filter((p) => sel.has(p.id))
  const bulkLive = (on) => { setLive(selected, on); toast(`${on ? 'Published' : 'Hid'} ${selected.length} product${selected.length === 1 ? '' : 's'}`, { icon: 'CircleCheck' }); setSel(new Set()) }
  const exportCsv = () => {
    const list = selected.length ? selected : filtered
    const head = ['SKU', 'Product', 'Category', 'Price (NGN)', 'Landed cost (NGN)', 'Margin %', 'Sales', 'Revenue (NGN)', 'Stock', 'Status', 'Rating', 'Published']
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`
    const csv = [head, ...list.map((p) => [p.sku, p.title, catName(p.category), p.price, p.landed.total, (p.margin * 100).toFixed(1), p.sold || 0, p.revenue, p.units, p.st[1], p.rating || '', p.published ? 'Yes' : 'No'])].map((r) => r.map(esc).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `oja-products-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    toast(`Exported ${list.length} product${list.length === 1 ? '' : 's'} to CSV`, { icon: 'CircleCheck' })
  }
  const allOnPage = shown.length > 0 && shown.every((p) => sel.has(p.id))
  const toggleAll = () => setSel(allOnPage ? new Set([...sel].filter((id) => !shown.some((p) => p.id === id))) : new Set([...sel, ...shown.map((p) => p.id)]))
  const toggle = (id) => { const s = new Set(sel); s.has(id) ? s.delete(id) : s.add(id); setSel(s) }
  const sortBy = (k) => setSort(([sk, dir]) => [k, sk === k ? (dir === 'asc' ? 'desc' : 'asc') : k === 'title' ? 'asc' : 'desc'])
  const Th = ({ k, label, num }) => (
    <th className={num ? 'num' : ''} aria-sort={sort[0] === k ? (sort[1] === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button type="button" className={`th-sort ${sort[0] === k ? 'on' : ''}`} onClick={() => sortBy(k)}>{label}<Icon name={sort[0] === k ? (sort[1] === 'asc' ? 'ChevronUp' : 'ChevronDown') : 'ChevronsUpDown'} size={13} /></button>
    </th>
  )
  const rowMenu = (p) => [
    { label: 'Edit product', icon: 'Pencil', onClick: () => onEdit(p.id) },
    { label: 'View on storefront', icon: 'ExternalLink', onClick: () => window.open(`/p/${p.id}`, '_blank'), disabled: !p.published },
    '-',
    { label: p.published ? 'Hide from store' : 'Publish', icon: p.published ? 'EyeOff' : 'Eye', disabled: !edit, onClick: () => { setLive([p], !p.published); toast(`${p.title.slice(0, 32)}… ${p.published ? 'hidden' : 'published'}`, { icon: 'CircleCheck' }) } },
  ]
  const pubToggle = (p) => (
    <button className={`toggle ${p.published ? 'on' : ''}`} disabled={!edit} onClick={() => setLive([p], !p.published)} aria-label={`${p.published ? 'Hide' : 'Publish'} ${p.title}`}>
      <motion.span layout transition={spring} />
    </button>
  )
  const statusChip = (p) => <em className={`chip ${p.st[2]}`}>{p.st[1]}</em>
  const pageNums = pages <= 7 ? Array.from({ length: pages }, (_, i) => i + 1) : [1, ...(cur > 3 ? ['…'] : []), ...[cur - 1, cur, cur + 1].filter((n) => n > 1 && n < pages), ...(cur < pages - 2 ? ['…'] : []), pages]
  const nFilters = (cat !== '') + (vis !== 'all')
  const c = (k) => cols.has(k)

  return (
    <div className="ord prd">
      <div className="ord-head">
        <div>
          <h2>Products</h2>
          <p className="muted">Manage your products, track inventory, and grow your store</p>
        </div>
        <div className="ord-actions">
          <Menu label={<><Icon name="SlidersHorizontal" size={15} /> Customize View</>} className="btn-mini lg" items={[
              ...COLS.map(([k, l]) => ({ label: l, icon: c(k) ? 'SquareCheck' : 'Square', onClick: () => { const s = new Set(cols); s.has(k) ? s.delete(k) : s.add(k); savePv({ cols: [...s] }) } })),
              '-',
              { label: 'Reset columns', icon: 'RotateCcw', onClick: () => savePv({ cols: null }) },
            ]} />
          <button type="button" className="btn-mini lg" onClick={exportCsv}><Icon name="Download" size={15} /> Export{selected.length ? ` (${selected.length})` : ''}</button>
          <button type="button" className="btn-orange" disabled={!edit} onClick={() => onEdit('new')}><Icon name="Plus" size={16} /> Add New Product</button>
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
        <label className="ord-search"><Icon name="Search" size={16} /><input id="prd-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product, SKU or category…" /></label>
        <div className="prd-bar-r">
          {selected.length > 0 && (
            <div className="prd-selbar">
              <b>{selected.length} selected</b>
              <button type="button" className="btn-mini" disabled={!edit} onClick={() => bulkLive(true)}><Icon name="Eye" size={14} /> Publish</button>
              <button type="button" className="btn-mini" disabled={!edit} onClick={() => bulkLive(false)}><Icon name="EyeOff" size={14} /> Hide</button>
              <button type="button" className="btn-mini" onClick={() => setSel(new Set())}><Icon name="X" size={14} /> Clear</button>
            </div>
          )}
          <div className="om-wrap" ref={fRef}>
            <button type="button" className={`btn-mini lg ${nFilters ? 'active' : ''}`} onClick={() => setFilterOpen((o) => !o)} aria-expanded={filterOpen}><Icon name="Funnel" size={15} /> Filter{nFilters ? ` (${nFilters})` : ''}</button>
            {filterOpen && (
              <div className="om-menu right ord-filter">
                <label><span>Category</span><select value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{CATEGORIES.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
                <label><span>Visibility</span><select value={vis} onChange={(e) => setVis(e.target.value)}><option value="all">Live and hidden</option><option value="live">Live on store</option><option value="hidden">Hidden</option></select></label>
                <button type="button" className="btn-mini" onClick={() => { setCat(''); setVis('all') }}>Reset filters</button>
              </div>
            )}
          </div>
          <Menu label={<><Icon name="ArrowUpDown" size={15} /> Sort</>} className="btn-mini lg" items={SORTS.map(([k, l]) => ({ label: `${l}${sort[0] === k ? (sort[1] === 'asc' ? ' ↑' : ' ↓') : ''}`, icon: sort[0] === k ? 'Check' : undefined, onClick: () => sortBy(k) }))} />
          <label className="prd-switch">Show Statistics
            <button type="button" className={`toggle ${showStats ? 'on' : ''}`} onClick={() => savePv({ stats: !showStats })} aria-pressed={showStats} aria-label="Show statistics"><motion.span layout transition={spring} /></button>
          </label>
        </div>
      </div>

      <div className="table-wrap ord-table prd-table">
        <table className="tbl">
          <thead><tr>
            <th className="ord-cb"><input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Select all products on this page" /></th>
            <Th k="title" label="Product" />
            {c('category') && <th>Category</th>}
            {c('price') && <Th k="price" label="Price" />}
            {c('sales') && <Th k="sales" label="Sales" />}
            {c('revenue') && <Th k="revenue" label="Revenue" />}
            {c('stock') && <Th k="stock" label="Stock" />}
            {c('status') && <th>Status</th>}
            {c('rating') && <Th k="rating" label="Rating" />}
            {c('margin') && <th>Margin</th>}
            {c('published') && <th>Published</th>}
            <th>Action</th>
          </tr></thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id} className={`clickable ${sel.has(p.id) ? 'sel' : ''}`} onClick={() => onEdit(p.id)} title="Edit product">
                <td className="ord-cb" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Select ${p.title}`} /></td>
                <td><div className="ord-prod prd-name"><span className="ord-thumb"><ProductArt p={p} size="xs" /></span><div><div className="clamp1">{p.title}</div><span className="muted small">{p.sku}</span></div></div></td>
                {c('category') && <td className="small nowrap">{catName(p.category)}</td>}
                {c('price') && <td className="nowrap">{naira(p.price)}</td>}
                {c('sales') && <td className="nowrap">{(p.sold || 0).toLocaleString()} pcs</td>}
                {c('revenue') && <td className="nowrap">{compact(p.revenue)}</td>}
                {c('stock') && <td className="nowrap">{p.units.toLocaleString()} pcs</td>}
                {c('status') && <td className="nowrap">{statusChip(p)}</td>}
                {c('rating') && <td className="nowrap">{p.rating ? <span className="prd-rate"><Icon name="Star" size={14} fill="currentColor" /> {p.rating.toFixed(1)}</span> : <span className="muted small">No reviews</span>}</td>}
                {c('margin') && <td className={p.margin < 0.2 ? 'bad' : 'good'}>{(p.margin * 100).toFixed(0)}%</td>}
                {c('published') && <td onClick={(e) => e.stopPropagation()}>{pubToggle(p)}{p.visibility === 'scheduled' && !p.published && <em className="chip warn tbl-sched">Scheduled</em>}</td>}
                <td onClick={(e) => e.stopPropagation()}><Menu icon="Ellipsis" items={rowMenu(p)} className="icon-btn" label="" /></td>
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
    </div>
  )
}
