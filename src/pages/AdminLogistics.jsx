// Operations dashboard: Logistics (inbound shipments China → Lagos). Same layout as
// Orders, Products, Customers and Inventory. Sample shipments are deterministic;
// stage changes and new shipments are saved in state.admin.shipments.
import { Fragment, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useStore } from '../store/Store'
import { Icon } from '../components/Icon'
import { spring } from '../components/ui'
import { Menu, useOutside } from './AdminOrders'

const DAY = 864e5
const LEGS = ['Consolidated', 'Departed China', 'In transit', 'Arrived Nigeria', 'Customs cleared', 'Received at Ikeja WH']
const ORIGINS = { GZ: 'Guangzhou', YW: 'Yiwu / Ningbo', SZ: 'Shenzhen', SH: 'Shanghai', XM: 'Xiamen' }
const CARRIERS = { Air: ['Ethiopian Cargo', 'Emirates SkyCargo', 'Qatar Airways Cargo'], Sea: ['Maersk', 'MSC', 'CMA CGM'] }
const PORT = { Air: 'Lagos (MMIA)', Sea: 'Apapa Port' }
const fmtDate = (t) => new Date(t).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
const TABS = [['all', 'All'], ['prep', 'Consolidating'], ['transit', 'In transit'], ['customs', 'At customs'], ['done', 'Received'], ['delayed', 'Delayed']]
const SORTS = [['eta', 'ETA'], ['units', 'Units'], ['orders', 'Orders'], ['created', 'Newest']]
const tabOf = (s) => (s.stage === 0 ? 'prep' : s.stage <= 2 ? 'transit' : s.stage <= 4 ? 'customs' : 'done')

function demoShipments(chinaOrders) {
  const codes = ['GZ', 'YW', 'SZ', 'GZ', 'SH', 'YW', 'SZ', 'XM', 'GZ', 'YW', 'SZ', 'GZ', 'SH', 'YW']
  return codes.map((c, i) => {
    const mode = i % 3 === 1 ? 'Sea' : 'Air'
    const stage = [3, 2, 5, 1, 4, 0, 2, 5, 3, 1, 5, 0, 2, 5][i]
    const days = mode === 'Air' ? 9 : 38
    const delayed = i === 0 || i === 6
    // Received loads arrived in the past; active ones are due in proportion to the legs left; delayed ones are overdue
    const eta = stage === 5 ? Date.now() - (3 + i * 2) * DAY : delayed ? Date.now() - (i === 0 ? 2 : 1) * DAY : Date.now() + Math.max(1, Math.round(days * (1 - stage / 5))) * DAY
    return {
      id: `SHP-${c}-${String(928 - i * 7).padStart(4, '0')}`, mode, from: ORIGINS[c], to: PORT[mode], stage, created: eta - days * DAY,
      eta, carrier: CARRIERS[mode][i % 3],
      units: mode === 'Air' ? 300 + ((i * 137) % 500) : 2400 + ((i * 911) % 2600),
      orders: (mode === 'Air' ? 60 : 180) + ((i * 53) % 140) + (i === 0 ? chinaOrders : 0),
      delayed, delayNote: i === 0 ? 'Held 2 extra days at Lagos customs' : i === 6 ? 'Missed connecting flight in Addis Ababa' : '',
    }
  })
}

