import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/Store'
import { Icon } from './Icon'

// Sign-in / register pop-up. Email and phone use a demo 6-digit code (no backend);
// Google, Facebook and Apple are placeholders until real OAuth apps exist.

const normPhone = (p) => (p || '').replace(/\D/g, '')
const isPhone = (v) => /^0[789][01]\d{8}$/.test(normPhone(v))
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v || '').trim())
const accountId = (u) => u.id || (u.email ? u.email.toLowerCase() : normPhone(u.phone))
const mask = (u) => {
  if (u.email) { const [n, d] = u.email.split('@'); return `${n.slice(0, 3)}***${n.length > 5 ? n.slice(-3) : ''}@${d}` }
  const p = normPhone(u.phone)
  return `${p.slice(0, 4)}***${p.slice(-4)}`
}

const PERKS = [
  ['Stamp', 'Duties included', 'No surprise charges at the door'],
  ['Truck', 'Free delivery', 'On orders over ₦50,000'],
  ['RotateCcw', 'Easy returns', 'Damaged, wrong or missing items'],
  ['ShieldCheck', 'Delivery guarantee', 'Track every step to your door'],
]

const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24z" />
    <path fill="#FBBC05" d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29A12 12 0 0 0 0 12c0 1.94.47 3.76 1.29 5.38l3.98-3.09z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
  </svg>
)
const FacebookLogo = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
    <circle cx="12" cy="12" r="12" fill="#1877F2" />
    <path fill="#fff" d="M16.6 15.47 17.13 12H13.8V9.75c0-.95.47-1.87 1.96-1.87h1.51V4.93s-1.37-.23-2.68-.23c-2.74 0-4.53 1.66-4.53 4.66V12H7.02v3.47h3.04V24h3.74v-8.53z" />
  </svg>
)
const AppleLogo = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden>
    <path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.9-3-.8C7 7.4 5.6 8.3 4.8 9.7c-1.7 2.9-.4 7.2 1.2 9.5.8 1.1 1.7 2.4 2.9 2.4 1.2 0 1.6-.8 3-.8s1.8.8 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.6-1-2.6-3.9zM14.1 5.8c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.7-1.3z" />
  </svg>
)

