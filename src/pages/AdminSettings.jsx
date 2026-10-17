// Operations dashboard: Settings (store profile, commerce rules, alerts, data).
// Same header, tabs and cards as the other pages. Saved in state.admin.settings.
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../store/Store'
import { Icon } from '../components/Icon'
import { spring } from '../components/ui'
import { FREE_SHIP_THRESHOLD, naira } from '../lib/commerce'

export const DEFAULT_SETTINGS = { storeName: 'Oja', supportHours: '8am – 9pm daily', supportEmail: 'support@oja.africa', supportPhone: '0700 652 0000', minMargin: 15, lowStock: 100, alertCustoms: true, alertLowStock: true, alertCases: true, dailySummary: false }
const TABS = [['general', 'Store profile', 'Store'], ['commerce', 'Commerce rules', 'Percent'], ['alerts', 'Alerts', 'Bell'], ['data', 'Data', 'History']]

export default function Settings({ edit }) {
  const { state, dispatch, toast } = useStore()
  const saved = { ...DEFAULT_SETTINGS, ...(state.admin.settings || {}) }
  const [f, setF] = useState(saved)
  const [tab, setTab] = useState('general')
  const [confirmReset, setConfirmReset] = useState(false)
  const changed = Object.keys(DEFAULT_SETTINGS).filter((k) => f[k] !== saved[k])
  const dirty = changed.length > 0
  const errors = {
    storeName: !String(f.storeName).trim() ? 'Enter a store name.' : '',
    supportEmail: !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(f.supportEmail).trim()) ? 'Enter a valid email address.' : '',
    supportPhone: !/^\+?[\d\s-]{10,16}$/.test(String(f.supportPhone).trim()) ? 'Enter a phone number, e.g. 0700 652 0000.' : '',
    supportHours: !String(f.supportHours).trim() ? 'Enter your support hours.' : '',
    minMargin: !(Number.isFinite(f.minMargin) && f.minMargin >= 0 && f.minMargin <= 80) ? 'Use a number from 0 to 80.' : '',
    lowStock: !(Number.isInteger(f.lowStock) && f.lowStock >= 1 && f.lowStock <= 10000) ? 'Use a whole number from 1 to 10,000.' : '',
  }
  const bad = Object.values(errors).some(Boolean)
  const tabErrors = { general: ['storeName', 'supportEmail', 'supportPhone', 'supportHours'], commerce: ['minMargin', 'lowStock'] }
  const save = (e) => {
    e?.preventDefault()
    if (bad) { const first = Object.keys(errors).find((k) => errors[k]); setTab(Object.entries(tabErrors).find(([, ks]) => ks.includes(first))[0]); setTimeout(() => document.getElementById(`set-${first}`)?.focus(), 50); return }
    const clean = { ...f, storeName: f.storeName.trim(), supportEmail: f.supportEmail.trim(), supportPhone: f.supportPhone.trim(), supportHours: f.supportHours.trim() }
    dispatch({ type: 'setAdmin', key: 'settings', value: clean, log: `Settings updated: ${changed.map((k) => LABELS[k]).join(', ')}` })
    setF(clean)
    toast('Settings saved', { icon: 'CircleCheck' })
  }
  const num = (k) => (e) => setF({ ...f, [k]: e.target.value === '' ? NaN : Number(e.target.value) })
  const field = (k, label, props = {}, hint) => (
    <label className="set-field">
      <span>{label}{f[k] !== saved[k] && <em className="set-dot" title="Unsaved change" />}</span>
      <input id={`set-${k}`} value={Number.isNaN(f[k]) ? '' : f[k]} disabled={!edit} aria-invalid={!!errors[k]} onChange={props.type === 'number' ? num(k) : (e) => setF({ ...f, [k]: e.target.value })} {...props} />
      {errors[k] ? <small className="err">{errors[k]}</small> : hint && <small className="muted">{hint}</small>}
    </label>
  )
  const toggle = (k, label, hint, icon) => (
    <div className="set-row">
      <span className="set-row-ico"><Icon name={icon} size={17} /></span>
      <div><b>{label}{f[k] !== saved[k] && <em className="set-dot" title="Unsaved change" />}</b><div className="muted small">{hint}</div></div>
      <button type="button" className={`toggle ${f[k] ? 'on' : ''}`} disabled={!edit} aria-pressed={f[k]} aria-label={label} onClick={() => setF({ ...f, [k]: !f[k] })}><motion.span layout transition={spring} /></button>
    </div>
  )
  const adminKeys = Object.keys(state.admin).filter((k) => k !== 'settings' && !k.endsWith('View'))
  const resetData = () => {
    dispatch({ type: 'resetAdmin', keep: ['settings'] })
    setConfirmReset(false)
    toast('Dashboard changes cleared. Sample data is back to its original state.', { icon: 'CircleCheck', ms: 3500 })
  }

  return (
    <form className="ord prd" onSubmit={save} noValidate>
      <div className="ord-head">
        <div>
          <h2>Settings</h2>
          <p className="muted">Store details, the rules the dashboard enforces, and which alerts you see</p>
        </div>
        <div className="ord-actions">
          {dirty && <span className="set-unsaved small"><em className="set-dot" /> {changed.length} unsaved change{changed.length === 1 ? '' : 's'}</span>}
          <button type="button" className="btn-mini lg" disabled={!dirty} onClick={() => setF(saved)}><Icon name="RotateCcw" size={15} /> Discard</button>
          <button className="btn-orange" disabled={!edit || !dirty}><Icon name="Check" size={16} /> Save Changes</button>
        </div>
      </div>
      {!edit && <div className="set-ro"><Icon name="Lock" size={15} /> Your role can view settings but not change them.</div>}

      <div className="ord-tabs" role="tablist">
        {TABS.map(([k, l, ico]) => { const n = (tabErrors[k] || []).filter((x) => errors[x]).length; return (
          <button type="button" key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}><Icon name={ico} size={15} /> {l}{n > 0 && <i className="set-err-count">{n}</i>}</button>
        ) })}
      </div>

      {tab === 'general' && (
        <div className="set-cards">
          <div className="adm-card">
            <div className="card-head"><div><h4>Store profile</h4><p className="muted small">Shown to shoppers in the help centre and order emails</p></div></div>
            <div className="pe-2">
              {field('storeName', 'Store name')}
              <label className="set-field"><span>Currency</span><input value="Nigerian naira (₦)" disabled /><small className="muted">Prices across the store are in naira.</small></label>
            </div>
          </div>
          <div className="adm-card">
            <div className="card-head"><div><h4>Customer support</h4><p className="muted small">How shoppers reach you</p></div></div>
            <div className="pe-2">
              {field('supportEmail', 'Support email', { type: 'email' })}
              {field('supportPhone', 'Support phone', { inputMode: 'tel' })}
            </div>
            {field('supportHours', 'Support hours', {}, 'e.g. 8am – 9pm daily')}
          </div>
        </div>
      )}

      {tab === 'commerce' && (
        <div className="set-cards">
          <div className="adm-card">
            <div className="card-head"><div><h4>Pricing guardrails</h4><p className="muted small">Checks the dashboard runs before you save</p></div></div>
            <div className="pe-2">
              {field('minMargin', 'Minimum margin (%)', { type: 'number', min: 0, max: 80, step: 0.5 }, 'Product prices can’t be saved below this margin.')}
              {field('lowStock', 'Low stock below (units)', { type: 'number', min: 1, step: 1 }, 'Used by Inventory, Products and the bell alerts.')}
            </div>
          </div>
          <div className="adm-card">
            <div className="card-head"><div><h4>Delivery</h4><p className="muted small">Set in the storefront for now</p></div></div>
            <div className="pe-2">
              <label className="set-field"><span>Free delivery from</span><input value={naira(FREE_SHIP_THRESHOLD)} disabled /></label>
              <label className="set-field"><span>Lagos pickup point</span><input value="Ikeja warehouse" disabled /></label>
            </div>
            <p className="muted small set-hint">Changing delivery prices needs a code change. Ask your developer.</p>
          </div>
        </div>
      )}

      {tab === 'alerts' && (
        <div className="adm-card">
          <div className="card-head"><div><h4>Alerts</h4><p className="muted small">What the bell and the sidebar alert card show</p></div></div>
          <div className="set-rows">
            {toggle('alertCustoms', 'Shipment delays', 'Customs holds and late containers', 'Ship')}
            {toggle('alertLowStock', 'Low stock', `Products under ${Number.isFinite(f.lowStock) ? f.lowStock : saved.lowStock} units in Lagos`, 'Warehouse')}
            {toggle('alertCases', 'High-priority cases', 'Damaged, wrong, missing or payment issues', 'LifeBuoy')}
            {toggle('dailySummary', 'Daily summary email', 'A morning recap of yesterday’s numbers. Sending starts once email is connected.', 'Mail')}
          </div>
        </div>
      )}

      {tab === 'data' && (
        <div className="adm-card set-danger">
          <div className="card-head"><div><h4>Reset dashboard changes</h4><p className="muted small">Clears coupons, purchase orders, shipments, customers, team invites and status changes made in this browser. Settings and the audit log are kept. Orders, prices and stock levels are not affected.</p></div></div>
          {!confirmReset ? (
            <button type="button" className="btn-mini lg danger-btn" disabled={!edit || !adminKeys.length} onClick={() => setConfirmReset(true)}><Icon name="RotateCcw" size={15} /> {adminKeys.length ? 'Reset dashboard changes…' : 'Nothing to reset'}</button>
          ) : (
            <div className="set-confirm">
              <span className="small"><b>Clear all dashboard changes?</b> This can’t be undone.</span>
              <button type="button" className="btn-mini lg" onClick={() => setConfirmReset(false)}>Cancel</button>
              <button type="button" className="btn-mini lg danger-btn solid" onClick={resetData}>Yes, reset</button>
            </div>
          )}
        </div>
      )}
    </form>
  )
}

const LABELS = { storeName: 'store name', supportEmail: 'support email', supportPhone: 'support phone', supportHours: 'support hours', minMargin: 'minimum margin', lowStock: 'low-stock threshold', alertCustoms: 'shipment alerts', alertLowStock: 'low-stock alerts', alertCases: 'case alerts', dailySummary: 'daily summary' }
