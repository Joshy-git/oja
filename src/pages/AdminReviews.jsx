// Operations dashboard: Reviews moderation (feature, hide, export). Same layout as
// Orders, Products, Customers, Inventory, Logistics and Procurement.
// Moderation choices are saved in state.admin.reviews.
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../store/Store'
import { Icon } from '../components/Icon'
import { ProductArt, Stars, spring } from '../components/ui'
import { CATEGORIES, reviewsFor } from '../data/catalog'
import { Menu, useOutside } from './AdminOrders'

const DAY = 864e5
const ago = (t) => { const d = Math.max(0, Math.round((Date.now() - t) / DAY)); return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : d < 60 ? `${d} days ago` : new Date(t).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) }
const TABS = [['all', 'All'], ['5', '5 stars'], ['4', '4 stars'], ['low', '3 stars & below'], ['photos', 'With photos'], ['delivery', 'Delivery issues'], ['featured', 'Featured'], ['hidden', 'Hidden']]
const SORTS = [['date', 'Newest'], ['stars', 'Rating'], ['helpful', 'Most helpful']]

export default function Reviews({ products, edit }) {
  const { state, dispatch, toast } = useStore()
  const mod = state.admin.reviews || {}
  const showStats = (state.admin.reviewsView || {}).stats !== false
  const all = useMemo(() => products.flatMap((p) => reviewsFor(p).map((r) => ({ ...r, product: p }))), [products])
  const rows = all.map((r) => ({ ...r, state: mod[r.id] || 'published' }))

  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [sort, setSort] = useState(['date', 'desc'])
  const [per, setPer] = useState(10)
  const [page, setPage] = useState(1)
  const [sel, setSel] = useState(new Set())
  const [filterOpen, setFilterOpen] = useState(false)
  const fRef = useOutside(filterOpen, () => setFilterOpen(false))

  const inTab = (r, t) => ({
    all: true, 5: r.stars === 5, 4: r.stars === 4, low: r.stars <= 3, photos: r.photos > 0, delivery: r.delivery < 5,
    featured: r.state === 'featured', hidden: r.state === 'hidden',
  }[t])
  const val = { date: (r) => r.date, stars: (r) => r.stars, helpful: (r) => r.helpful }[sort[0]]
  const filtered = rows
    .filter((r) => inTab(r, tab) && (!cat || r.product.category === cat) && `${r.title} ${r.body} ${r.name} ${r.city} ${r.product.title} ${r.product.sku}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * (sort[1] === 'asc' ? 1 : -1) || b.date - a.date })
  const pages = Math.max(1, Math.ceil(filtered.length / per))
  const cur = Math.min(page, pages)
  const shown = filtered.slice((cur - 1) * per, cur * per)
  useEffect(() => { setPage(1); setSel(new Set()) }, [tab, q, cat, per, sort])

  const visible = rows.filter((r) => r.state !== 'hidden')
  const avg = visible.reduce((s, r) => s + r.stars, 0) / (visible.length || 1)
  const pct = (n) => `${Math.round((n / (rows.length || 1)) * 100)}%`
  const stats = [
    ['Star', 't-sun', 'Average Rating', avg.toFixed(2), `${rows.length.toLocaleString()} verified-purchase reviews`],
    ['Camera', 't-blue', 'With Photos', pct(rows.filter((r) => r.photos).length), 'Reviews that include customer photos'],
    ['Truck', 't-orange', 'Delivery Complaints', rows.filter((r) => r.delivery < 5).length, 'Delivery score below 5'],
    ['ThumbsUp', 't-green', 'Repeat Buyers', pct(rows.filter((r) => r.repeat).length), 'Of reviewers'],
  ]

  // v is 'featured', 'hidden' or null (back to published)
  const setState = (list, v) => {
    dispatch({ type: 'setAdmin', key: 'reviews', value: Object.fromEntries(list.map((r) => [r.id, v])), log: `${list.length === 1 ? `Review ${list[0].id}` : `${list.length} reviews`} ${v ? v : 'restored'}` })
  }
  const selected = filtered.filter((r) => sel.has(r.id))
  const bulk = (v, label) => { setState(selected, v); toast(`${label} ${selected.length} review${selected.length === 1 ? '' : 's'}`, { icon: 'CircleCheck' }); setSel(new Set()) }
  const exportCsv = () => {
    const list = selected.length ? selected : filtered
    const head = ['Review', 'Date', 'Product', 'SKU', 'Customer', 'City', 'Stars', 'Delivery score', 'Photos', 'Helpful', 'Title', 'Text', 'Status']
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`
    const csv = [head, ...list.map((r) => [r.id, new Date(r.date).toISOString().slice(0, 10), r.product.title, r.product.sku, r.name, r.city, r.stars, r.delivery, r.photos, r.helpful, r.title, r.body, r.state])].map((x) => x.map(esc).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `oja-reviews-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    toast(`Exported ${list.length} review${list.length === 1 ? '' : 's'} to CSV`, { icon: 'CircleCheck' })
  }
  const allOnPage = shown.length > 0 && shown.every((r) => sel.has(r.id))
  const toggleAll = () => setSel(allOnPage ? new Set([...sel].filter((id) => !shown.some((r) => r.id === id))) : new Set([...sel, ...shown.map((r) => r.id)]))
  const toggle = (id) => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n) }
  const sortBy = (k) => setSort(([sk, dir]) => [k, sk === k ? (dir === 'asc' ? 'desc' : 'asc') : 'desc'])
  const Th = ({ k, label }) => (
    <th aria-sort={sort[0] === k ? (sort[1] === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button type="button" className={`th-sort ${sort[0] === k ? 'on' : ''}`} onClick={() => sortBy(k)}>{label}<Icon name={sort[0] === k ? (sort[1] === 'asc' ? 'ChevronUp' : 'ChevronDown') : 'ChevronsUpDown'} size={13} /></button>
    </th>
  )
  const statusChip = (r) => r.state === 'featured' ? <em className="chip brand">Featured</em> : r.state === 'hidden' ? <em className="chip warn">Hidden</em> : <em className="chip good">Published</em>
  const rowMenu = (r) => [
    { label: r.state === 'featured' ? 'Unfeature' : 'Feature on product page', icon: 'Star', disabled: !edit, onClick: () => setState([r], r.state === 'featured' ? null : 'featured') },
    { label: r.state === 'hidden' ? 'Show again' : 'Hide from store', icon: r.state === 'hidden' ? 'Eye' : 'EyeOff', disabled: !edit, onClick: () => setState([r], r.state === 'hidden' ? null : 'hidden') },
    '-',
    { label: 'View product page', icon: 'ExternalLink', onClick: () => window.open(`/p/${r.product.id}`, '_blank') },
  ]
  const pageNums = pages <= 7 ? Array.from({ length: pages }, (_, i) => i + 1) : [1, ...(cur > 3 ? ['…'] : []), ...[cur - 1, cur, cur + 1].filter((n) => n > 1 && n < pages), ...(cur < pages - 2 ? ['…'] : []), pages]

  return (
    <div className="ord prd">
      <div className="ord-head">
        <div>
          <h2>Reviews</h2>
          <p className="muted">Read what buyers say, feature the best reviews, and hide the ones that break the rules</p>
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
        {TABS.map(([k, l]) => { const n = rows.filter((r) => inTab(r, k)).length; return (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}{k !== 'all' && n > 0 && <i>{n}</i>}</button>
        ) })}
      </div>

      <div className="prd-sub">
        <label className="ord-search"><Icon name="Search" size={16} /><input id="rv-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search review, customer or product…" /></label>
        <div className="prd-bar-r">
          {selected.length > 0 && (
            <div className="prd-selbar">
              <b>{selected.length} selected</b>
              <button type="button" className="btn-mini" disabled={!edit} onClick={() => bulk('featured', 'Featured')}><Icon name="Star" size={14} /> Feature</button>
              <button type="button" className="btn-mini" disabled={!edit} onClick={() => bulk('hidden', 'Hid')}><Icon name="EyeOff" size={14} /> Hide</button>
              <button type="button" className="btn-mini" disabled={!edit} onClick={() => bulk(null, 'Restored')}><Icon name="Eye" size={14} /> Publish</button>
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
            <button type="button" className={`toggle ${showStats ? 'on' : ''}`} onClick={() => dispatch({ type: 'setAdmin', key: 'reviewsView', value: { stats: !showStats } })} aria-pressed={showStats} aria-label="Show statistics"><motion.span layout transition={spring} /></button>
          </label>
        </div>
      </div>

      <div className="table-wrap ord-table prd-table rv-table">
        <table className="tbl">
          <thead><tr>
            <th className="ord-cb"><input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Select all reviews on this page" /></th>
            <Th k="stars" label="Review" />
            <th>Product</th>
            <th>Customer</th>
            <th>Delivery</th>
            <Th k="helpful" label="Helpful" />
            <Th k="date" label="Date" />
            <th>Status</th>
            <th>Action</th>
          </tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className={`${sel.has(r.id) ? 'sel' : ''} ${r.state === 'hidden' ? 'rv-off' : ''}`}>
                <td className="ord-cb"><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select review by ${r.name}`} /></td>
                <td><div className="rv-text"><span className="row-ico"><Stars value={r.stars} size={12} /><b className="clamp1">{r.title}</b></span><p className="muted small clamp2">{r.body}</p>{r.photos > 0 && <span className="muted small row-ico"><Icon name="Camera" size={12} /> {r.photos} photos</span>}</div></td>
                <td><div className="ord-prod"><span className="ord-thumb"><ProductArt p={r.product} size="xs" /></span><div><div className="clamp1">{r.product.title}</div><span className="muted small">{r.variant || r.product.sku}</span></div></div></td>
                <td className="nowrap small"><b>{r.name}</b><div className="muted">{r.city}{r.repeat ? ' · repeat buyer' : ''}</div></td>
                <td className={`nowrap small ${r.delivery < 5 ? 'bad' : ''}`}>{r.delivery}/5</td>
                <td className="nowrap small">{r.helpful}</td>
                <td className="nowrap small">{ago(r.date)}</td>
                <td className="nowrap">{statusChip(r)}</td>
                <td><Menu icon="Ellipsis" items={rowMenu(r)} className="icon-btn" label="" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <div className="ord-empty"><Icon name="SearchX" size={22} /><b>No reviews here</b><span className="muted small">Try another tab, filter or search.</span></div>}
      </div>

      <div className="ord-pager">
        <span className="small muted">{filtered.length ? `Showing ${(cur - 1) * per + 1}–${Math.min(cur * per, filtered.length)} of ${filtered.length}` : '0 reviews'}</span>
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
