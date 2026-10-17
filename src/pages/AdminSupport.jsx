// Operations dashboard: Support cases (shopper cases from the Help page, plus cases
// staff log from calls and chats). Same layout as the other list pages.
// Status, assignee and staff-logged cases are saved in state.admin.
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useStore } from '../store/Store'
import { Icon } from '../components/Icon'
import { spring } from '../components/ui'
import { Menu, useOutside } from './AdminOrders'

const DAY = 864e5
const CASE_TYPES = { damaged: 'Damaged item', wrong: 'Wrong item', missing: 'Missing item', late: 'Late delivery', payment: 'Payment issue', other: 'Other' }
const HIGH = new Set(['damaged', 'wrong', 'missing', 'payment'])
const AGENTS = ['Amaka (Support)', 'Tunde (Logistics)', 'Zainab (Payments)', 'Kofi (Support)']
const CHANNELS = ['Help page', 'Phone call', 'WhatsApp', 'Email', 'Instagram DM']
const STATUSES = ['Open', 'In progress', 'Resolved']
const STATUS_TONE = { Open: 'warn', 'In progress': 'info', Resolved: 'good' }
const ago = (t) => { const m = Math.max(0, Math.round((Date.now() - t) / 6e4)); return m < 60 ? `${m || 1} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : (Math.round(m / 1440) === 1 ? "1 day ago" : `${Math.round(m / 1440)} days ago`) }
const initials = (n) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
const TABS = [['all', 'All'], ['Open', 'Open'], ['In progress', 'In progress'], ['Resolved', 'Resolved'], ['high', 'High priority'], ['unassigned', 'Unassigned']]
const SORTS = [['at', 'Newest'], ['priority', 'Priority']]

const DEMO = [
  ['CS-7Q2KD1', 'OJ-260921-K7Q2M', 'late', 'Order still in transit after the estimate.', 'Open', 0.3, 'Chiamaka Okafor', '08031234567', 'Help page', ''],
  ['CS-B3XZ80', 'OJ-260929-B3XZ8', 'damaged', 'Power bank arrived with a cracked casing.', 'In progress', 1.2, 'Tunde Adeyemi', '08031235678', 'WhatsApp', AGENTS[0]],
  ['CS-M4PA22', '', 'payment', 'Charged twice for one order.', 'Open', 2.4, 'Ngozi Eze', '08031236789', 'Phone call', AGENTS[2]],
  ['CS-T8RW05', 'OJ-260814-T8RW0', 'wrong', 'Received black instead of white earbuds.', 'Resolved', 6, 'Kwame Mensah', '0244123456', 'Help page', AGENTS[0]],
  ['CS-H2LN47', 'OJ-261002-H2LN4', 'missing', 'Box arrived with only one of the two fans I ordered.', 'Open', 0.1, 'Amina Bello', '08031237890', 'Help page', ''],
  ['CS-P9VC13', 'OJ-260930-P9VC1', 'late', 'Delivery window passed and rider is not answering.', 'In progress', 0.8, 'Emeka Nwosu', '08031239012', 'Phone call', AGENTS[1]],
  ['CS-K5DE91', '', 'other', 'Asking if the hair dryer works on 220V Nigerian sockets.', 'Resolved', 3.5, 'Wanjiru Kamau', '0712345678', 'Instagram DM', AGENTS[3]],
  ['CS-R1QS64', 'OJ-260925-R1QS6', 'damaged', 'Luggage wheel snapped off on first use.', 'Open', 1.6, 'Seyi Lawal', '08031240123', 'WhatsApp', ''],
  ['CS-W6JT38', 'OJ-260918-W6JT3', 'payment', 'Bank transfer made but order still shows awaiting payment.', 'In progress', 0.5, 'Kofi Boateng', '0201234567', 'Email', AGENTS[2]],
  ['CS-Z3BF72', 'OJ-260910-Z3BF7', 'wrong', 'Got size 42 sneakers instead of 44.', 'Resolved', 9, 'Halima Yusuf', '08031242345', 'Help page', AGENTS[3]],
  ['CS-N8GU05', 'OJ-261004-N8GU0', 'late', 'Customs hold: customer wants an update on shipment.', 'Open', 0.05, 'Thabo Ndlovu', '0821234567', 'WhatsApp', AGENTS[1]],
  ['CS-E4MX29', '', 'other', 'Wants to change delivery address after ordering.', 'Resolved', 4.2, 'Blessing Udo', '08031244567', 'Phone call', AGENTS[0]],
].map(([id, order, type, desc, status, d, name, phone, channel, assignee]) => ({ id, order, type, desc, status, at: Date.now() - d * DAY, name, phone, channel, assignee, priority: HIGH.has(type) ? 'High' : 'Normal', demo: true }))

export default function Support({ edit }) {
  const { state, dispatch, toast } = useStore()
  const over = state.admin.cases || {} // older saves store a plain status string per case
  const logged = state.admin.staffCases || {}
  const showStats = (state.admin.supportView || {}).stats !== false
  const rows = useMemo(() => {
    const shopper = state.cases.map((c) => ({ ...c, name: state.user?.name || 'Shopper (this device)', phone: state.user?.phone || state.user?.email || '—', channel: 'Help page', assignee: '' }))
    const staff = Object.values(logged).filter(Boolean)
    return [...staff, ...shopper, ...DEMO].map((c) => { const o = over[c.id]; const patch = typeof o === 'string' ? { status: o } : o || {}; return { ...c, ...patch } })
  }, [state.cases, state.user, logged, over])

  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [channel, setChannel] = useState('')
  const [sort, setSort] = useState(['at', 'desc'])
  const [per, setPer] = useState(10)
  const [page, setPage] = useState(1)
  const [sel, setSel] = useState(new Set())
  const [filterOpen, setFilterOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const fRef = useOutside(filterOpen, () => setFilterOpen(false))

  const inTab = (c, t) => t === 'all' || (t === 'high' ? c.priority === 'High' && c.status !== 'Resolved' : t === 'unassigned' ? !c.assignee && c.status !== 'Resolved' : c.status === t)
  const val = { at: (c) => c.at, priority: (c) => (c.priority === 'High' ? 1 : 0) * 1e13 + c.at }[sort[0]]
  const filtered = rows
    .filter((c) => inTab(c, tab) && (!type || c.type === type) && (!channel || c.channel === channel) && `${c.id} ${c.order} ${c.name} ${c.phone} ${c.desc} ${CASE_TYPES[c.type]}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * (sort[1] === 'asc' ? 1 : -1) })
  const pages = Math.max(1, Math.ceil(filtered.length / per))
  const cur = Math.min(page, pages)
  const shown = filtered.slice((cur - 1) * per, cur * per)
  useEffect(() => { setPage(1); setSel(new Set()) }, [tab, q, type, channel, per, sort])

  const open = rows.filter((c) => c.status !== 'Resolved')
  const oldest = open.reduce((m, c) => Math.min(m, c.at), Infinity)
  const stats = [
    ['Ticket', 't-orange', 'Open Cases', open.length, `${open.filter((c) => c.status === 'In progress').length} being worked on`],
    ['TriangleAlert', 't-red', 'High Priority', open.filter((c) => c.priority === 'High').length, 'Damaged, wrong, missing or payment'],
    ['Hourglass', 't-blue', 'Oldest Open Case', open.length ? ago(oldest).replace(' ago', '') : '—', open.length ? 'Waiting for a resolution' : 'Nothing waiting'],
    ['CircleCheck', 't-green', 'Resolved', rows.filter((c) => c.status === 'Resolved').length, `${Math.round((rows.filter((c) => c.status === 'Resolved').length / (rows.length || 1)) * 100)}% of all cases`],
  ]

  const update = (c, patch, log) => { const o = over[c.id]; dispatch({ type: 'setAdmin', key: 'cases', value: { [c.id]: { ...(typeof o === 'string' ? { status: o } : o), ...patch } }, log }) }
  const setStatus = (c, s) => { update(c, { status: s }, `Case ${c.id} → ${s}`); toast(`${c.id} marked ${s.toLowerCase()}`, { icon: 'CircleCheck' }) }
  const assign = (c, a) => update(c, { assignee: a, ...(a && c.status === 'Open' ? { status: 'In progress' } : {}) }, `Case ${c.id} ${a ? `assigned to ${a}` : 'unassigned'}`)
  const selected = filtered.filter((c) => sel.has(c.id))
  const bulkStatus = (s) => { selected.forEach((c) => update(c, { status: s }, `Case ${c.id} → ${s}`)); toast(`Marked ${selected.length} case${selected.length === 1 ? '' : 's'} ${s.toLowerCase()}`, { icon: 'CircleCheck' }); setSel(new Set()) }
  const bulkAssign = (a) => { selected.forEach((c) => assign(c, a)); toast(`Assigned ${selected.length} case${selected.length === 1 ? '' : 's'} to ${a}`, { icon: 'CircleCheck' }); setSel(new Set()) }
  const exportCsv = () => {
    const list = selected.length ? selected : filtered
    const head = ['Case', 'Opened', 'Customer', 'Phone', 'Channel', 'Issue', 'Description', 'Order', 'Priority', 'Assignee', 'Status']
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`
    const csv = [head, ...list.map((c) => [c.id, new Date(c.at).toISOString(), c.name, c.phone, c.channel, CASE_TYPES[c.type] || 'Other', c.desc, c.order, c.priority, c.assignee || 'Unassigned', c.status])].map((r) => r.map(esc).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `oja-support-cases-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    toast(`Exported ${list.length} case${list.length === 1 ? '' : 's'} to CSV`, { icon: 'CircleCheck' })
  }
  const allOnPage = shown.length > 0 && shown.every((c) => sel.has(c.id))
  const toggleAll = () => setSel(allOnPage ? new Set([...sel].filter((id) => !shown.some((c) => c.id === id))) : new Set([...sel, ...shown.map((c) => c.id)]))
  const toggle = (id) => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n) }
  const sortBy = (k) => setSort(([sk, dir]) => [k, sk === k ? (dir === 'asc' ? 'desc' : 'asc') : 'desc'])
  const Th = ({ k, label }) => (
    <th aria-sort={sort[0] === k ? (sort[1] === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button type="button" className={`th-sort ${sort[0] === k ? 'on' : ''}`} onClick={() => sortBy(k)}>{label}<Icon name={sort[0] === k ? (sort[1] === 'asc' ? 'ChevronUp' : 'ChevronDown') : 'ChevronsUpDown'} size={13} /></button>
    </th>
  )
  const realOrder = (c) => c.order && state.orders.some((o) => o.ref === c.order)
  const rowMenu = (c) => [
    ...STATUSES.filter((s) => s !== c.status).map((s) => ({ label: s === 'Open' ? 'Reopen case' : `Mark ${s.toLowerCase()}`, icon: s === 'Resolved' ? 'CircleCheck' : s === 'Open' ? 'RotateCcw' : 'ArrowRight', disabled: !edit, onClick: () => setStatus(c, s) })),
    '-',
    { label: 'Copy phone number', icon: 'Copy', disabled: !/\d/.test(c.phone), onClick: () => { navigator.clipboard?.writeText(c.phone); toast(`Copied ${c.phone}`, { icon: 'CircleCheck' }) } },
    realOrder(c) && { label: 'Open order tracking', icon: 'MapPin', onClick: () => window.open(`/orders/${c.order}`, '_blank') },
    c.staff && '-',
    c.staff && { label: 'Delete case', icon: 'X', danger: true, disabled: !edit, onClick: () => { dispatch({ type: 'setAdmin', key: 'staffCases', value: { [c.id]: null }, log: `Deleted case ${c.id}` }); toast(`${c.id} deleted`, { icon: 'CircleCheck' }) } },
  ].filter(Boolean)
  const pageNums = pages <= 7 ? Array.from({ length: pages }, (_, i) => i + 1) : [1, ...(cur > 3 ? ['…'] : []), ...[cur - 1, cur, cur + 1].filter((n) => n > 1 && n < pages), ...(cur < pages - 2 ? ['…'] : []), pages]
  const nFilters = (type !== '') + (channel !== '')

  return (
    <div className="ord prd">
      <div className="ord-head">
        <div>
          <h2>Support cases</h2>
          <p className="muted">Cases from the Help page, calls and chats, so nothing slips through</p>
        </div>
        <div className="ord-actions">
          <button type="button" className="btn-mini lg" onClick={exportCsv}><Icon name="Download" size={15} /> Export{selected.length ? ` (${selected.length})` : ''}</button>
          <button type="button" className="btn-orange" disabled={!edit} onClick={() => setCreating(true)}><Icon name="Plus" size={16} /> New Case</button>
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
        <label className="ord-search"><Icon name="Search" size={16} /><input id="sc-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search case, customer, order or issue…" /></label>
        <div className="prd-bar-r">
          {selected.length > 0 && (
            <div className="prd-selbar">
              <b>{selected.length} selected</b>
              <Menu label={<>Assign <Icon name="ChevronDown" size={14} /></>} className="btn-mini" items={AGENTS.map((a) => ({ label: a, disabled: !edit, onClick: () => bulkAssign(a) }))} />
              <button type="button" className="btn-mini" disabled={!edit} onClick={() => bulkStatus('Resolved')}><Icon name="CircleCheck" size={14} /> Resolve</button>
              <button type="button" className="btn-mini" onClick={() => setSel(new Set())}><Icon name="X" size={14} /> Clear</button>
            </div>
          )}
          <div className="om-wrap" ref={fRef}>
            <button type="button" className={`btn-mini lg ${nFilters ? 'active' : ''}`} onClick={() => setFilterOpen((o) => !o)} aria-expanded={filterOpen}><Icon name="Funnel" size={15} /> Filter{nFilters ? ` (${nFilters})` : ''}</button>
            {filterOpen && (
              <div className="om-menu right ord-filter">
                <label><span>Issue</span><select value={type} onChange={(e) => setType(e.target.value)}><option value="">All issues</option>{Object.entries(CASE_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
                <label><span>Channel</span><select value={channel} onChange={(e) => setChannel(e.target.value)}><option value="">All channels</option>{CHANNELS.map((x) => <option key={x}>{x}</option>)}</select></label>
                <button type="button" className="btn-mini" onClick={() => { setType(''); setChannel('') }}>Reset filters</button>
              </div>
            )}
          </div>
          <Menu label={<><Icon name="ArrowUpDown" size={15} /> Sort</>} className="btn-mini lg" items={SORTS.map(([k, l]) => ({ label: `${l}${sort[0] === k ? (sort[1] === 'asc' ? ' ↑' : ' ↓') : ''}`, icon: sort[0] === k ? 'Check' : undefined, onClick: () => sortBy(k) }))} />
          <label className="prd-switch">Show Statistics
            <button type="button" className={`toggle ${showStats ? 'on' : ''}`} onClick={() => dispatch({ type: 'setAdmin', key: 'supportView', value: { stats: !showStats } })} aria-pressed={showStats} aria-label="Show statistics"><motion.span layout transition={spring} /></button>
          </label>
        </div>
      </div>

      <div className="table-wrap ord-table prd-table sc-table">
        <table className="tbl">
          <thead><tr>
            <th className="ord-cb"><input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Select all cases on this page" /></th>
            <th>Case</th>
            <th>Customer</th>
            <th>Issue</th>
            <Th k="priority" label="Priority" />
            <th>Assignee</th>
            <Th k="at" label="Opened" />
            <th>Status</th>
            <th>Action</th>
          </tr></thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.id} className={sel.has(c.id) ? 'sel' : ''}>
                <td className="ord-cb"><input type="checkbox" checked={sel.has(c.id)} onChange={() => toggle(c.id)} aria-label={`Select ${c.id}`} /></td>
                <td className="nowrap"><b>{c.id}</b><div className="muted small">{c.order || 'No order'}</div></td>
                <td><div className="ord-cust"><span className="cust-av">{initials(c.name)}</span><div><b>{c.name}</b><div className="muted small">{c.channel}</div></div></div></td>
                <td><div className="sc-issue"><b className="small">{CASE_TYPES[c.type] || 'Other'}</b><span className="muted small clamp2">{c.desc}</span>{c.files?.length ? <span className="muted small row-ico"><Icon name="Paperclip" size={12} /> {c.files.length} attachment{c.files.length === 1 ? '' : 's'}</span> : null}</div></td>
                <td className="nowrap"><em className={`chip ${c.priority === 'High' ? 'bad' : 'info'}`}>{c.priority}</em></td>
                <td>
                  <select className="inv-loc" value={c.assignee || ''} disabled={!edit || c.status === 'Resolved'} onChange={(e) => assign(c, e.target.value)} aria-label={`Assignee for ${c.id}`}>
                    <option value="">Unassigned</option>{AGENTS.map((a) => <option key={a}>{a}</option>)}
                  </select>
                </td>
                <td className={`small nowrap ${c.status !== 'Resolved' && Date.now() - c.at > 2 * DAY ? 'bad' : ''}`}>{ago(c.at)}</td>
                <td className="nowrap"><em className={`chip ${STATUS_TONE[c.status]}`}>{c.status}</em></td>
                <td><Menu icon="Ellipsis" items={rowMenu(c)} className="icon-btn" label="" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <div className="ord-empty"><Icon name="SearchX" size={22} /><b>No cases here</b><span className="muted small">Try another tab, filter or search.</span></div>}
      </div>

      <div className="ord-pager">
        <span className="small muted">{filtered.length ? `Showing ${(cur - 1) * per + 1}–${Math.min(cur * per, filtered.length)} of ${filtered.length}` : '0 cases'}</span>
        <label className="small muted">Per page <select value={per} onChange={(e) => setPer(+e.target.value)}>{[10, 20, 50].map((n) => <option key={n}>{n}</option>)}</select></label>
        <nav className="ord-pages" aria-label="Pages">
          <button type="button" className="pg" disabled={cur === 1} onClick={() => setPage(cur - 1)} aria-label="Previous page"><Icon name="ChevronLeft" size={14} /></button>
          {pageNums.map((n, i) => n === '…' ? <span key={`e${i}`} className="pg-gap">…</span> : <button type="button" key={n} className={`pg ${n === cur ? 'on' : ''}`} aria-current={n === cur ? 'page' : undefined} onClick={() => setPage(n)}>{n}</button>)}
          <button type="button" className="pg" disabled={cur === pages} onClick={() => setPage(cur + 1)} aria-label="Next page"><Icon name="ChevronRight" size={14} /></button>
        </nav>
      </div>
      {creating && <NewCaseModal orders={state.orders} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); setTab('all'); setQ(''); setType(''); setChannel(''); setSort(['at', 'desc']) }} />}
    </div>
  )
}

