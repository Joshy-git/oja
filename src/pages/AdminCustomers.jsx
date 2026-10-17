// Operations dashboard: Customers list (statistics, segment tabs, search, filter,
// sort, CSV export, pagination, add customer). Same layout as Orders and Products.
// Customers added here are saved in state.admin.customers.
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useStore } from '../store/Store'
import { Icon } from '../components/Icon'
import { spring } from '../components/ui'
import { naira } from '../lib/commerce'
import { Menu, useOutside } from './AdminOrders'

const DAY = 864e5
const ago = (t) => { const d = Math.max(0, Math.round((Date.now() - t) / DAY)); return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d} days ago` }
const initials = (n) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
const FIRST = ['Chiamaka', 'Tunde', 'Ngozi', 'Kwame', 'Amina', 'Emeka', 'Wanjiru', 'Seyi', 'Kofi', 'Halima', 'Thabo', 'Blessing', 'Musa', 'Zainab', 'Obinna', 'Akosua', 'Fatou', 'Kunle']
const LAST = ['Okafor', 'Adeyemi', 'Eze', 'Mensah', 'Bello', 'Nwosu', 'Kamau', 'Lawal', 'Boateng', 'Yusuf', 'Ndlovu', 'Udo', 'Abubakar', 'Sani', 'Chukwu', 'Asante', 'Diallo', 'Ajayi']
const PLACES = [['Enugu', 'Nigeria'], ['Lagos', 'Nigeria'], ['Abuja', 'Nigeria'], ['Accra', 'Ghana'], ['Kano', 'Nigeria'], ['Port Harcourt', 'Nigeria'], ['Nairobi', 'Kenya'], ['Ibadan', 'Nigeria'], ['Kumasi', 'Ghana'], ['Abuja', 'Nigeria'], ['Johannesburg', 'South Africa'], ['Uyo', 'Nigeria'], ['Kaduna', 'Nigeria'], ['Kano', 'Nigeria'], ['Lagos', 'Nigeria'], ['Accra', 'Ghana'], ['Dakar', 'Senegal'], ['Lagos', 'Nigeria']] // one per customer, matching the name
const COUNTRIES = ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Senegal', 'Other']
function demoCustomers() {
  return FIRST.map((f, i) => {
    const orders = [1, 7, 3, 12, 2, 5, 1, 9, 4, 2, 6, 15, 1, 3, 8, 2, 1, 4][i]
    const [city, country] = PLACES[i]
    const daysAgo = [2, 5, 40, 1, 75, 9, 3, 14, 22, 95, 6, 1, 0, 30, 11, 60, 4, 18][i]
    return { id: `C${1040 + i}`, name: `${f} ${LAST[i]}`, city, country, orders, spend: orders * (18000 + ((i * 7919) % 26000)), last: Date.now() - daysAgo * DAY, joined: Date.now() - (daysAgo + 30 + i * 23) * DAY, phone: `080${(31234567 + i * 1111).toString().slice(0, 8)}` }
  })
}
const segment = (c) => (!c.orders ? ['New', 'info'] : c.spend >= 150000 ? ['VIP', 'brand'] : Date.now() - c.last > 60 * DAY ? ['At risk', 'bad'] : c.orders >= 3 ? ['Repeat', 'good'] : ['New', 'info'])
const TABS = [['all', 'All'], ['VIP', 'VIP'], ['Repeat', 'Repeat'], ['New', 'New'], ['At risk', 'At risk']]
const SORTS = [['last', 'Last order'], ['name', 'Name (A–Z)'], ['orders', 'Orders'], ['spend', 'Total spend'], ['joined', 'Newest customers']]

export default function Customers({ edit }) {
  const { state, dispatch, toast } = useStore()
  const added = state.admin.customers || {}
  const showStats = (state.admin.customerView || {}).stats !== false
  const rows = useMemo(() => {
    const reg = state.accounts.map((a, i) => ({ id: `R${i + 1}`, name: a.name, city: '—', country: 'Registered online', orders: 0, spend: 0, last: 0, joined: a.createdAt || Date.now(), phone: a.phone || a.email || '—', source: 'Signed up on the store' }))
    const manual = Object.values(added).filter(Boolean)
    return [...manual, ...reg, ...demoCustomers()].map((c) => ({ ...c, seg: segment(c) }))
  }, [state.accounts, added])

  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [country, setCountry] = useState('')
  const [sort, setSort] = useState(['last', 'desc'])
  const [per, setPer] = useState(10)
  const [page, setPage] = useState(1)
  const [sel, setSel] = useState(new Set())
  const [filterOpen, setFilterOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const fRef = useOutside(filterOpen, () => setFilterOpen(false))

  const inTab = (c, t) => t === 'all' || c.seg[0] === t
  const val = { last: (c) => c.last, name: (c) => c.name.toLowerCase(), orders: (c) => c.orders, spend: (c) => c.spend, joined: (c) => c.joined }[sort[0]]
  const filtered = rows
    .filter((c) => inTab(c, tab) && (!country || c.country === country) && `${c.name} ${c.city} ${c.country} ${c.id} ${c.phone}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * (sort[1] === 'asc' ? 1 : -1) })
  const pages = Math.max(1, Math.ceil(filtered.length / per))
  const cur = Math.min(page, pages)
  const shown = filtered.slice((cur - 1) * per, cur * per)
  useEffect(() => { setPage(1); setSel(new Set()) }, [tab, q, country, per, sort])

  const buyers = rows.filter((c) => c.orders > 0)
  const countries = new Set(rows.map((c) => c.country).filter((c) => c !== 'Registered online'))
  const stats = [
    ['Users', 't-orange', 'Total Customers', rows.length.toLocaleString(), `${rows.filter((c) => Date.now() - c.joined < 30 * DAY).length} joined in the last 30 days`],
    ['Repeat', 't-green', 'Repeat Customers', `${buyers.length ? Math.round((rows.filter((c) => c.orders >= 3).length / buyers.length) * 100) : 0}%`, '3 or more orders'],
    ['Wallet', 't-blue', 'Avg. Lifetime Spend', naira(buyers.length ? buyers.reduce((s, c) => s + c.spend, 0) / buyers.length : 0), 'Customers with at least 1 order'],
    ['MapPin', 't-sun', 'Countries', countries.size, [...countries].join(', ')],
  ]

  const selected = filtered.filter((c) => sel.has(c.id))
  const exportCsv = () => {
    const list = selected.length ? selected : filtered
    const head = ['ID', 'Name', 'Phone', 'City', 'Country', 'Orders', 'Total spend (NGN)', 'Last order', 'Segment']
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`
    const csv = [head, ...list.map((c) => [c.id, c.name, c.phone, c.city, c.country, c.orders, Math.round(c.spend), c.orders ? new Date(c.last).toISOString().slice(0, 10) : '', c.seg[0]])].map((r) => r.map(esc).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `oja-customers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    toast(`Exported ${list.length} customer${list.length === 1 ? '' : 's'} to CSV`, { icon: 'CircleCheck' })
  }
  const allOnPage = shown.length > 0 && shown.every((c) => sel.has(c.id))
  const toggleAll = () => setSel(allOnPage ? new Set([...sel].filter((id) => !shown.some((c) => c.id === id))) : new Set([...sel, ...shown.map((c) => c.id)]))
  const toggle = (id) => { const s = new Set(sel); s.has(id) ? s.delete(id) : s.add(id); setSel(s) }
  const sortBy = (k) => setSort(([sk, dir]) => [k, sk === k ? (dir === 'asc' ? 'desc' : 'asc') : k === 'name' ? 'asc' : 'desc'])
  const Th = ({ k, label }) => (
    <th aria-sort={sort[0] === k ? (sort[1] === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button type="button" className={`th-sort ${sort[0] === k ? 'on' : ''}`} onClick={() => sortBy(k)}>{label}<Icon name={sort[0] === k ? (sort[1] === 'asc' ? 'ChevronUp' : 'ChevronDown') : 'ChevronsUpDown'} size={13} /></button>
    </th>
  )
  const waLink = (phone) => { const d = phone.replace(/\D/g, ''); return d.length >= 10 ? `https://wa.me/${d.startsWith('0') ? '234' + d.slice(1) : d}` : null }
  const rowMenu = (c) => [
    { label: 'Copy phone number', icon: 'Copy', disabled: !/\d/.test(c.phone), onClick: () => { navigator.clipboard?.writeText(c.phone); toast(`Copied ${c.phone}`, { icon: 'CircleCheck' }) } },
    { label: 'Message on WhatsApp', icon: 'Mail', disabled: !waLink(c.phone), onClick: () => window.open(waLink(c.phone), '_blank', 'noopener') },
    c.manual && '-',
    c.manual && { label: 'Remove customer', icon: 'X', danger: true, disabled: !edit, onClick: () => { dispatch({ type: 'setAdmin', key: 'customers', value: { [c.id]: null }, log: `Removed customer ${c.name}` }); toast(`${c.name} removed`, { icon: 'CircleCheck' }) } },
  ].filter(Boolean)
  const pageNums = pages <= 7 ? Array.from({ length: pages }, (_, i) => i + 1) : [1, ...(cur > 3 ? ['…'] : []), ...[cur - 1, cur, cur + 1].filter((n) => n > 1 && n < pages), ...(cur < pages - 2 ? ['…'] : []), pages]

  return (
    <div className="ord prd">
      <div className="ord-head">
        <div>
          <h2>Customers</h2>
          <p className="muted">See who buys from Oja, how often, and who needs a nudge</p>
        </div>
        <div className="ord-actions">
          <button type="button" className="btn-mini lg" onClick={exportCsv}><Icon name="Download" size={15} /> Export{selected.length ? ` (${selected.length})` : ''}</button>
          <button type="button" className="btn-orange" disabled={!edit} onClick={() => setAdding(true)}><Icon name="Plus" size={16} /> Add Customer</button>
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
        {TABS.map(([k, l]) => { const n = rows.filter((c) => inTab(c, k)).length; return (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}{k !== 'all' && n > 0 && <i>{n}</i>}</button>
        ) })}
      </div>

      <div className="prd-sub">
        <label className="ord-search"><Icon name="Search" size={16} /><input id="cus-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, city or ID…" /></label>
        <div className="prd-bar-r">
          {selected.length > 0 && (
            <div className="prd-selbar">
              <b>{selected.length} selected</b>
              <button type="button" className="btn-mini" onClick={() => setSel(new Set())}><Icon name="X" size={14} /> Clear</button>
            </div>
          )}
          <div className="om-wrap" ref={fRef}>
            <button type="button" className={`btn-mini lg ${country ? 'active' : ''}`} onClick={() => setFilterOpen((o) => !o)} aria-expanded={filterOpen}><Icon name="Funnel" size={15} /> Filter{country ? ' (1)' : ''}</button>
            {filterOpen && (
              <div className="om-menu right ord-filter">
                <label><span>Country</span><select value={country} onChange={(e) => setCountry(e.target.value)}><option value="">All countries</option>{[...new Set(rows.map((c) => c.country))].sort().map((x) => <option key={x}>{x}</option>)}</select></label>
                <button type="button" className="btn-mini" onClick={() => setCountry('')}>Reset filters</button>
              </div>
            )}
          </div>
          <Menu label={<><Icon name="ArrowUpDown" size={15} /> Sort</>} className="btn-mini lg" items={SORTS.map(([k, l]) => ({ label: `${l}${sort[0] === k ? (sort[1] === 'asc' ? ' ↑' : ' ↓') : ''}`, icon: sort[0] === k ? 'Check' : undefined, onClick: () => sortBy(k) }))} />
          <label className="prd-switch">Show Statistics
            <button type="button" className={`toggle ${showStats ? 'on' : ''}`} onClick={() => dispatch({ type: 'setAdmin', key: 'customerView', value: { stats: !showStats } })} aria-pressed={showStats} aria-label="Show statistics"><motion.span layout transition={spring} /></button>
          </label>
        </div>
      </div>

      <div className="table-wrap ord-table prd-table">
        <table className="tbl">
          <thead><tr>
            <th className="ord-cb"><input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Select all customers on this page" /></th>
            <Th k="name" label="Customer" />
            <th>Phone</th>
            <th>Location</th>
            <Th k="orders" label="Orders" />
            <Th k="spend" label="Total spend" />
            <Th k="last" label="Last order" />
            <th>Segment</th>
            <th>Action</th>
          </tr></thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.id} className={sel.has(c.id) ? 'sel' : ''}>
                <td className="ord-cb"><input type="checkbox" checked={sel.has(c.id)} onChange={() => toggle(c.id)} aria-label={`Select ${c.name}`} /></td>
                <td><div className="ord-cust"><span className="cust-av">{initials(c.name)}</span><div><b>{c.name}</b><div className="muted small">{c.id}{c.source ? ` · ${c.source}` : ''}</div></div></div></td>
                <td className="small nowrap">{c.phone}</td>
                <td className="nowrap">{c.city}<div className="muted small">{c.country}</div></td>
                <td className="nowrap">{c.orders}</td>
                <td className="nowrap"><b>{naira(c.spend)}</b></td>
                <td className="small nowrap">{c.orders ? ago(c.last) : '—'}</td>
                <td className="nowrap"><em className={`chip ${c.seg[1]}`}>{c.seg[0]}</em></td>
                <td><Menu icon="Ellipsis" items={rowMenu(c)} className="icon-btn" label="" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <div className="ord-empty"><Icon name="SearchX" size={22} /><b>No customers here</b><span className="muted small">Try another tab, filter or search.</span></div>}
      </div>

      <div className="ord-pager">
        <span className="small muted">{filtered.length ? `Showing ${(cur - 1) * per + 1}–${Math.min(cur * per, filtered.length)} of ${filtered.length}` : '0 customers'}</span>
        <label className="small muted">Per page <select value={per} onChange={(e) => setPer(+e.target.value)}>{[10, 20, 50].map((n) => <option key={n}>{n}</option>)}</select></label>
        <nav className="ord-pages" aria-label="Pages">
          <button type="button" className="pg" disabled={cur === 1} onClick={() => setPage(cur - 1)} aria-label="Previous page"><Icon name="ChevronLeft" size={14} /></button>
          {pageNums.map((n, i) => n === '…' ? <span key={`e${i}`} className="pg-gap">…</span> : <button type="button" key={n} className={`pg ${n === cur ? 'on' : ''}`} aria-current={n === cur ? 'page' : undefined} onClick={() => setPage(n)}>{n}</button>)}
          <button type="button" className="pg" disabled={cur === pages} onClick={() => setPage(cur + 1)} aria-label="Next page"><Icon name="ChevronRight" size={14} /></button>
        </nav>
      </div>
      {adding && <AddCustomerModal onClose={() => setAdding(false)} onAdded={() => { setAdding(false); setTab('all'); setQ(''); setCountry(''); setSort(['joined', 'desc']) }} taken={rows} />}
    </div>
  )
}

