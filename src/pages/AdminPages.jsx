// Operations dashboard: Promotions page (coupons, campaigns, create-promotion pop-up).
// Demo data is deterministic so screens stay stable.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../store/Store'
import { Icon } from '../components/Icon'
import { COUPONS } from '../data/catalog'
import { naira } from '../lib/commerce'

const DAY = 864e5
const ago = (t) => { const d = Math.max(0, Math.round((Date.now() - t) / DAY)); return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d} days ago` }

export function Stat({ icon, tone, label, value, note }) {
  return (
    <div className="kpi">
      <div className="kpi-head"><span className={`kpi-ico ${tone}`}><Icon name={icon} size={14} /></span>{label}</div>
      <div className="kpi-v">{value}</div>
      {note && <div className="kpi-foot"><span className="muted">{note}</span></div>}
    </div>
  )
}

/* ---------- Promotions ---------- */
const CAMPAIGNS = [
  { id: 'c1010', name: '10.10 Super Shopping Day', when: '1 – 12 Oct 2026', start: Date.UTC(2026, 9, 1), end: Date.UTC(2026, 9, 12, 23), where: 'Home banner, push' },
  { id: 'cflash', name: 'Flash deals', when: 'Daily, ends midnight', always: true, where: 'Home, Deals page' },
  { id: 'cweek', name: 'Oja Week', when: 'Rolling, new & discounted items', always: true, where: 'Product badges' },
  { id: 'c1111', name: '11.11 Singles Day', when: '5 – 11 Nov 2026', start: Date.UTC(2026, 10, 5), end: Date.UTC(2026, 10, 11, 23), where: 'Planned' },
]
const USES = { OJA10: 1284, FREESHIP: 642, SAVE2K: 391 }
const couponRule = (c) => (c.type === 'percent' ? `${c.value}% off${c.cap ? `, max ${naira(c.cap)}` : ''}` : c.type === 'flat' ? `${naira(c.value)} off` : 'Free delivery') + (c.min ? ` · min ${naira(c.min)}` : ' · no minimum')
const fmtDay = (t) => new Date(t).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
const whenText = (start, end) => `${fmtDay(start)} – ${fmtDay(end)}`

export function Promotions({ edit }) {
  const { state, dispatch, toast } = useStore()
  const paused = state.admin.paused || {}
  const custom = Object.values(state.admin.coupons || {}).filter(Boolean)
  const customCampaigns = Object.values(state.admin.campaigns || {}).filter(Boolean)
  const coupons = [...custom.sort((a, b) => b.created - a.created), ...Object.values(COUPONS)]
  const campaigns = [...customCampaigns.sort((a, b) => b.created - a.created), ...CAMPAIGNS]
  const [creating, setCreating] = useState(false)
  const toggle = (code) => {
    const now = !paused[code]
    dispatch({ type: 'setAdmin', key: 'paused', value: { [code]: now }, log: `Coupon ${code} ${now ? 'paused' : 'activated'}` })
    toast(`${code} ${now ? 'paused' : 'is live again'}`, { icon: 'Ticket' })
  }
  const remove = (key, id, label) => { dispatch({ type: 'setAdmin', key, value: { [id]: null }, log: `Deleted ${label}` }); toast(`${label} deleted`, { icon: 'CircleCheck' }) }
  const status = (c) => (c.always ? ['Live', 'good'] : Date.now() < c.start ? ['Scheduled', 'warn'] : Date.now() > c.end ? ['Ended', 'info'] : ['Live', 'good'])
  const couponStatus = (c) => paused[c.code] ? ['Paused', 'warn'] : c.start && Date.now() < c.start ? ['Scheduled', 'info'] : c.end && Date.now() > c.end ? ['Ended', 'bad'] : ['Active', 'good']
  return (
    <div className="ord prd">
      <div className="ord-head">
        <div>
          <h2>Promotions</h2>
          <p className="muted">Create coupon codes and campaigns, and pause them when you need to</p>
        </div>
        <div className="ord-actions">
          <button type="button" className="btn-orange" disabled={!edit} onClick={() => setCreating(true)}><Icon name="Plus" size={16} /> Create Promotion</button>
        </div>
      </div>
      <div className="kpis">
        <Stat icon="Ticket" tone="t-orange" label="Active coupons" value={coupons.filter((c) => couponStatus(c)[0] === 'Active').length} note={`of ${coupons.length}`} />
        <Stat icon="Repeat" tone="t-blue" label="Coupon redemptions" value={Object.values(USES).reduce((a, b) => a + b, 0).toLocaleString()} note="Last 30 days" />
        <Stat icon="Zap" tone="t-sun" label="Live campaigns" value={campaigns.filter((c) => status(c)[0] === 'Live').length} />
        <Stat icon="Percent" tone="t-green" label="Promo share of orders" value="38%" note="Orders using any offer" />
      </div>
      <div className="adm-card">
        <div className="card-head"><div><h4>Coupons</h4><p className="muted small">Codes shoppers enter in the cart. Paused codes stop working at checkout on this device.</p></div></div>
        <div className="promo-grid">
          {coupons.map((c) => { const [s, tone] = couponStatus(c); return (
            <div key={c.code} className={`promo-card ${s !== 'Active' ? 'off' : ''}`}>
              <div className="promo-top"><span className="promo-code">{c.code}</span><em className={`chip ${tone}`}>{s}</em></div>
              <p>{c.label}</p>
              <div className="muted small">{couponRule(c)}</div>
              {c.start && <div className="muted small">{whenText(c.start, c.end)}{c.firstOrder ? ' · first order only' : ''}</div>}
              <div className="promo-foot"><span className="small"><b>{(USES[c.code] || 0).toLocaleString()}</b> uses</span>
                <span className="row-gap">
                  {c.custom && <button className="btn-mini" disabled={!edit} onClick={() => remove('coupons', c.code, `coupon ${c.code}`)} aria-label={`Delete ${c.code}`}><Icon name="X" size={13} /></button>}
                  <button className="btn-mini" disabled={!edit} onClick={() => toggle(c.code)}>{paused[c.code] ? 'Activate' : 'Pause'}</button>
                </span></div>
            </div>
          ) })}
        </div>
      </div>
      <div className="adm-card">
        <div className="card-head"><div><h4>Campaigns</h4><p className="muted small">Banners and badges running across the store</p></div></div>
        {campaigns.map((c) => { const [s, tone] = status(c); return (
          <div key={c.id} className="adm-row"><span><b>{c.name}</b><span className="muted small"> · {c.when}</span></span><span className="row-ico"><span className="muted small">{c.where}</span><em className={`chip ${tone}`}>{s}</em>{c.custom && <button className="btn-mini" disabled={!edit} onClick={() => remove('campaigns', c.id, `campaign ${c.name}`)} aria-label={`Delete ${c.name}`}><Icon name="X" size={13} /></button>}</span></div>
        ) })}
      </div>
      {creating && <CreatePromotionModal taken={coupons.map((c) => c.code)} onClose={() => setCreating(false)} />}
    </div>
  )
}

/* ---------- Create promotion (coupon code or campaign) ---------- */
const PLACEMENTS = ['Home banner', 'Push notification', 'Product badges', 'Deals page', 'Email']
function CreatePromotionModal({ taken, onClose }) {
  const { dispatch, toast } = useStore()
  const today = new Date().toISOString().slice(0, 10)
  const inWeeks = (w) => new Date(Date.now() + w * 7 * DAY).toISOString().slice(0, 10)
  const [kind, setKind] = useState('coupon')
  const [f, setF] = useState({ code: '', label: '', type: 'percent', value: '10', cap: '5000', min: '10000', start: today, end: inWeeks(2), firstOrder: false, name: '', where: ['Home banner'] })
  const [tried, setTried] = useState(false)
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  const set = (k) => (e) => setF({ ...f, [k]: k === 'code' ? e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16) : e.target.value })
  const num = (v) => (v === '' ? NaN : Number(v))
  const startT = f.start ? new Date(f.start + 'T00:00:00').getTime() : NaN
  const endT = f.end ? new Date(f.end + 'T23:59:59').getTime() : NaN
  const errors = kind === 'coupon' ? {
    code: f.code.length < 4 ? 'Use 4–16 letters or numbers.' : taken.includes(f.code) ? 'That code already exists.' : '',
    value: f.type === 'ship' ? '' : f.type === 'percent' ? (!(num(f.value) >= 1 && num(f.value) <= 90) ? 'Enter a percentage from 1 to 90.' : '') : (!(num(f.value) >= 100) ? 'Enter an amount of at least ₦100.' : ''),
    cap: f.type === 'percent' && f.cap !== '' && !(num(f.cap) >= 100) ? 'Leave empty for no cap, or enter at least ₦100.' : '',
    min: f.min !== '' && !(num(f.min) >= 0) ? 'Enter 0 or more.' : f.type === 'flat' && f.min !== '' && num(f.min) <= num(f.value) ? 'Minimum order should be more than the discount.' : '',
    dates: !(endT >= startT) ? 'The end date must be on or after the start date.' : !(endT > Date.now()) ? 'The end date has already passed.' : '',
  } : {
    name: f.name.trim().length < 3 ? 'Give the campaign a name.' : '',
    where: !f.where.length ? 'Pick at least one placement.' : '',
    dates: !(endT >= startT) ? 'The end date must be on or after the start date.' : !(endT > Date.now()) ? 'The end date has already passed.' : '',
  }
  const bad = Object.values(errors).some(Boolean)
  const show = (k) => tried && errors[k] && <div className="err small">{errors[k]}</div>
  const autoLabel = () => {
    const v = num(f.value), min = num(f.min) || 0
    const tail = min ? ` on orders above ${naira(min)}` : ''
    return f.type === 'percent' ? `${v}% off${tail}${num(f.cap) ? ` (max ${naira(num(f.cap))})` : ''}` : f.type === 'flat' ? `${naira(v)} off${tail}` : `Free delivery${tail}`
  }
  const create = (e) => {
    e.preventDefault(); setTried(true)
    if (bad) { document.getElementById(`cp-${Object.keys(errors).find((k) => errors[k])}`)?.focus(); return }
    if (kind === 'coupon') {
      const c = { code: f.code, label: f.label.trim() || autoLabel(), type: f.type, ...(f.type !== 'ship' ? { value: num(f.value) } : {}), ...(f.type === 'percent' && num(f.cap) ? { cap: num(f.cap) } : {}), min: num(f.min) || 0, start: startT, end: endT, firstOrder: f.firstOrder, custom: true, created: Date.now() }
      dispatch({ type: 'setAdmin', key: 'coupons', value: { [c.code]: c }, log: `Created coupon ${c.code}: ${c.label}` })
      toast(`Coupon ${c.code} created`, { icon: 'Ticket' })
    } else {
      const id = `cmp-${Date.now().toString(36)}`
      const c = { id, name: f.name.trim(), when: whenText(startT, endT), start: startT, end: endT, where: f.where.join(', '), custom: true, created: Date.now() }
      dispatch({ type: 'setAdmin', key: 'campaigns', value: { [id]: c }, log: `Created campaign ${c.name}` })
      toast(`Campaign “${c.name}” created`, { icon: 'CircleCheck' })
    }
    onClose()
  }
  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <form className="co-modal ac-modal" role="dialog" aria-modal="true" aria-labelledby="cp-title" onSubmit={create} noValidate>
        <div className="co-head">
          <div><h3 id="cp-title">Create promotion</h3><p className="muted small">A code shoppers type in the cart, or a campaign shown around the store.</p></div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="X" size={20} /></button>
        </div>
        <div className="co-body">
          <section className="co-sec">
            <div className="seg cp-kind" role="group" aria-label="Promotion type">
              <button type="button" className={kind === 'coupon' ? 'on' : ''} onClick={() => { setKind('coupon'); setTried(false) }}><Icon name="Ticket" size={14} /> Coupon code</button>
              <button type="button" className={kind === 'campaign' ? 'on' : ''} onClick={() => { setKind('campaign'); setTried(false) }}><Icon name="Zap" size={14} /> Campaign</button>
            </div>
            {kind === 'coupon' ? (<>
              <div className="pe-2">
                <label className="set-field"><span>Code</span><input id="cp-code" value={f.code} onChange={set('code')} placeholder="e.g. AFRICA15" autoComplete="off" autoFocus /></label>
                <label className="set-field"><span>Discount</span><select id="cp-type" value={f.type} onChange={set('type')}><option value="percent">Percentage off</option><option value="flat">Fixed amount off</option><option value="ship">Free delivery</option></select></label>
              </div>
              {show('code')}
              {f.type !== 'ship' && <div className="pe-2">
                <label className="set-field"><span>{f.type === 'percent' ? 'Percentage (%)' : 'Amount (₦)'}</span><input id="cp-value" type="number" min="1" inputMode="numeric" value={f.value} onChange={set('value')} /></label>
                {f.type === 'percent' ? <label className="set-field"><span>Max discount (₦) <em className="muted">optional</em></span><input id="cp-cap" type="number" min="0" inputMode="numeric" value={f.cap} onChange={set('cap')} placeholder="No cap" /></label> : <span />}
              </div>}
              {show('value')}{show('cap')}
              <div className="pe-2">
                <label className="set-field"><span>Minimum order (₦)</span><input id="cp-min" type="number" min="0" inputMode="numeric" value={f.min} onChange={set('min')} placeholder="0" /></label>
                <label className="set-field cp-check"><span>Who can use it</span><select value={f.firstOrder ? 'first' : 'all'} onChange={(e) => setF({ ...f, firstOrder: e.target.value === 'first' })}><option value="all">Every shopper</option><option value="first">First order only</option></select></label>
              </div>
              {show('min')}
              <label className="set-field"><span>Shopper-facing text <em className="muted">optional</em></span><input id="cp-label" value={f.label} onChange={set('label')} placeholder={autoLabel()} maxLength={70} /></label>
            </>) : (<>
              <label className="set-field"><span>Campaign name</span><input id="cp-name" value={f.name} onChange={set('name')} placeholder="e.g. Black Friday Mega Sale" maxLength={50} autoFocus /></label>
              {show('name')}
              <div className="set-field" id="cp-where" tabIndex={-1}><span>Show it on</span>
                <div className="cp-places">{PLACEMENTS.map((pl) => { const on = f.where.includes(pl); return <button type="button" key={pl} className={`cp-place ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => setF({ ...f, where: on ? f.where.filter((x) => x !== pl) : [...f.where, pl] })}>{on && <Icon name="Check" size={13} />}{pl}</button> })}</div>
              </div>
              {show('where')}
            </>)}
            <div className="pe-2">
              <label className="set-field"><span>Starts</span><input id="cp-dates" type="date" value={f.start} onChange={set('start')} /></label>
              <label className="set-field"><span>Ends</span><input type="date" value={f.end} onChange={set('end')} /></label>
            </div>
            {show('dates')}
          </section>
        </div>
        <div className="co-foot">
          {kind === 'coupon' && <div className="co-sum"><span>Shoppers will see <b>{f.code || 'CODE'}</b>: {f.label.trim() || autoLabel()}</span></div>}
          {tried && bad && <div className="err small">Fix the highlighted fields to create the promotion.</div>}
          <div className="co-actions"><button type="button" className="btn-mini lg" onClick={onClose}>Cancel</button><button className="btn-orange"><Icon name="Plus" size={16} /> Create {kind === 'coupon' ? 'coupon' : 'campaign'}</button></div>
        </div>
      </form>
    </>
  , document.body)
}
