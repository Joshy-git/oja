import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/Store'
import { Page, Grid, Empty, Tabs, spring } from '../components/ui'
import { STATES } from '../lib/commerce'
import { Icon } from '../components/Icon'

// Shown on /account when signed out; the sign-in pop-up opens on arrival.
function SignInPrompt() {
  const { dispatch } = useStore()
  useEffect(() => { dispatch({ type: 'openAuth' }) }, [dispatch])
  return (
    <motion.div className="auth-prompt panel" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <span className="auth-prompt-ico"><Icon name="User" size={28} /></span>
      <h2>Sign in to your Oja account</h2>
      <p className="muted">Track orders, save addresses and get price-drop alerts on your wishlist.</p>
      <button className="btn btn-primary lg" onClick={() => dispatch({ type: 'openAuth' })}>Sign in or register</button>
    </motion.div>
  )
}

function Addresses() {
  const { state, dispatch } = useStore()
  const [f, setF] = useState(null)
  return (
    <div>
      <div className="addr-list">
        <AnimatePresence>
          {state.addresses.map((a) => (
            <motion.div layout key={a.id} className="addr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -40 }}>
              <div><b>{a.name}</b> · {a.phone}<div className="muted small">{a.line}, {a.state}</div></div>
              {a.default && <span className="badge badge-info">Default</span>}
              <button className="link small danger" onClick={() => dispatch({ type: 'removeAddress', id: a.id })}>Remove</button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {f ? (
        <form className="addr-form" onSubmit={(e) => { e.preventDefault(); dispatch({ type: 'addAddress', addr: { id: 'a' + Date.now(), ...f } }); setF(null) }}>
          <input placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
          <input placeholder="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} required />
          <input placeholder="Street address" value={f.line} onChange={(e) => setF({ ...f, line: e.target.value })} required />
          <select value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })}>{STATES.map((s) => <option key={s}>{s}</option>)}</select>
          <label className="f-opt"><input type="checkbox" checked={f.default} onChange={(e) => setF({ ...f, default: e.target.checked })} /><span>Make default</span></label>
          <div className="row-gap"><button className="btn btn-primary sm">Save</button><button type="button" className="link" onClick={() => setF(null)}>Cancel</button></div>
        </form>
      ) : <button className="btn btn-ghost sm" onClick={() => setF({ name: '', phone: '', line: '', state: 'Lagos', default: false })}>+ Add address</button>}
    </div>
  )
}

export default function Account() {
  const { state, dispatch, getProduct } = useStore()
  const [params] = useSearchParams()
  const [tab, setTab] = useState(params.get('tab') || 'wishlist')
  const wish = state.wishlist.map(getProduct).filter(Boolean)
  return (
    <Page>
      <div className="wrap">
        {!state.user ? <SignInPrompt /> : (
          <>
            <div className="acct-head">
              <motion.span className="avatar lg" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring}>{state.user.name[0]}</motion.span>
              <div><h1 className="page-title">Hi, {state.user.name.split(' ')[0]}</h1><div className="muted small">{state.user.phone} · verified</div></div>
              <button className="link" onClick={() => dispatch({ type: 'logout' })}>Sign out</button>
            </div>
            <div className="acct-stats">
              <Link to="/orders" className="stat"><b>{state.orders.length}</b><span>Orders</span></Link>
              <button className="stat" onClick={() => setTab('wishlist')}><b>{state.wishlist.length}</b><span>Wishlist</span></button>
              <Link to="/help" className="stat"><b>{state.cases.length}</b><span>Support cases</span></Link>
              <button className="stat" onClick={() => setTab('addresses')}><b>{state.addresses.length}</b><span>Addresses</span></button>
            </div>
          </>
        )}
        <div className="acct-body">
          <Tabs id="acct" value={tab} onChange={setTab} tabs={[{ value: 'wishlist', label: <span className="row-ico"><Icon name="Heart" size={14} /> Wishlist ({wish.length})</span> }, { value: 'addresses', label: 'Addresses' }, { value: 'settings', label: 'Notifications' }]} />
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="tab-panel">
              {tab === 'wishlist' && (wish.length ? <><p className="muted small">We'll notify you when these drop in price or come back in stock.</p><Grid products={wish} /></> : <Empty icon="Heart" title="No saved items yet" body="Tap the heart on any product to track its price." />)}
              {tab === 'addresses' && <Addresses />}
              {tab === 'settings' && (
                <div className="settings">
                  {[['Order & delivery updates', 'SMS + push', true], ['Price-drop alerts on wishlist', 'Push + email', true], ['Back-in-stock alerts', 'Push', true], ['Deals & campaigns', 'Email', false]].map(([t, c, on]) => (
                    <label key={t} className="setting"><div><b>{t}</b><div className="muted small">{c}</div></div><input type="checkbox" defaultChecked={on} className="switch" /></label>
                  ))}
                  <button className="btn btn-ghost sm" onClick={() => { if (confirm('Reset all prototype data (cart, orders, admin edits)?')) dispatch({ type: 'reset' }) }}>Reset prototype data</button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Page>
  )
}
