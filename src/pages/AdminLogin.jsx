// Sign-in screen in front of the operations dashboard
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Logo } from '../components/Layout'
import { Icon } from '../components/Icon'
import { adminAuthConfigured, adminSignIn } from '../lib/adminAuth'

export default function AdminLogin({ onSignedIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { document.title = 'Sign in — Oja Ops' }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) return setErr('Enter your email and password.')
    setBusy(true); setErr('')
    try { onSignedIn(await adminSignIn(email, password)) } catch (x) { setErr(x.message); setPassword('') } finally { setBusy(false) }
  }

  return (
    <div className="adm-login">
      <motion.form className="adm-login-card" onSubmit={submit} noValidate initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="adm-login-brand"><Logo /><span className="adm-tag">Ops</span></div>
        <h1>Sign in to the dashboard</h1>
        <p className="muted small">For Cargoland operations staff only.</p>

        {!adminAuthConfigured ? (
          <div className="adm-login-note"><Icon name="TriangleAlert" size={16} /> Dashboard sign-in isn't set up for this site yet. Add VITE_ADMIN_EMAIL and VITE_ADMIN_PASSWORD_HASH to the environment.</div>
        ) : (
          <>
            <label className="set-field">
              <span>Email</span>
              <input type="email" autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@ojaafrica.africa" aria-invalid={!!err} />
            </label>
            <label className="set-field">
              <span>Password</span>
              <span className="adm-login-pw">
                <input type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!err} />
                <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}><Icon name={show ? 'EyeOff' : 'Eye'} size={17} /></button>
              </span>
            </label>
            {err && <div className="err small" role="alert">{err}</div>}
            <button className="btn-orange adm-login-btn" disabled={busy}><Icon name="Lock" size={15} /> {busy ? 'Signing in…' : 'Sign in'}</button>
          </>
        )}
        <Link to="/" className="adm-login-back"><Icon name="ArrowLeft" size={14} /> Back to the store</Link>
      </motion.form>
    </div>
  )
}