export function AuthModal() {
  const { state, dispatch, toast } = useStore()
  const open = state.authOpen
  const close = () => dispatch({ type: 'closeAuth' })

  const [view, setView] = useState('home') // home | form | code
  const [method, setMethod] = useState('email') // email | phone
  const [value, setValue] = useState('')
  const [name, setName] = useState('')
  const [otp, setOtp] = useState('')
  const [code, setCode] = useState('')
  const [target, setTarget] = useState(null) // { account?, draft? }
  const [hidePrev, setHidePrev] = useState(false)
  const dialog = useRef(null)

  const prev = state.lastLogin ? state.accounts.find((u) => accountId(u) === state.lastLogin) : null
  const showPrev = prev && !hidePrev

  // Reset each time the pop-up opens; lock page scroll and close on Escape
  useEffect(() => {
    if (!open) return
    setView('home'); setValue(''); setName(''); setOtp(''); setTarget(null); setHidePrev(false)
    const body = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const esc = (e) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', esc)
    setTimeout(() => dialog.current?.focus(), 30)
    return () => { document.body.style.overflow = body; document.removeEventListener('keydown', esc) }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const sendCode = (t) => {
    const c = String(Math.floor(100000 + Math.random() * 900000))
    setCode(c); setOtp(''); setTarget(t); setView('code')
    toast(`Demo verification code: ${c}`, { icon: 'Smartphone', ms: 9000 })
  }

  const valid = method === 'email' ? isEmail(value) : isPhone(value)
  const id = valid ? (method === 'email' ? value.trim().toLowerCase() : normPhone(value)) : null
  const existing = id ? state.accounts.find((u) => accountId(u) === id) : null
  const isNew = valid && !existing

  const submitForm = (e) => {
    e.preventDefault()
    if (!valid || (isNew && !name.trim())) return
    if (existing) sendCode({ account: existing })
    else sendCode({ draft: { id, name: name.trim(), ...(method === 'email' ? { email: value.trim() } : { phone: value.trim() }) } })
  }

  const verify = (e) => {
    e.preventDefault()
    if (otp !== code) return
    if (target.account) {
      const user = { ...target.account, id: accountId(target.account) }
      dispatch({ type: 'login', user })
      toast(`Welcome back, ${user.name.split(' ')[0]}!`, { icon: 'Hand' })
    } else {
      dispatch({ type: 'register', user: target.draft })
      toast(`Account created. Welcome to Oja, ${target.draft.name.split(' ')[0]}!`, { icon: 'PartyPopper' })
    }
  }

  const choose = (m) => { setMethod(m); setValue(''); setName(''); setView('form') }
  const social = (provider) => toast(`Sign in with ${provider} is coming soon. Use email or phone for now.`, { icon: 'Bell', ms: 3500 })
  const sentTo = target?.account ? mask(target.account) : target?.draft ? (target.draft.email || target.draft.phone) : ''

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="auth-scrim" onClick={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div ref={dialog} tabIndex={-1} className={`auth-modal ${showPrev && view === 'home' ? 'two-col' : ''}`} role="dialog" aria-modal="true" aria-labelledby="auth-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ duration: 0.22 }}>
            <button className="auth-close" onClick={close} aria-label="Close"><Icon name="X" size={22} /></button>

            <header className="auth-top">
              <h2 id="auth-title">{view === 'code' ? 'Enter your code' : target?.draft || (view === 'form' && isNew) ? 'Create your account' : 'Sign in'}</h2>
              <p className="auth-safe"><Icon name="Lock" size={15} fill="currentColor" /> All data is safeguarded</p>
            </header>

            <ul className="auth-perks">
              {PERKS.map(([ico, t, s]) => <li key={t}><Icon name={ico} size={22} /><span><b>{t}</b>{s}</span></li>)}
            </ul>

            <AnimatePresence mode="wait" initial={false}>
              {view === 'home' && (
                <motion.div key="home" className="auth-body" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {showPrev && (
                    <>
                      <section className="auth-prev">
                        <h3>Sign in with a previously used account</h3>
                        <span className="auth-avatar" aria-hidden>{prev.name[0]}</span>
                        <b className="auth-prev-name">{prev.name}</b>
                        <span className="muted">{mask(prev)}</span>
                        <button className="auth-opt strong" onClick={() => sendCode({ account: prev })}>
                          <Icon name={prev.email ? 'Mail' : 'Smartphone'} size={20} />Continue as {prev.name.split(' ')[0]}
                        </button>
                        <button className="auth-opt" onClick={() => setHidePrev(true)}>Use another way to sign in</button>
                        <div className="auth-links">
                          <button onClick={() => dispatch({ type: 'forgetLastLogin' })}>Remove account</button>
                          <span aria-hidden>|</span>
                          <Link to="/help" onClick={close}>Trouble signing in?</Link>
                        </div>
                      </section>
                      <div className="auth-or" aria-hidden><span>OR</span></div>
                    </>
                  )}
                  <section className="auth-ways">
                    <h3>Register / Sign in with another account</h3>
                    <button className="auth-opt" onClick={() => choose('email')}><Icon name="Mail" size={22} />Continue with Email</button>
                    <button className="auth-opt" onClick={() => social('Google')}><GoogleLogo />Continue with Google</button>
                    <button className="auth-opt" onClick={() => social('Facebook')}><FacebookLogo />Continue with Facebook</button>
                    <button className="auth-opt" onClick={() => social('Apple')}><AppleLogo />Continue with Apple</button>
                    <button className="auth-opt" onClick={() => choose('phone')}><Icon name="Smartphone" size={22} />Continue with phone number</button>
                  </section>
                </motion.div>
              )}

              {view === 'form' && (
                <motion.form key="form" className="auth-step" onSubmit={submitForm} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                  <button type="button" className="auth-back" onClick={() => setView('home')}><Icon name="ArrowLeft" size={16} /> All sign-in options</button>
                  <label className="auth-field">
                    <span>{method === 'email' ? 'Email address' : 'Phone number'}</span>
                    <input id="auth-id" autoFocus value={value} onChange={(e) => setValue(e.target.value)} type={method === 'email' ? 'email' : 'tel'} inputMode={method === 'email' ? 'email' : 'tel'} autoComplete={method === 'email' ? 'email' : 'tel'} placeholder={method === 'email' ? 'you@example.com' : '0803 123 4567'} />
                  </label>
                  {value && !valid && <div className="err small">{method === 'email' ? 'Enter a valid email address' : 'Enter a valid Nigerian mobile number, like 0803 123 4567'}</div>}
                  {existing && <div className="auth-note good"><Icon name="CircleCheck" size={16} /> Welcome back, {existing.name.split(' ')[0]}. We'll send you a sign-in code.</div>}
                  {isNew && (
                    <>
                      <div className="auth-note">New to Oja? Add your name to create your account.</div>
                      <label className="auth-field"><span>Full name</span><input id="auth-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Ada Okafor" /></label>
                    </>
                  )}
                  <button className="btn btn-primary lg block" disabled={!valid || (isNew && !name.trim())}>{isNew ? 'Create account' : 'Send code'}</button>
                </motion.form>
              )}

              {view === 'code' && (
                <motion.form key="code" className="auth-step" onSubmit={verify} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                  <button type="button" className="auth-back" onClick={() => setView(target?.account && target.account === prev ? 'home' : 'form')}><Icon name="ArrowLeft" size={16} /> Back</button>
                  <p className="muted">We sent a 6-digit code to <b className="ink">{sentTo}</b>.</p>
                  <input id="auth-otp" className="otp auth-otp" autoFocus maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="••••••" inputMode="numeric" autoComplete="one-time-code" aria-label="6-digit code" />
                  {otp.length === 6 && otp !== code && <div className="err small">That code doesn't match. Check the latest code and try again.</div>}
                  <button className="btn btn-primary lg block" disabled={otp.length !== 6}>{target?.draft ? 'Verify & create account' : 'Verify & sign in'}</button>
                  <button type="button" className="link auth-resend" onClick={() => sendCode(target)}>Send a new code</button>
                </motion.form>
              )}
            </AnimatePresence>

            <p className="auth-terms">By signing in or continuing, you agree to our <Link to="/help" onClick={close}>Terms of Use</Link> and <Link to="/help" onClick={close}>Privacy Policy</Link>.</p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