/* ---------- Add customer (walk-in, phone or WhatsApp buyers) ---------- */
const phoneOk = (p) => /^(\+?\d{10,15})$/.test(p.replace(/[\s-]/g, ''))
function AddCustomerModal({ onClose, onAdded, taken }) {
  const { dispatch, toast } = useStore()
  const [f, setF] = useState({ name: '', phone: '', city: '', country: 'Nigeria', note: '' })
  const [tried, setTried] = useState(false)
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const phone = f.phone.replace(/[\s-]/g, '')
  const errors = {
    name: f.name.trim().split(/\s+/).length < 2 ? 'Enter a first and last name.' : '',
    phone: !phoneOk(f.phone) ? 'Enter a phone number, e.g. 0803 123 4567.' : taken.some((c) => c.phone.replace(/[\s-]/g, '') === phone) ? 'A customer with this phone number already exists.' : '',
    city: !f.city.trim() ? 'Enter a city.' : '',
  }
  const bad = Object.values(errors).some(Boolean)
  const show = (k) => tried && errors[k] && <div className="err small">{errors[k]}</div>
  const save = (e) => {
    e.preventDefault(); setTried(true)
    if (bad) { document.getElementById(`ac-${Object.keys(errors).find((k) => errors[k])}`)?.focus(); return }
    const id = `M${Date.now().toString(36).slice(-5).toUpperCase()}`
    const name = f.name.trim().replace(/\s+/g, ' ')
    const c = { id, name, phone, city: f.city.trim(), country: f.country, orders: 0, spend: 0, last: 0, joined: Date.now(), source: 'Added by staff', note: f.note.trim(), manual: true }
    dispatch({ type: 'setAdmin', key: 'customers', value: { [id]: c }, log: `Added customer ${name}` })
    toast(`${name} added to customers`, { icon: 'CircleCheck' })
    onAdded()
  }
  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <form className="co-modal ac-modal" role="dialog" aria-modal="true" aria-labelledby="ac-title" onSubmit={save} noValidate>
        <div className="co-head">
          <div><h3 id="ac-title">Add customer</h3><p className="muted small">For buyers who order by phone, WhatsApp or in person.</p></div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="X" size={20} /></button>
        </div>
        <div className="co-body">
          <section className="co-sec">
            <div className="pe-2">
              <label className="set-field"><span>Full name</span><input id="ac-name" value={f.name} onChange={set('name')} placeholder="Ada Okafor" autoComplete="off" autoFocus /></label>
              <label className="set-field"><span>Phone</span><input id="ac-phone" value={f.phone} onChange={set('phone')} placeholder="0803 123 4567" inputMode="tel" autoComplete="off" /></label>
            </div>
            {show('name')}{show('phone')}
            <div className="pe-2">
              <label className="set-field"><span>City</span><input id="ac-city" value={f.city} onChange={set('city')} placeholder="Lagos" /></label>
              <label className="set-field"><span>Country</span><select id="ac-country" value={f.country} onChange={set('country')}>{COUNTRIES.map((x) => <option key={x}>{x}</option>)}</select></label>
            </div>
            {show('city')}
            <label className="set-field"><span>Internal note <em className="muted">optional</em></span><input id="ac-note" value={f.note} onChange={set('note')} placeholder="e.g. Prefers delivery after 5pm" /></label>
          </section>
        </div>
        <div className="co-foot">
          {tried && bad && <div className="err small">Fix the highlighted fields to add the customer.</div>}
          <div className="co-actions"><button type="button" className="btn-mini lg" onClick={onClose}>Cancel</button><button className="btn-orange"><Icon name="Plus" size={16} /> Add customer</button></div>
        </div>
      </form>
    </>
  , document.body)
}
