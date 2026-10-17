// Operations dashboard: Team & permissions (members, roles, invites, role → page
// access grid). Same layout as the other list pages. Role changes, suspensions and
// invites are saved in state.admin.team.
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useStore } from '../store/Store'
import { Icon } from '../components/Icon'
import { spring } from '../components/ui'
import { Menu, useOutside } from './AdminOrders'

const HOUR = 36e5
const BASE = [
  ['Adaeze Nwankwo', 'Super Admin', 'Lagos', 0.2],
  ['Kwabena Osei', 'Product Manager', 'Accra', 3],
  ['Ifeoma Obi', 'Inventory Officer', 'Lagos', 1],
  ['Daniel Mwangi', 'Logistics Officer', 'Nairobi', 0.5],
  ['Bisi Alade', 'Finance', 'Lagos', 26],
  ['Yemi Bakare', 'Support Agent', 'Ibadan', 0.1],
  ['Grace Okon', 'Analyst', 'Abuja', 50],
  ['Amaka Eze', 'Support Agent', 'Enugu', 2],
  ['Tunde Bello', 'Logistics Officer', 'Lagos', 6],
  ['Zainab Musa', 'Finance', 'Kano', 74],
].map(([name, role, city, h], i) => ({ id: `T${100 + i}`, name, role, city, email: `${name.split(' ')[0].toLowerCase()}@oja.africa`, last: Date.now() - h * HOUR, joined: Date.now() - (40 + i * 37) * 24 * HOUR, status: 'Active' }))
const CITIES = ['Lagos', 'Abuja', 'Ibadan', 'Port Harcourt', 'Kano', 'Enugu', 'Accra', 'Nairobi', 'Johannesburg', 'Remote']
const initials = (n) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
const ago = (t) => { const m = Math.max(0, Math.round((Date.now() - t) / 6e4)); return m < 5 ? 'Online now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : (Math.round(m / 1440) === 1 ? "1 day ago" : `${Math.round(m / 1440)} days ago`) }
const TABS = [['all', 'All'], ['Active', 'Active'], ['Invited', 'Invited'], ['Suspended', 'Suspended'], ['edit', 'Can edit'], ['read', 'Read-only']]
const SORTS = [['name', 'Name (A–Z)'], ['last', 'Last active'], ['role', 'Role']]
const STATUS_TONE = { Active: 'good', Invited: 'info', Suspended: 'bad' }

export default function Team({ roles, nav, canEdit, edit }) {
  const { state, dispatch, toast } = useStore()
  const saved = state.admin.team || {}
  const showStats = (state.admin.teamView || {}).stats !== false
  const pages = nav.filter(([k]) => k !== 'team' && k !== 'settings')
  const rows = useMemo(() => {
    const invited = Object.values(saved).filter((m) => m && m.custom)
    return [...invited, ...BASE.map((m) => ({ ...m, ...saved[m.id] }))].filter((m) => !m.removed)
  }, [saved])

  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [sort, setSort] = useState(['name', 'asc'])
  const [sel, setSel] = useState(new Set())
  const [filterOpen, setFilterOpen] = useState(false)
  const [inviting, setInviting] = useState(false)
  const fRef = useOutside(filterOpen, () => setFilterOpen(false))

  const inTab = (m, t) => t === 'all' || (t === 'edit' ? canEdit.has(m.role) && m.status === 'Active' : t === 'read' ? !canEdit.has(m.role) : m.status === t)
  const val = { name: (m) => m.name.toLowerCase(), last: (m) => (m.status === 'Invited' ? 0 : m.last), role: (m) => Object.keys(roles).indexOf(m.role) }[sort[0]]
  const filtered = rows
    .filter((m) => inTab(m, tab) && (!role || m.role === role) && `${m.name} ${m.email} ${m.role} ${m.city}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * (sort[1] === 'asc' ? 1 : -1) })
  useEffect(() => { setSel(new Set()) }, [tab, q, role, sort])

  const active = rows.filter((m) => m.status === 'Active')
  const stats = [
    ['Users', 't-orange', 'Team Members', rows.length, `${new Set(rows.map((m) => m.city)).size} cities`],
    ['BadgeCheck', 't-green', 'Can Edit', active.filter((m) => canEdit.has(m.role)).length, 'Change prices, stock and orders'],
    ['Lock', 't-blue', 'Read-only', rows.filter((m) => !canEdit.has(m.role)).length, 'Finance and analysts'],
    ['Mail', 't-sun', 'Pending Invites', rows.filter((m) => m.status === 'Invited').length, 'Waiting to accept'],
  ]

  const superAdmins = rows.filter((m) => m.role === 'Super Admin' && m.status === 'Active')
  const lastSuper = (m) => m.role === 'Super Admin' && m.status === 'Active' && superAdmins.length === 1
  const save = (m, patch, log) => dispatch({ type: 'setAdmin', key: 'team', value: { [m.id]: { ...saved[m.id], ...patch } }, log })
  const setMemberRole = (m, r) => {
    if (r === m.role) return
    if (lastSuper(m)) return toast('Keep at least one Super Admin. Make someone else Super Admin first.', { icon: 'TriangleAlert', ms: 3500 })
    save(m, { role: r }, `Changed ${m.name}'s role: ${m.role} → ${r}`); toast(`${m.name} is now ${r}`, { icon: 'CircleCheck' })
  }
  const setStatus = (m, s) => {
    if (s === 'Suspended' && lastSuper(m)) return toast('You can’t suspend the only Super Admin.', { icon: 'TriangleAlert', ms: 3500 })
    save(m, { status: s }, `${s === 'Suspended' ? 'Suspended' : 'Reactivated'} ${m.name}`); toast(`${m.name} ${s === 'Suspended' ? 'suspended' : 'reactivated'}`, { icon: 'CircleCheck' })
  }
  const remove = (m) => { save(m, { removed: true }, `Removed ${m.name} (${m.status === 'Invited' ? 'invite cancelled' : m.role})`); toast(`${m.name} removed`, { icon: 'CircleCheck' }) }
  const selected = filtered.filter((m) => sel.has(m.id))
  const exportCsv = () => {
    const list = selected.length ? selected : filtered
    const head = ['Name', 'Email', 'Role', 'Access', 'Pages', 'City', 'Status', 'Last active']
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`
    const csv = [head, ...list.map((m) => [m.name, m.email, m.role, canEdit.has(m.role) ? 'Can edit' : 'Read-only', roles[m.role].length, m.city, m.status, m.status === 'Invited' ? '' : new Date(m.last).toISOString()])].map((r) => r.map(esc).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `oja-team-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    toast(`Exported ${list.length} member${list.length === 1 ? '' : 's'} to CSV`, { icon: 'CircleCheck' })
  }
  const allOn = filtered.length > 0 && filtered.every((m) => sel.has(m.id))
  const toggleAll = () => setSel(allOn ? new Set() : new Set(filtered.map((m) => m.id)))
  const toggle = (id) => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n) }
  const bulkRole = (r) => { const list = selected.filter((m) => !lastSuper(m)); list.forEach((m) => m.role !== r && save(m, { role: r }, `Changed ${m.name}'s role: ${m.role} → ${r}`)); toast(`${list.length} member${list.length === 1 ? '' : 's'} set to ${r}`, { icon: 'CircleCheck' }); setSel(new Set()) }
  const sortBy = (k) => setSort(([sk, dir]) => [k, sk === k ? (dir === 'asc' ? 'desc' : 'asc') : k === 'last' ? 'desc' : 'asc'])
  const Th = ({ k, label }) => (
    <th aria-sort={sort[0] === k ? (sort[1] === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button type="button" className={`th-sort ${sort[0] === k ? 'on' : ''}`} onClick={() => sortBy(k)}>{label}<Icon name={sort[0] === k ? (sort[1] === 'asc' ? 'ChevronUp' : 'ChevronDown') : 'ChevronsUpDown'} size={13} /></button>
    </th>
  )
  const rowMenu = (m) => [
    m.status === 'Invited' && { label: 'Resend invite', icon: 'Mail', disabled: !edit, onClick: () => toast(`Invite for ${m.email} marked as resent. Emails go out once staff accounts are connected.`, { icon: 'Mail', ms: 4000 }) },
    m.status === 'Active' && { label: 'Suspend access', icon: 'Lock', disabled: !edit, onClick: () => setStatus(m, 'Suspended') },
    m.status === 'Suspended' && { label: 'Reactivate', icon: 'RotateCcw', disabled: !edit, onClick: () => setStatus(m, 'Active') },
    { label: 'Copy email', icon: 'Copy', onClick: () => { navigator.clipboard?.writeText(m.email); toast(`Copied ${m.email}`, { icon: 'CircleCheck' }) } },
    '-',
    { label: m.status === 'Invited' ? 'Cancel invite' : 'Remove from team', icon: 'X', danger: true, disabled: !edit || lastSuper(m), onClick: () => remove(m) },
  ].filter(Boolean)

  return (
    <div className="ord prd">
      <div className="ord-head">
        <div>
          <h2>Team & permissions</h2>
          <p className="muted">Who works on Oja, what each role can open, and who can change data</p>
        </div>
        <div className="ord-actions">
          <button type="button" className="btn-mini lg" onClick={exportCsv}><Icon name="Download" size={15} /> Export{selected.length ? ` (${selected.length})` : ''}</button>
          <button type="button" className="btn-orange" disabled={!edit} onClick={() => setInviting(true)}><Icon name="Plus" size={16} /> Invite Member</button>
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
        {TABS.map(([k, l]) => { const n = rows.filter((m) => inTab(m, k)).length; return (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}{k !== 'all' && n > 0 && <i>{n}</i>}</button>
        ) })}
      </div>

      <div className="prd-sub">
        <label className="ord-search"><Icon name="Search" size={16} /><input id="tm-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, role or city…" /></label>
        <div className="prd-bar-r">
          {selected.length > 0 && (
            <div className="prd-selbar">
              <b>{selected.length} selected</b>
              <Menu label={<>Set role <Icon name="ChevronDown" size={14} /></>} className="btn-mini" items={Object.keys(roles).map((r) => ({ label: r, disabled: !edit, onClick: () => bulkRole(r) }))} />
              <button type="button" className="btn-mini" onClick={() => setSel(new Set())}><Icon name="X" size={14} /> Clear</button>
            </div>
          )}
          <div className="om-wrap" ref={fRef}>
            <button type="button" className={`btn-mini lg ${role ? 'active' : ''}`} onClick={() => setFilterOpen((o) => !o)} aria-expanded={filterOpen}><Icon name="Funnel" size={15} /> Filter{role ? ' (1)' : ''}</button>
            {filterOpen && (
              <div className="om-menu right ord-filter">
                <label><span>Role</span><select value={role} onChange={(e) => setRole(e.target.value)}><option value="">All roles</option>{Object.keys(roles).map((r) => <option key={r}>{r}</option>)}</select></label>
                <button type="button" className="btn-mini" onClick={() => setRole('')}>Reset filters</button>
              </div>
            )}
          </div>
          <Menu label={<><Icon name="ArrowUpDown" size={15} /> Sort</>} className="btn-mini lg" items={SORTS.map(([k, l]) => ({ label: `${l}${sort[0] === k ? (sort[1] === 'asc' ? ' ↑' : ' ↓') : ''}`, icon: sort[0] === k ? 'Check' : undefined, onClick: () => sortBy(k) }))} />
          <label className="prd-switch">Show Statistics
            <button type="button" className={`toggle ${showStats ? 'on' : ''}`} onClick={() => dispatch({ type: 'setAdmin', key: 'teamView', value: { stats: !showStats } })} aria-pressed={showStats} aria-label="Show statistics"><motion.span layout transition={spring} /></button>
          </label>
        </div>
      </div>

      <div className="table-wrap ord-table prd-table tm-table">
        <table className="tbl">
          <thead><tr>
            <th className="ord-cb"><input type="checkbox" checked={allOn} onChange={toggleAll} aria-label="Select all members" /></th>
            <Th k="name" label="Member" />
            <Th k="role" label="Role" />
            <th>Access</th>
            <th>Location</th>
            <Th k="last" label="Last active" />
            <th>Status</th>
            <th>Action</th>
          </tr></thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className={sel.has(m.id) ? 'sel' : ''}>
                <td className="ord-cb"><input type="checkbox" checked={sel.has(m.id)} onChange={() => toggle(m.id)} aria-label={`Select ${m.name}`} /></td>
                <td><div className="ord-cust"><span className={`cust-av ${m.status !== 'Active' ? 'tm-dim' : ''}`}>{initials(m.name)}</span><div><b>{m.name}</b><div className="muted small">{m.email}</div></div></div></td>
                <td>
                  <select className="inv-loc" value={m.role} disabled={!edit || m.status === 'Suspended'} onChange={(e) => setMemberRole(m, e.target.value)} aria-label={`Role for ${m.name}`}>
                    {Object.keys(roles).map((r) => <option key={r}>{r}</option>)}
                  </select>
                </td>
                <td className="nowrap small">{canEdit.has(m.role) ? <span className="row-ico good"><Icon name="BadgeCheck" size={14} /> Can edit</span> : <span className="row-ico muted"><Icon name="Lock" size={14} /> Read-only</span>}<div className="muted">{roles[m.role].length} of {pages.length + 2} pages</div></td>
                <td className="small nowrap">{m.city}</td>
                <td className={`small nowrap ${m.status === 'Active' && Date.now() - m.last < 5 * 6e4 ? 'good' : ''}`}>{m.status === 'Invited' ? <span className="muted">Not joined yet</span> : ago(m.last)}</td>
                <td className="nowrap"><em className={`chip ${STATUS_TONE[m.status]}`}>{m.status}</em></td>
                <td><Menu icon="Ellipsis" items={rowMenu(m)} className="icon-btn" label="" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <div className="ord-empty"><Icon name="SearchX" size={22} /><b>No team members here</b><span className="muted small">Try another tab, filter or search.</span></div>}
      </div>
      <div className="ord-pager"><span className="small muted">{filtered.length ? `Showing ${filtered.length} of ${rows.length} members` : '0 members'}</span></div>

      <div className="adm-card">
        <div className="card-head"><div><h4>Role permissions</h4><p className="muted small">Which pages each role can open. Read-only roles can view pages but not change data.</p></div></div>
        <div className="table-wrap flat">
          <table className="tbl perm">
            <thead><tr><th>Role</th><th>Access</th>{pages.map(([k, , label]) => <th key={k}>{label}</th>)}</tr></thead>
            <tbody>
              {Object.entries(roles).map(([r, allowed]) => (
                <tr key={r}><td className="nowrap"><b>{r}</b><div className="muted small">{rows.filter((m) => m.role === r).length} member{rows.filter((m) => m.role === r).length === 1 ? '' : 's'}</div></td>
                  <td className="nowrap"><em className={`chip ${canEdit.has(r) ? 'good' : 'info'}`}>{canEdit.has(r) ? 'Can edit' : 'Read-only'}</em></td>
                  {pages.map(([k]) => <td key={k}>{allowed.includes(k) ? <Icon name="Check" size={16} className="good" /> : <span className="muted">—</span>}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {inviting && <InviteModal roles={roles} canEdit={canEdit} taken={rows} onClose={() => setInviting(false)} onInvited={() => { setInviting(false); setTab('all'); setQ(''); setRole('') }} />}
    </div>
  )
}

/* ---------- Invite member ---------- */
function InviteModal({ roles, canEdit, taken, onClose, onInvited }) {
  const { dispatch, toast } = useStore()
  const [f, setF] = useState({ name: '', email: '', role: 'Support Agent', city: 'Lagos' })
  const [tried, setTried] = useState(false)
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const email = f.email.trim().toLowerCase()
  const errors = {
    name: f.name.trim().split(/\s+/).length < 2 ? 'Enter a first and last name.' : '',
    email: !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email) ? 'Enter a work email address.' : taken.some((m) => m.email === email) ? 'This person is already on the team.' : '',
  }
  const bad = Object.values(errors).some(Boolean)
  const show = (k) => tried && errors[k] && <div className="err small">{errors[k]}</div>
  const invite = (e) => {
    e.preventDefault(); setTried(true)
    if (bad) { document.getElementById(`iv-${Object.keys(errors).find((k) => errors[k])}`)?.focus(); return }
    const id = `T${Date.now().toString(36).slice(-6).toUpperCase()}`
    const name = f.name.trim().replace(/\s+/g, ' ')
    const m = { id, name, email, role: f.role, city: f.city, last: 0, joined: Date.now(), status: 'Invited', custom: true }
    dispatch({ type: 'setAdmin', key: 'team', value: { [id]: m }, log: `Invited ${name} (${email}) as ${f.role}` })
    toast(`${name} added as invited. Invite emails go out once staff accounts are connected.`, { icon: 'Mail', ms: 4000 })
    onInvited()
  }
  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <form className="co-modal ac-modal" role="dialog" aria-modal="true" aria-labelledby="iv-title" onSubmit={invite} noValidate>
        <div className="co-head">
          <div><h3 id="iv-title">Invite team member</h3><p className="muted small">Give a colleague access to the operations dashboard.</p></div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="X" size={20} /></button>
        </div>
        <div className="co-body">
          <section className="co-sec">
            <div className="pe-2">
              <label className="set-field"><span>Full name</span><input id="iv-name" value={f.name} onChange={set('name')} placeholder="Chidi Okeke" autoComplete="off" autoFocus /></label>
              <label className="set-field"><span>Work email</span><input id="iv-email" type="email" value={f.email} onChange={set('email')} placeholder="chidi@oja.africa" autoComplete="off" /></label>
            </div>
            {show('name')}{show('email')}
            <div className="pe-2">
              <label className="set-field"><span>Role</span><select id="iv-role" value={f.role} onChange={set('role')}>{Object.keys(roles).map((r) => <option key={r}>{r}</option>)}</select></label>
              <label className="set-field"><span>Location</span><select id="iv-city" value={f.city} onChange={set('city')}>{CITIES.map((c) => <option key={c}>{c}</option>)}</select></label>
            </div>
            <div className="rs-now iv-access">
              <Icon name={canEdit.has(f.role) ? 'BadgeCheck' : 'Lock'} size={18} />
              <div className="small"><b>{f.role}: {canEdit.has(f.role) ? 'can edit' : 'read-only'}</b><div className="muted">Opens {roles[f.role].length} page{roles[f.role].length === 1 ? '' : 's'}: {roles[f.role].map((k) => k[0].toUpperCase() + k.slice(1)).join(', ')}</div></div>
            </div>
          </section>
        </div>
        <div className="co-foot">
          {tried && bad && <div className="err small">Fix the highlighted fields to send the invite.</div>}
          <div className="co-actions"><button type="button" className="btn-mini lg" onClick={onClose}>Cancel</button><button className="btn-orange"><Icon name="Plus" size={16} /> Invite member</button></div>
        </div>
      </form>
    </>
  , document.body)
}