export default function Logistics({ orders, edit }) {
  const { state, dispatch, toast } = useStore()
  const saved = state.admin.shipments || {}
  const showStats = (state.admin.logisticsView || {}).stats !== false
  const chinaOrders = orders.filter((o) => o.fromChina).length
  const rows = useMemo(() => {
    const demo = demoShipments(chinaOrders).map((s) => ({ ...s, ...saved[s.id] }))
    const added = Object.values(saved).filter((s) => s && s.custom)
    return [...added, ...demo]
  }, [saved, chinaOrders])

  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [mode, setMode] = useState('')
  const [sort, setSort] = useState(['eta', 'asc'])
  const [per, setPer] = useState(10)
  const [page, setPage] = useState(1)
  const [sel, setSel] = useState(new Set())
  const [open, setOpen] = useState(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const fRef = useOutside(filterOpen, () => setFilterOpen(false))

  const inTab = (s, t) => t === 'all' || (t === 'delayed' ? s.delayed && s.stage < 5 : tabOf(s) === t)
  const val = { eta: (s) => s.eta, units: (s) => s.units, orders: (s) => s.orders, created: (s) => s.created }[sort[0]]
  const filtered = rows
    .filter((s) => inTab(s, tab) && (!mode || s.mode === mode) && `${s.id} ${s.from} ${s.to} ${s.carrier}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => { if (sort[0] === 'eta' && (a.stage === 5) !== (b.stage === 5)) return a.stage === 5 ? 1 : -1 // received loads go last by ETA
      const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * (sort[1] === 'asc' ? 1 : -1) })
  const pages = Math.max(1, Math.ceil(filtered.length / per))
  const cur = Math.min(page, pages)
  const shown = filtered.slice((cur - 1) * per, cur * per)
  useEffect(() => { setPage(1); setSel(new Set()) }, [tab, q, mode, per, sort])

  const active = rows.filter((s) => s.stage < 5)
  const stats = [
    ['Ship', 't-blue', 'Active Shipments', active.length, `${active.filter((s) => s.mode === 'Air').length} by air · ${active.filter((s) => s.mode === 'Sea').length} by sea`],
    ['Package', 't-orange', 'Units on the Way', active.reduce((n, s) => n + s.units, 0).toLocaleString(), `${active.reduce((n, s) => n + s.orders, 0).toLocaleString()} customer orders waiting`],
    ['TriangleAlert', 't-red', 'Delayed', active.filter((s) => s.delayed).length, active.filter((s) => s.delayed).map((s) => s.id).join(', ') || 'Everything on schedule'],
    ['Warehouse', 't-green', 'Received at Ikeja', rows.filter((s) => s.stage === 5).length, 'Shipments checked into the warehouse'],
  ]

  const save = (s, patch, log) => dispatch({ type: 'setAdmin', key: 'shipments', value: { [s.id]: { ...saved[s.id], ...patch } }, log })
  const advance = (s) => save(s, { stage: s.stage + 1, ...(s.stage + 1 === 5 ? { delayed: false } : {}) }, `${s.id} → ${LEGS[s.stage + 1]}`)
  const setDelay = (s, on) => save(s, { delayed: on, delayNote: on ? (s.delayNote || 'Delay reported by ops') : '' }, `${s.id} ${on ? 'flagged as delayed' : 'back on schedule'}`)
  const selected = filtered.filter((s) => sel.has(s.id))
  const bulkAdvance = () => { const list = selected.filter((s) => s.stage < 5); list.forEach(advance); toast(`Moved ${list.length} shipment${list.length === 1 ? '' : 's'} to the next step`, { icon: 'CircleCheck' }); setSel(new Set()) }
  const exportCsv = () => {
    const list = selected.length ? selected : filtered
    const head = ['Shipment', 'Mode', 'Carrier', 'From', 'To', 'Units', 'Orders', 'Step', 'ETA', 'Delayed']
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`
    const csv = [head, ...list.map((s) => [s.id, s.mode, s.carrier, s.from, s.to, s.units, s.orders, LEGS[s.stage], new Date(s.eta).toISOString().slice(0, 10), s.delayed ? `Yes: ${s.delayNote}` : 'No'])].map((r) => r.map(esc).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `oja-shipments-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    toast(`Exported ${list.length} shipment${list.length === 1 ? '' : 's'} to CSV`, { icon: 'CircleCheck' })
  }
  const allOnPage = shown.length > 0 && shown.every((s) => sel.has(s.id))
  const toggleAll = () => setSel(allOnPage ? new Set([...sel].filter((id) => !shown.some((s) => s.id === id))) : new Set([...sel, ...shown.map((s) => s.id)]))
  const toggle = (id) => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n) }
  const sortBy = (k) => setSort(([sk, dir]) => [k, sk === k ? (dir === 'asc' ? 'desc' : 'asc') : k === 'eta' ? 'asc' : 'desc'])
  const Th = ({ k, label }) => (
    <th aria-sort={sort[0] === k ? (sort[1] === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button type="button" className={`th-sort ${sort[0] === k ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); sortBy(k) }}>{label}<Icon name={sort[0] === k ? (sort[1] === 'asc' ? 'ChevronUp' : 'ChevronDown') : 'ChevronsUpDown'} size={13} /></button>
    </th>
  )
  const statusChip = (s) => s.stage === 5 ? <em className="chip good">Received</em> : s.delayed ? <em className="chip bad">Delayed</em> : <em className="chip info">On track</em>
  const rowMenu = (s) => [
    s.stage < 5 && { label: `Move to “${LEGS[s.stage + 1]}”`, icon: 'ArrowRight', disabled: !edit, onClick: () => advance(s) },
    s.stage < 5 && (s.delayed ? { label: 'Mark back on schedule', icon: 'CircleCheck', disabled: !edit, onClick: () => setDelay(s, false) } : { label: 'Flag as delayed', icon: 'TriangleAlert', disabled: !edit, onClick: () => setDelay(s, true) }),
    s.stage < 5 && '-',
    { label: open === s.id ? 'Hide tracking' : 'Show tracking', icon: 'MapPin', onClick: () => setOpen(open === s.id ? null : s.id) },
  ].filter(Boolean)
  const pageNums = pages <= 7 ? Array.from({ length: pages }, (_, i) => i + 1) : [1, ...(cur > 3 ? ['…'] : []), ...[cur - 1, cur, cur + 1].filter((n) => n > 1 && n < pages), ...(cur < pages - 2 ? ['…'] : []), pages]
  const daysLeft = (s) => { const d = Math.round((s.eta - Date.now()) / DAY); return s.stage === 5 ? 'Arrived' : d < 0 ? `${-d}d overdue` : d === 0 ? 'Today' : `in ${d}d` }

  return (
    <div className="ord prd">
      <div className="ord-head">
        <div>
          <h2>Logistics</h2>
          <p className="muted">Follow every shipment from China to the Ikeja warehouse</p>
        </div>
        <div className="ord-actions">
          <button type="button" className="btn-mini lg" onClick={exportCsv}><Icon name="Download" size={15} /> Export{selected.length ? ` (${selected.length})` : ''}</button>
          <button type="button" className="btn-orange" disabled={!edit} onClick={() => setCreating(true)}><Icon name="Plus" size={16} /> New Shipment</button>
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
        {TABS.map(([k, l]) => { const n = rows.filter((s) => inTab(s, k)).length; return (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}{k !== 'all' && n > 0 && <i>{n}</i>}</button>
        ) })}
      </div>

      <div className="prd-sub">
        <label className="ord-search"><Icon name="Search" size={16} /><input id="lg-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search shipment, city or carrier…" /></label>
        <div className="prd-bar-r">
          {selected.length > 0 && (
            <div className="prd-selbar">
              <b>{selected.length} selected</b>
              <button type="button" className="btn-mini" disabled={!edit || !selected.some((s) => s.stage < 5)} onClick={bulkAdvance}><Icon name="ArrowRight" size={14} /> Next step</button>
              <button type="button" className="btn-mini" onClick={() => setSel(new Set())}><Icon name="X" size={14} /> Clear</button>
            </div>
          )}
          <div className="om-wrap" ref={fRef}>
            <button type="button" className={`btn-mini lg ${mode ? 'active' : ''}`} onClick={() => setFilterOpen((o) => !o)} aria-expanded={filterOpen}><Icon name="Funnel" size={15} /> Filter{mode ? ' (1)' : ''}</button>
            {filterOpen && (
              <div className="om-menu right ord-filter">
                <label><span>Freight</span><select value={mode} onChange={(e) => setMode(e.target.value)}><option value="">Air and sea</option><option value="Air">Air freight</option><option value="Sea">Sea freight</option></select></label>
                <button type="button" className="btn-mini" onClick={() => setMode('')}>Reset filters</button>
              </div>
            )}
          </div>
          <Menu label={<><Icon name="ArrowUpDown" size={15} /> Sort</>} className="btn-mini lg" items={SORTS.map(([k, l]) => ({ label: `${l}${sort[0] === k ? (sort[1] === 'asc' ? ' ↑' : ' ↓') : ''}`, icon: sort[0] === k ? 'Check' : undefined, onClick: () => sortBy(k) }))} />
          <label className="prd-switch">Show Statistics
            <button type="button" className={`toggle ${showStats ? 'on' : ''}`} onClick={() => dispatch({ type: 'setAdmin', key: 'logisticsView', value: { stats: !showStats } })} aria-pressed={showStats} aria-label="Show statistics"><motion.span layout transition={spring} /></button>
          </label>
        </div>
      </div>

      <div className="table-wrap ord-table prd-table lg-table">
        <table className="tbl">
          <thead><tr>
            <th className="ord-cb"><input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Select all shipments on this page" /></th>
            <th>Shipment</th>
            <th>Route</th>
            <Th k="units" label="Units" />
            <Th k="orders" label="Orders" />
            <th>Progress</th>
            <Th k="eta" label="ETA" />
            <th>Status</th>
            <th>Action</th>
          </tr></thead>
          <tbody>
            {shown.map((s) => (
              <Fragment key={s.id}>
                <tr className={`clickable ${sel.has(s.id) ? 'sel' : ''} ${open === s.id ? 'lg-open' : ''}`} onClick={() => setOpen(open === s.id ? null : s.id)} title="Show tracking">
                  <td className="ord-cb" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={sel.has(s.id)} onChange={() => toggle(s.id)} aria-label={`Select ${s.id}`} /></td>
                  <td><div className="ord-cust"><span className={`lg-mode ${s.mode.toLowerCase()}`}><Icon name={s.mode === 'Air' ? 'Plane' : 'Ship'} size={16} /></span><div><b>{s.id}</b><div className="muted small">{s.mode} · {s.carrier}</div></div></div></td>
                  <td className="small nowrap">{s.from}<div className="muted">→ {s.to}</div></td>
                  <td className="nowrap">{s.units.toLocaleString()}</td>
                  <td className="nowrap">{s.orders.toLocaleString()}</td>
                  <td><div className="lg-prog"><span className="small nowrap">{LEGS[s.stage]}</span><span className="lg-bar"><motion.i initial={{ width: 0 }} animate={{ width: `${(s.stage / (LEGS.length - 1)) * 100}%` }} transition={{ duration: 0.6 }} /></span></div></td>
                  <td className="small nowrap">{fmtDate(s.eta)}<div className={`muted ${s.stage < 5 && s.eta < Date.now() ? 'bad' : ''}`}>{daysLeft(s)}</div></td>
                  <td className="nowrap">{statusChip(s)}</td>
                  <td onClick={(e) => e.stopPropagation()}><Menu icon="Ellipsis" items={rowMenu(s)} className="icon-btn" label="" /></td>
                </tr>
                {open === s.id && (
                  <tr className="lg-detail"><td colSpan={9}>
                    {s.delayed && s.stage < 5 && <div className="lg-alert"><Icon name="TriangleAlert" size={15} /> {s.delayNote}</div>}
                    <div className="ship-track">
                      {LEGS.map((l, k) => (
                        <div key={l} className={`ship-leg ${k <= s.stage ? 'done' : ''}`}>
                          <motion.span className="ship-dot" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1 + k * 0.06 }} />
                          <span className="small">{l}</span>
                        </div>
                      ))}
                      <motion.div className="ship-line" initial={{ scaleX: 0 }} animate={{ scaleX: s.stage / (LEGS.length - 1) }} transition={{ duration: 0.7, delay: 0.15 }} />
                    </div>
                  </td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {!shown.length && <div className="ord-empty"><Icon name="SearchX" size={22} /><b>No shipments here</b><span className="muted small">Try another tab, filter or search.</span></div>}
      </div>

      <div className="ord-pager">
        <span className="small muted">{filtered.length ? `Showing ${(cur - 1) * per + 1}–${Math.min(cur * per, filtered.length)} of ${filtered.length}` : '0 shipments'}</span>
        <label className="small muted">Per page <select value={per} onChange={(e) => setPer(+e.target.value)}>{[10, 20, 50].map((n) => <option key={n}>{n}</option>)}</select></label>
        <nav className="ord-pages" aria-label="Pages">
          <button type="button" className="pg" disabled={cur === 1} onClick={() => setPage(cur - 1)} aria-label="Previous page"><Icon name="ChevronLeft" size={14} /></button>
          {pageNums.map((n, i) => n === '…' ? <span key={`e${i}`} className="pg-gap">…</span> : <button type="button" key={n} className={`pg ${n === cur ? 'on' : ''}`} aria-current={n === cur ? 'page' : undefined} onClick={() => setPage(n)}>{n}</button>)}
          <button type="button" className="pg" disabled={cur === pages} onClick={() => setPage(cur + 1)} aria-label="Next page"><Icon name="ChevronRight" size={14} /></button>
        </nav>
      </div>
      {creating && <NewShipmentModal taken={rows} onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); setTab('all'); setQ(''); setMode(''); setSort(['created', 'desc']); setOpen(id) }} />}
    </div>
  )
}