/* ---------- New case (logged by staff from a call or chat) ---------- */
function NewCaseModal({ orders, onClose, onCreated }) {
  const { dispatch, toast } = useStore()
  const [f, setF] = useState({ name: '', phone: '', channel: 'Phone call', order: '', type: '', desc: '', priority: '', assignee: '' })
  const [tried, setTried] = useState(false)
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const pickOrder = (ref) => { const o = orders.find((x) => x.ref === ref); setF({ ...f, order: ref, ...(o && !f.name ? { name: o.address.name, phone: o.address.phone } : {}) }) }
  const priority = f.priority || (HIGH.has(f.type) ? 'High' : 'Normal')
  const errors = {
    name: f.name.trim().length < 2 ? 'Enter the customer’s name.' : '',
    phone: !/^\+?\d{10,15}$/.test(f.phone.replace(/[\s-]/g, '')) ? 'Enter a phone number, e.g. 0803 123 4567.' : '',
    type: !f.type ? 'Choose the issue.' : '',
    desc: f.desc.trim().length < 10 ? 'Describe the problem in a sentence or two.' : '',
  }
  const bad = Object.values(errors).some(Boolean)
  const show = (k) => tried && errors[k] && <div className="err small">{errors[k]}</div>
  const create = (e) => {
    e.preventDefault(); setTried(true)
    if (bad) { document.getElementById(`nc-${Object.keys(errors).find((k) => errors[k])}`)?.focus(); return }
    const id = 'CS-' + Math.random().toString(36).slice(2, 8).toUpperCase()
    const c = { id, name: f.name.trim(), phone: f.phone.replace(/[\s-]/g, ''), channel: f.channel, order: f.order.trim().toUpperCase(), type: f.type, desc: f.desc.trim(), priority, assignee: f.assignee, status: f.assignee ? 'In progress' : 'Open', at: Date.now(), staff: true }
    dispatch({ type: 'setAdmin', key: 'staffCases', value: { [id]: c }, log: `Logged case ${id} for ${c.name} (${CASE_TYPES[c.type]})` })
    toast(`Case ${id} logged`, { icon: 'Ticket' })
    onCreated()
  }
  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <form className="co-modal ac-modal" role="dialog" aria-modal="true" aria-labelledby="nc-title" onSubmit={create} noValidate>
        <div className="co-head">
          <div><h3 id="nc-title">New case</h3><p className="muted small">Log a problem a customer reported by phone, WhatsApp or email.</p></div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="X" size={20} /></button>
        </div>
        <div className="co-body">
          <section className="co-sec">
            <h4>Customer</h4>
            {orders.length > 0 && <label className="set-field"><span>Related order <em className="muted">optional</em></span><select id="nc-order" value={orders.some((o) => o.ref === f.order) ? f.order : ''} onChange={(e) => pickOrder(e.target.value)}><option value="">No order / type it below</option>{orders.slice(0, 30).map((o) => <option key={o.ref} value={o.ref}>{o.ref} · {o.address.name}</option>)}</select></label>}
            <div className="pe-2">
              <label className="set-field"><span>Full name</span><input id="nc-name" value={f.name} onChange={set('name')} placeholder="Ada Okafor" autoComplete="off" autoFocus /></label>
              <label className="set-field"><span>Phone</span><input id="nc-phone" value={f.phone} onChange={set('phone')} placeholder="0803 123 4567" inputMode="tel" autoComplete="off" /></label>
            </div>
            {show('name')}{show('phone')}
            <div className="pe-2">
              <label className="set-field"><span>Reported via</span><select id="nc-channel" value={f.channel} onChange={set('channel')}>{CHANNELS.filter((x) => x !== 'Help page').map((x) => <option key={x}>{x}</option>)}</select></label>
              {!orders.some((o) => o.ref === f.order) ? <label className="set-field"><span>Order number <em className="muted">optional</em></span><input id="nc-ordertext" value={f.order} onChange={set('order')} placeholder="OJ-261004-ABC12" autoComplete="off" /></label> : <span />}
            </div>
          </section>
          <section className="co-sec">
            <h4>Problem</h4>
            <div className="pe-2">
              <label className="set-field"><span>Issue</span><select id="nc-type" value={f.type} onChange={set('type')}><option value="">Choose…</option>{Object.entries(CASE_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
              <label className="set-field"><span>Priority</span><select id="nc-priority" value={priority} onChange={set('priority')}><option>High</option><option>Normal</option></select></label>
            </div>
            {show('type')}
            <label className="set-field"><span>What happened</span><textarea id="nc-desc" rows={3} value={f.desc} onChange={set('desc')} placeholder="e.g. Fan arrived but the remote is missing from the box." /></label>
            {show('desc')}
            <label className="set-field"><span>Assign to <em className="muted">optional</em></span><select id="nc-assignee" value={f.assignee} onChange={set('assignee')}><option value="">Leave unassigned</option>{AGENTS.map((a) => <option key={a}>{a}</option>)}</select></label>
          </section>
        </div>
        <div className="co-foot">
          {tried && bad && <div className="err small">Fix the highlighted fields to log the case.</div>}
          <div className="co-actions"><button type="button" className="btn-mini lg" onClick={onClose}>Cancel</button><button className="btn-orange"><Icon name="Plus" size={16} /> Log case</button></div>
        </div>
      </form>
    </>
  , document.body)
}
