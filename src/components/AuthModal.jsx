import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/Store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Icon } from './Icon'
import { linkCls } from './common'

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

  const prev = state.lastLogin ? state.accounts.find((u) => accountId(u) === state.lastLogin) : null
  const showPrev = prev && !hidePrev

  // Reset each time the pop-up opens (the dialog itself locks scroll and handles Escape)
  useEffect(() => {
    if (!open) return
    setView('home'); setValue(''); setName(''); setOtp(''); setTarget(null); setHidePrev(false)
  }, [open])

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
  const twoCol = showPrev && view === 'home'

  const opt = 'flex w-full items-center justify-center gap-3.5 rounded-full border-[1.5px] border-[#c9cfdb] bg-white px-5 py-[13px] text-[16px] font-medium text-ink transition-colors duration-150 hover:border-brand hover:bg-[#fafbfd] max-sm:px-4 max-sm:py-3 max-sm:text-[15px]'
  const way = cn(opt, 'justify-start pl-[max(20px,20%)] max-sm:pl-[max(16px,14%)] [&>:first-child]:flex-[0_0_24px]')
  const h3 = 'mb-1 self-stretch text-left text-[17px] text-ink'
  const field = 'grid gap-1.5'
  const fieldLabel = 'text-[13px] font-semibold text-ink-2'
  const input = 'h-auto w-full rounded-lg border-[1.5px] border-line bg-white px-3.5 py-3 text-[15px] shadow-none focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand-tint md:text-[15px]'
  const note = 'flex items-center gap-2 rounded-lg bg-brand-tint px-3 py-2.5 text-[13.5px] text-brand'
  const back = 'inline-flex items-center gap-1.5 self-start text-[14px] font-semibold text-ink-2 hover:text-brand'
  const step = 'mx-auto flex max-w-[420px] flex-col gap-3'
  const err = 'text-[13px] text-bad'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent showCloseButton={false} overlayClassName="z-150 bg-[rgba(7,16,35,.55)] backdrop-blur-[3px]"
        className={cn('tw z-160 block max-h-[calc(100dvh-32px)] w-[min(580px,calc(100vw-32px))] max-w-none gap-0 overflow-y-auto overscroll-contain rounded-lg border-0 bg-white px-10 pb-6 pt-[34px] shadow-[0_30px_80px_rgba(7,16,35,.35)] sm:max-w-none',
          'max-sm:bottom-0 max-sm:top-auto max-sm:max-h-[94dvh] max-sm:w-screen max-sm:translate-y-0 max-sm:rounded-b-none max-sm:px-[18px] max-sm:pb-[calc(18px+env(safe-area-inset-bottom,0px))] max-sm:pt-[26px]',
          twoCol && 'w-[min(1000px,calc(100vw-32px))]')}>
        <button className="absolute right-3.5 top-3.5 grid size-10 place-items-center rounded-full text-ink hover:bg-background" onClick={close} aria-label="Close"><Icon name="X" size={22} /></button>

        <header className="grid gap-1.5 text-center">
          <DialogTitle className="text-[28px] font-extrabold leading-[1.15] text-ink max-sm:text-[23px]">{view === 'code' ? 'Enter your code' : target?.draft || (view === 'form' && isNew) ? 'Create your account' : 'Sign in'}</DialogTitle>
          <DialogDescription className="inline-flex items-center justify-center gap-1.5 text-[15px] font-medium text-good"><Icon name="Lock" size={15} fill="currentColor" /> All data is safeguarded</DialogDescription>
        </header>

        <ul className={cn('mb-[26px] mt-[22px] grid rounded-lg bg-brand-tint px-2.5 py-3.5 max-sm:mb-[18px] max-sm:mt-4 max-sm:px-1 max-sm:py-2.5', twoCol ? 'grid-cols-4 max-md:grid-cols-2 max-md:gap-y-3' : 'grid-cols-2 gap-y-3')}>
          {PERKS.map(([ico, t, s], i) => (
            <li key={t} className={cn('flex min-w-0 items-center gap-2.5 px-3.5 py-0.5 text-brand max-sm:gap-2 max-sm:px-2', i > 0 && 'border-l border-[rgba(11,32,69,.14)]', i === 2 && (twoCol ? 'max-md:border-l-0' : 'border-l-0'))}>
              <Icon name={ico} size={22} className="text-orange" />
              <span className="flex min-w-0 flex-col text-[12.5px] leading-[1.3] text-ink-2 max-sm:text-[11.5px]"><b className="text-[14px] text-brand max-sm:text-[12.5px]">{t}</b>{s}</span>
            </li>
          ))}
        </ul>

        <AnimatePresence mode="wait" initial={false}>
          {view === 'home' && (
            <motion.div key="home" className={cn('grid gap-3.5', twoCol && 'grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-9 max-md:grid-cols-1 max-md:gap-5')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {showPrev && (
                <>
                  <section className="flex min-w-0 flex-col items-center gap-3">
                    <h3 className={h3}>Sign in with a previously used account</h3>
                    <span className="mt-2 grid size-24 place-items-center rounded-full bg-brand font-display text-[42px] font-extrabold text-white shadow-[0_0_0_4px_var(--color-brand-tint)]" aria-hidden>{prev.name[0]}</span>
                    <b className="mt-1 font-display text-[19px]">{prev.name}</b>
                    <span className="-mt-2 mb-2 text-muted-foreground">{mask(prev)}</span>
                    <button className={cn(opt, 'border-ink font-bold')} onClick={() => sendCode({ account: prev })}>
                      <Icon name={prev.email ? 'Mail' : 'Smartphone'} size={20} />Continue as {prev.name.split(' ')[0]}
                    </button>
                    <button className={opt} onClick={() => setHidePrev(true)}>Use another way to sign in</button>
                    <div className="mt-1 flex items-center justify-center gap-3.5 text-[14px] text-muted-foreground">
                      <button className="text-ink-2 hover:text-brand hover:underline" onClick={() => dispatch({ type: 'forgetLastLogin' })}>Remove account</button>
                      <span aria-hidden>|</span>
                      <Link to="/help" className="text-ink-2 hover:text-brand hover:underline" onClick={close}>Trouble signing in?</Link>
                    </div>
                  </section>
                  <div className="flex flex-col items-center gap-2.5 self-stretch text-[14px] font-semibold text-muted-foreground before:w-px before:flex-1 before:bg-line before:content-[''] after:w-px after:flex-1 after:bg-line after:content-[''] max-md:flex-row max-md:before:h-px max-md:before:w-auto max-md:after:h-px max-md:after:w-auto" aria-hidden><span>OR</span></div>
                </>
              )}
              <section className="flex min-w-0 flex-col gap-3">
                <h3 className={h3}>Register / Sign in with another account</h3>
                <button className={way} onClick={() => choose('email')}><Icon name="Mail" size={22} />Continue with Email</button>
                <button className={way} onClick={() => social('Google')}><GoogleLogo />Continue with Google</button>
                <button className={way} onClick={() => social('Facebook')}><FacebookLogo />Continue with Facebook</button>
                <button className={way} onClick={() => social('Apple')}><AppleLogo />Continue with Apple</button>
                <button className={way} onClick={() => choose('phone')}><Icon name="Smartphone" size={22} />Continue with phone number</button>
              </section>
            </motion.div>
          )}

          {view === 'form' && (
            <motion.form key="form" className={step} onSubmit={submitForm} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
              <button type="button" className={back} onClick={() => setView('home')}><Icon name="ArrowLeft" size={16} /> All sign-in options</button>
              <label className={field}>
                <span className={fieldLabel}>{method === 'email' ? 'Email address' : 'Phone number'}</span>
                <Input id="auth-id" className={input} autoFocus value={value} onChange={(e) => setValue(e.target.value)} type={method === 'email' ? 'email' : 'tel'} inputMode={method === 'email' ? 'email' : 'tel'} autoComplete={method === 'email' ? 'email' : 'tel'} placeholder={method === 'email' ? 'you@example.com' : '0803 123 4567'} aria-invalid={(value && !valid) || undefined} />
              </label>
              {value && !valid && <div className={err}>{method === 'email' ? 'Enter a valid email address' : 'Enter a valid Nigerian mobile number, like 0803 123 4567'}</div>}
              {existing && <div className={cn(note, 'bg-good-tint text-good-ink')}><Icon name="CircleCheck" size={16} /> Welcome back, {existing.name.split(' ')[0]}. We'll send you a sign-in code.</div>}
              {isNew && (
                <>
                  <div className={note}>New to Oja? Add your name to create your account.</div>
                  <label className={field}><span className={fieldLabel}>Full name</span><Input id="auth-name" className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Ada Okafor" /></label>
                </>
              )}
              <Button size="lg" className="w-full" disabled={!valid || (isNew && !name.trim())}>{isNew ? 'Create account' : 'Send code'}</Button>
            </motion.form>
          )}

          {view === 'code' && (
            <motion.form key="code" className={step} onSubmit={verify} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
              <button type="button" className={back} onClick={() => setView(target?.account && target.account === prev ? 'home' : 'form')}><Icon name="ArrowLeft" size={16} /> Back</button>
              <p className="text-muted-foreground">We sent a 6-digit code to <b className="text-ink">{sentTo}</b>.</p>
              <Input id="auth-otp" className={cn(input, 'text-center font-display text-[26px] tracking-[.5em] md:text-[26px]')} autoFocus maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="••••••" inputMode="numeric" autoComplete="one-time-code" aria-label="6-digit code" aria-invalid={(otp.length === 6 && otp !== code) || undefined} />
              {otp.length === 6 && otp !== code && <div className={err}>That code doesn't match. Check the latest code and try again.</div>}
              <Button size="lg" className="w-full" disabled={otp.length !== 6}>{target?.draft ? 'Verify & create account' : 'Verify & sign in'}</Button>
              <button type="button" className={cn(linkCls, 'self-center text-[14px]')} onClick={() => sendCode(target)}>Send a new code</button>
            </motion.form>
          )}
        </AnimatePresence>

        <p className="mt-[26px] text-center text-[13.5px] text-ink-2 [&_a]:font-semibold [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-3">By signing in or continuing, you agree to our <Link to="/help" onClick={close}>Terms of Use</Link> and <Link to="/help" onClick={close}>Privacy Policy</Link>.</p>
      </DialogContent>
    </Dialog>
  )
}