/* ---------- New shipment ---------- */
function NewShipmentModal({ taken, onClose, onCreated }) {
  const { dispatch, toast } = useStore()
  const [f, setF] = useState({ origin: 'GZ', mode: 'Air', carrier: CARRIERS.Air[0], units: '', orders: '', eta: new Date(Date.now() + 9 * DAY).toISOString().slice(0, 10) })
  const [tried, setTried] = useState(false)
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  const set = (k) => (e) => {
    const v = e.target.value
    if (k === 'mode') setF({ ...f, mode: v, carrier: CARRIERS[v][0], eta: new Date(Date.now() + (v === 'Air' ? 9 : 38) * DAY).toISOString().slice(0, 10) })
    else setF({ ...f, [k]: v })
  }
  const units = Math.floor(Number(f.units)), ordersN = f.orders === '' ? 0 : Math.floor(Number(f.orders))
  const etaT = f.eta ? new Date(f.eta + 'T12:00:00').getTime() : NaN
  const errors = {
    units: !(units > 0 && units <= 1e6) ? 'Enter the number of units, from 1 to 1,000,000.' : '',
    orders: !(ordersN >= 0 && ordersN <= 1e5) ? 'Enter 0 or more orders.' : '',
    eta: !(etaT > Date.now() - DAY) ? 'Choose an arrival date from today on.' : '',
  }
  const bad = Object.values(errors).some(Boolean)
  const show = (k) => tried && errors[k] && <div className="err small">{errors[k]}</div>
  const create = (e) => {
    e.preventDefault(); setTried(true)
    if (bad) { document.getElementById(`ns-${Object.keys(errors).find((k) => errors[k])}`)?.focus(); return }
    let n = 1000 + taken.length, id
    do { id = `SHP-${f.origin}-${n++}` } while (taken.some((s) => s.id === id))
    const s = { id, mode: f.mode, from: ORIGINS[f.origin], to: PORT[f.mode], stage: 0, created: Date.now(), eta: etaT, carrier: f.carrier, units, orders: ordersN, delayed: false, delayNote: '', custom: true }
    dispatch({ type: 'setAdmin', key: 'shipments', value: { [id]: s }, log: `Created shipment ${id} (${units} units, ${f.mode})` })
    toast(`Shipment ${id} created`, { icon: 'CircleCheck' })
    onCreated(id)
  }
  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <form className="co-modal ac-modal" role="dialog" aria-modal="true" aria-labelledby="ns-title" onSubmit={create} noValidate>
        <div className="co-head">
          <div><h3 id="ns-title">New shipment</h3><p className="muted small">Log a consolidated load leaving a China warehouse.</p></div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="X" size={20} /></button>
        </div>
        <div className="co-body">
          <section className="co-sec">
            <div className="pe-2">
              <label className="set-field"><span>From</span><select id="ns-origin" value={f.origin} onChange={set('origin')}>{Object.entries(ORIGINS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              <label className="set-field"><span>Freight</span><select id="ns-mode" value={f.mode} onChange={set('mode')}><option value="Air">Air → {PORT.Air}</option><option value="Sea">Sea → {PORT.Sea}</option></select></label>
            </div>
            <div className="pe-2">
              <label className="set-field"><span>Carrier</span><select id="ns-carrier" value={f.carrier} onChange={set('carrier')}>{CARRIERS[f.mode].map((c) => <option key={c}>{c}</option>)}</select></label>
              <label className="set-field"><span>Expected arrival</span><input id="ns-eta" type="date" value={f.eta} onChange={set('eta')} /></label>
            </div>
            {show('eta')}
            <div className="pe-2">
              <label className="set-field"><span>Units</span><input id="ns-units" type="number" min="1" inputMode="numeric" value={f.units} onChange={set('units')} placeholder="e.g. 450" /></label>
              <label className="set-field"><span>Customer orders <em className="muted">optional</em></span><input id="ns-orders" type="number" min="0" inputMode="numeric" value={f.orders} onChange={set('orders')} placeholder="e.g. 120" /></label>
            </div>
            {show('units')}{show('orders')}
          </section>
        </div>
        <div className="co-foot">
          {tried && bad && <div className="err small">Fix the highlighted fields to create the shipment.</div>}
          <div className="co-actions"><button type="button" className="btn-mini lg" onClick={onClose}>Cancel</button><button className="btn-orange"><Icon name="Plus" size={16} /> Create shipment</button></div>
        </div>
      </form>
    </>
  , document.body)
}
