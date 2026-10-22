import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion'
import { useStore } from '../store/Store'
import { autocomplete, STATES } from '../lib/commerce'
import { CATEGORIES, SUGGESTED_QUERIES } from '../data/catalog'
import { Icon } from './Icon'
import { ProductArt } from './ui'

// "oja AFRICA" wordmark, redrawn from the brand logo. Letters use currentColor
// so the light variant turns white; the tilted square is always brand orange.
export function Logo({ light, tagline }) {
  return (
    <Link to="/" className={`logo ${light ? 'logo-light' : ''} ${tagline ? 'logo-tagline' : ''}`} aria-label="Oja Africa home">
      <svg viewBox={tagline ? '250 135 780 565' : '250 135 780 465'} aria-hidden>
        <g fill="none" stroke="currentColor" strokeWidth="76">
          <ellipse cx="412" cy="388" rx="116" ry="108" />
          <ellipse cx="860" cy="386" rx="122" ry="111" />
          <path d="M637 296 V465 C637 522 600 556 552 556" />
        </g>
        <path fill="currentColor" d="M599 300 V270 Q599 261 608 259 L661 247 Q675 244 675 258 V300 Z" />
        <path fill="currentColor" d="M945 386 H1022 V517 Q1022 527 1012 527 H955 Q945 527 945 517 Z" />
        <rect fill="var(--accent)" x="-44" y="-40" width="88" height="80" rx="15" transform="translate(640 190) rotate(-13)" />
        {tagline && (
          <text x="647" y="688" textAnchor="middle" textLength="518" lengthAdjust="spacing" fill="currentColor"
            fontFamily="Inter, system-ui, sans-serif" fontWeight="700" fontSize="66">AFRICA</text>
        )}
      </svg>
    </Link>
  )
}

// Simplified flags (SVG renders the same on every OS; emoji flags don't show on Windows)
const FLAGS = {
  us: <><rect width="24" height="16" fill="#fff" />{[0, 2, 4, 6, 8, 10, 12].map((k) => <rect key={k} y={k * 16 / 13} width="24" height={16 / 13} fill="#b22234" />)}<rect width="10.5" height={7 * 16 / 13} fill="#3c3b6e" />{[[2, 2], [5, 2], [8, 2], [3.5, 4.4], [6.5, 4.4], [2, 6.8], [5, 6.8], [8, 6.8]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r=".6" fill="#fff" />)}</>,
  fr: <><rect width="8" height="16" fill="#0055a4" /><rect x="8" width="8" height="16" fill="#fff" /><rect x="16" width="8" height="16" fill="#ef4135" /></>,
  pt: <><rect width="9.6" height="16" fill="#006600" /><rect x="9.6" width="14.4" height="16" fill="#ff0000" /><circle cx="9.6" cy="8" r="3" fill="#ffcc00" /></>,
  eg: <><rect width="24" height="5.34" fill="#ce1126" /><rect y="5.33" width="24" height="5.34" fill="#fff" /><rect y="10.66" width="24" height="5.34" fill="#000" /><circle cx="12" cy="8" r="1.6" fill="#c09300" /></>,
  ke: <><rect width="24" height="16" fill="#fff" /><rect width="24" height="4.6" fill="#000" /><rect y="5.7" width="24" height="4.6" fill="#bb0000" /><rect y="11.4" width="24" height="4.6" fill="#006600" /><ellipse cx="12" cy="8" rx="2.4" ry="4.6" fill="#bb0000" stroke="#000" strokeWidth=".6" /></>,
  ng: <><rect width="8" height="16" fill="#008751" /><rect x="8" width="8" height="16" fill="#fff" /><rect x="16" width="8" height="16" fill="#008751" /></>,
}
const LANGUAGES = [
  { id: 'en', code: 'EN', name: 'English', flag: 'us' },
  { id: 'fr', code: 'FR', name: 'Français', flag: 'fr' },
  { id: 'pt', code: 'PT', name: 'Português', flag: 'pt' },
  { id: 'ar', code: 'AR', name: 'العربية', flag: 'eg' },
  { id: 'sw', code: 'SW', name: 'Kiswahili', flag: 'ke' },
  { id: 'ha', code: 'HA', name: 'Hausa', flag: 'ng' },
  { id: 'yo', code: 'YO', name: 'Yorùbá', flag: 'ng' },
]
const Flag = ({ id }) => <svg className="flag" viewBox="0 0 24 16" width="24" height="16" aria-hidden>{FLAGS[id]}</svg>

function LanguagePicker() {
  const { state, dispatch, toast } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = LANGUAGES.find((l) => l.id === state.language) || LANGUAGES[0]
  useEffect(() => {
    if (!open) return
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc) }
  }, [open])
  const pick = (l) => {
    setOpen(false)
    if (l.id === current.id) return
    dispatch({ type: 'setLanguage', language: l.id })
    if (l.id !== 'en') toast(`${l.name} saved. Translation is coming soon, so the site shows in English for now.`, { icon: 'Bell', ms: 4000 })
  }
  return (
    <div className="lang" ref={ref}>
      <button className="lang-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} aria-label={`Language: ${current.name}`}>
        <Flag id={current.flag} /><span>{current.code}</span><svg className="lang-caret" viewBox="0 0 10 6" width="10" height="6" aria-hidden><path d="M0 0h10L5 6z" fill="currentColor" /></svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul className="lang-pop" role="listbox" aria-label="Choose language" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
            {LANGUAGES.map((l) => (
              <li key={l.id}>
                <button role="option" aria-selected={l.id === current.id} className={l.id === current.id ? 'on' : ''} onClick={() => pick(l)}>
                  <Flag id={l.flag} /><span className="lang-name">{l.name}</span><span className="lang-code">{l.code}</span>
                  {l.id === current.id && <Icon name="Check" size={15} />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

function AllCategories() {
  const { live } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const loc = useLocation()
  useEffect(() => { setOpen(false) }, [loc.pathname, loc.search])
  useEffect(() => {
    if (!open) return
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc) }
  }, [open])
  const count = (id) => live.filter((p) => p.category === id).length
  return (
    <div className="allcats" ref={ref}>
      <button className={`allcats-btn ${open ? 'on' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="true">
        <Icon name="LayoutGrid" size={16} />All categories<Icon name="ChevronDown" size={16} className="allcats-caret" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="allcats-pop" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
            <div className="allcats-grid">
              {CATEGORIES.map((c) => (
                <Link key={c.id} to={`/search?cat=${c.id}`} className="allcats-item">
                  <span className="allcats-ico" style={{ '--h': c.hue }}><Icon name={c.icon} size={20} /></span>
                  <span><b>{c.name}</b><small>{count(c.id)} products</small></span>
                </Link>
              ))}
            </div>
            <div className="allcats-foot">
              <Link to="/deals" className="catlink hot"><Icon name="Zap" size={15} /> Flash deals</Link>
              <Link to="/search" className="allcats-all">Browse all products <Icon name="ArrowRight" size={15} /></Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SearchBox() {
  const { state, dispatch } = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  const [q, setQ] = useState(() => new URLSearchParams(loc.search).get('q') || '')
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(-1)
  const ref = useRef(null)
  const sugg = autocomplete(q)

  useEffect(() => { if (loc.pathname === '/search') setQ(new URLSearchParams(loc.search).get('q') || '') }, [loc])
  useEffect(() => {
    const off = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', off)
    return () => document.removeEventListener('mousedown', off)
  }, [])

  const go = (term) => {
    dispatch({ type: 'searched', q: term })
    setOpen(false)
    nav(`/search?q=${encodeURIComponent(term)}`)
  }
  const pick = (s) => {
    setOpen(false)
    if (s.type === 'product') nav(`/p/${s.id}`)
    else nav(`/search?cat=${s.id}`)
  }
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, sugg.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, -1)) }
    else if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'Enter') { e.preventDefault(); hi >= 0 && sugg[hi] ? pick(sugg[hi]) : go(q) }
  }

  return (
    <div className="search" ref={ref}>
      <form onSubmit={(e) => { e.preventDefault(); go(q) }} className="search-form">
        <span className="search-ico" aria-hidden>⌕</span>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(-1) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="Search power banks, bonnets, sneakers…"
          aria-label="Search products"
        />
        <button className="search-btn" type="submit">Search</button>
      </form>
      <AnimatePresence>
        {open && (
          <motion.div className="search-pop" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}>
            {q.trim() ? (
              sugg.length ? sugg.map((s, i) => (
                <button key={s.type + s.id} className={`sugg ${hi === i ? 'hi' : ''}`} onMouseEnter={() => setHi(i)} onClick={() => pick(s)}>
                  <span className="sugg-ico">{s.type === 'product' ? <ProductArt p={s.product} size="xs" /> : <Icon name={s.icon} size={18} />}</span>
                  <span className="sugg-label">{s.label}</span>
                  <span className="sugg-type">{s.type === 'category' ? 'Category' : ''}</span>
                </button>
              )) : <div className="sugg-empty">Press Enter to search “{q}”</div>
            ) : (
              <div className="sugg-chips">
                {state.searches.length > 0 && (
                  <>
                    <div className="sugg-head">Recent <button className="link" onClick={() => dispatch({ type: 'clearSearches' })}>Clear</button></div>
                    <div className="chips">{state.searches.map((s) => <button key={s} className="chip chip-ico" onClick={() => go(s)}><Icon name="History" size={13} /> {s}</button>)}</div>
                  </>
                )}
                <div className="sugg-head"><span className="row-ico">Trending across Africa <Icon name="Flame" size={14} className="flame" /></span></div>
                <div className="chips">{SUGGESTED_QUERIES.map((s) => <button key={s} className="chip" onClick={() => go(s)}>{s}</button>)}</div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CartButton() {
  const { cartCount } = useStore()
  const ctl = useAnimationControls()
  const prev = useRef(cartCount)
  useEffect(() => {
    if (cartCount > prev.current) ctl.start({ scale: [1, 1.35, 0.9, 1.1, 1], rotate: [0, -12, 10, -4, 0], transition: { duration: 0.55 } })
    prev.current = cartCount
  }, [cartCount, ctl])
  return (
    <Link to="/cart" className="hbtn" aria-label={`Cart, ${cartCount} items`}>
      <motion.span animate={ctl} className="hbtn-ico"><Icon name="ShoppingCart" size={22} /></motion.span>
      <span className="hbtn-label">Cart</span>
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.span key={cartCount} className="cart-count" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>
            {cartCount}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  )
}

export function Header() {
  const { state, dispatch } = useStore()
  return (
    <header className="header">
      <div className="promo-strip">
        <div className="marquee">
          <div className="marquee-track">
            {Array.from({ length: 2 }).map((_, k) => (
              <span key={k} className="marquee-set">
                {[['Truck', <>Free delivery on orders above ₦50,000</>], ['Stamp', <>Import duties included — no surprise charges</>], ['Gift', <>New here? 10% off with <b>OJA10</b></>], ['Lock', <>Payments verified securely</>], ['RotateCcw', <>Easy returns on eligible items</>]].map(([ico, text], j) => (
                  <span key={j} className="marquee-item"><Icon name={ico} size={14} />{text}</span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="header-main wrap">
        <Logo />
        <label className="deliver-to">
          <span className="muted small">Deliver to</span>
          <select value={state.deliveryState} onChange={(e) => dispatch({ type: 'setDeliveryState', state: e.target.value })} aria-label="Delivery state">
            {STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <SearchBox />
        <nav className="header-actions">
          <LanguagePicker />
          <Link to="/orders" className="hbtn"><span className="hbtn-ico"><Icon name="Package" size={22} /></span><span className="hbtn-label">Orders</span></Link>
          {state.user
            ? <Link to="/account" className="hbtn"><span className="hbtn-ico"><Icon name="User" size={22} /></span><span className="hbtn-label">{state.user.name.split(' ')[0]}</span></Link>
            : <button className="hbtn" onClick={() => dispatch({ type: 'openAuth' })}><span className="hbtn-ico"><Icon name="User" size={22} /></span><span className="hbtn-label">Sign in</span></button>}
          <CartButton />
        </nav>
      </div>
      <div className="catbar">
        <div className="wrap catbar-row">
          <AllCategories />
          <div className="catbar-inner">
            <NavLink to="/search?sort=popular" className="catlink hot"><Icon name="Flame" size={15} /> Best sellers</NavLink>
            <NavLink to="/deals" className="catlink hot"><Icon name="Zap" size={15} /> Flash deals</NavLink>
            {CATEGORIES.map((c) => <NavLink key={c.id} to={`/search?cat=${c.id}`} className="catlink">{c.name}</NavLink>)}
          </div>
        </div>
      </div>
    </header>
  )
}

export function MobileTabBar() {
  const { cartCount } = useStore()
  const items = [['/', 'House', 'Home'], ['/search', 'Search', 'Explore'], ['/deals', 'Zap', 'Deals'], ['/cart', 'ShoppingCart', 'Cart'], ['/account', 'User', 'Me']]
  return (
    <nav className="tabbar">
      {items.map(([to, ico, label]) => (
        <NavLink key={to} to={to} end={to === '/'} className="tabbar-item">
          {({ isActive }) => (
            <>
              {isActive && <motion.span layoutId="tabbar-dot" className="tabbar-bg" />}
              <span className="tabbar-ico"><Icon name={ico} size={21} stroke={isActive ? 2.2 : 1.8} />{to === '/cart' && cartCount > 0 && <b className="tabbar-badge">{cartCount}</b>}</span>
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

const FOOTER_LINKS = [
  ['Company info', [['About Oja', '/help'], ['Affiliate & Influencer Program: Join to Earn', '/help'], ['Contact us', '/help'], ['Careers', '/help'], ['Press', '/help'], ['Operations dashboard', '/admin']]],
  ['Customer service', [['Return and refund policy', '/help#returns'], ['Shipping & customs info', '/help#delivery'], ['Track an order', '/orders'], ['Report suspicious activity', '/help'], ['Prohibited product list', '/help'], ['Intellectual property policy', '/help']]],
  ['Help', [['Support centre & FAQ', '/help'], ['Safety centre', '/help'], ['Oja purchase protection', '/help'], ['Flash deals', '/deals'], ['All categories', '/search'], ['Partner with Oja', '/help']]],
]

// Simple brand-neutral glyphs (Lucide no longer ships brand icons).
const SOCIALS = [
  ['Instagram', <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></>],
  ['Facebook', <path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V10H6.5v3.5H9V21h3.5v-7.5H15l.5-3.5h-3V7a1 1 0 0 1 1-1H15z" fill="currentColor" stroke="none" />],
  ['X', <path d="M4 4l16 16M20 4L4 20" />],
  ['TikTok', <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.5 2.6 2.4 4.4 5 4.6" />],
  ['YouTube', <><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor" stroke="none" /></>],
  ['WhatsApp', <><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" /><path d="M9.5 9c0 3 2.5 5.5 5.5 5.5" /></>],
]

// Security marks in the same tile format as the payment logos (simplified; use official
// assets, and only show programmes Oja is actually certified for, before launch).
const SECURITY = [
  ['PCI DSS compliant', '#fff', <><text x="8" y="24" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="14" fill="#1b3f8b">PCI</text><rect x="36" y="13" width="17" height="14" rx="2" fill="#2ca24c" /><text x="44.5" y="23.4" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="6.6" fill="#fff">DSS</text></>],
  ['Visa Secure', '#fff', <><text x="30" y="20" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontStyle="italic" fontSize="13" letterSpacing=".4" fill="#1a1f71">VISA</text><rect x="14" y="24.5" width="32" height="7" rx="1.5" fill="#1a1f71" /><text x="30" y="30" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="5.2" letterSpacing=".8" fill="#fff">SECURE</text></>],
  ['Mastercard ID Check', '#fff', <><circle cx="14" cy="20" r="6.5" fill="#eb001b" /><circle cx="21" cy="20" r="6.5" fill="#f79e1b" /><path d="M17.5 14.5a6.5 6.5 0 0 1 0 11 6.5 6.5 0 0 1 0-11z" fill="#ff5f00" /><text x="30" y="18.5" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="7.2" fill="#1a1a1a">ID</text><text x="30" y="26.5" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="7.2" fill="#1a1a1a">Check</text></>],
  ['Verve SafeToken', '#fff', <><circle cx="13" cy="20" r="7" fill="#e3242b" /><path d="M9.8 16h2l1.2 4.4 1.3-4.4h2l-2.5 7.6h-1.6z" fill="#fff" /><text x="23" y="18.5" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="7" fill="#00425f">Safe</text><text x="23" y="26.5" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="7" fill="#00425f">Token</text></>],
  ['SSL secured', '#fff', <><rect x="9" y="18" width="12" height="10" rx="2" fill="#128a57" /><path d="M12 18v-3a3 3 0 0 1 6 0v3" fill="none" stroke="#128a57" strokeWidth="2" /><text x="25" y="22" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="9" fill="#0f1a2e">SSL</text><text x="25" y="29.5" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="5.6" letterSpacing=".3" fill="#128a57">SECURE</text></>],
  ['NDPR compliant', '#fff', <><path d="M14 10l7 2.8v5.6c0 4.6-3 7.6-7 9.1-4-1.5-7-4.5-7-9.1v-5.6z" fill="#008751" /><path d="M10.8 18.6l2.3 2.3 4.2-4.4" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><text x="24" y="21.5" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="8.6" fill="#0f1a2e">NDPR</text><text x="24" y="29" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="5.2" fill="#45506a">Compliant</text></>],
]
// Payment method tiles (logo only, brand background). Simplified SVG versions of each
// brand's mark; swap in official assets from each provider's brand kit before launch.
const T = { font: 'Arial, Helvetica, sans-serif' }
const PAYMENTS = [
  ['Visa', '#fff', <text x="30" y="26" textAnchor="middle" fontFamily={T.font} fontWeight="900" fontStyle="italic" fontSize="17" letterSpacing=".5" fill="#1a1f71">VISA</text>],
  ['Mastercard', '#fff', <><circle cx="24" cy="20" r="11" fill="#eb001b" /><circle cx="36" cy="20" r="11" fill="#f79e1b" /><path d="M30 10.8a11 11 0 0 1 0 18.4 11 11 0 0 1 0-18.4z" fill="#ff5f00" /></>],
  ['Verve', '#fff', <><circle cx="15" cy="20" r="8.5" fill="#e3242b" /><path d="M11 15.2h2.4l1.6 5.3 1.6-5.3H19l-3 9h-2z" fill="#fff" /><text x="26" y="24" fontFamily={T.font} fontWeight="900" fontSize="11" fill="#00425f">verve</text></>],
  ['American Express', '#2e77bc', <><text x="30" y="18.5" textAnchor="middle" fontFamily={T.font} fontWeight="900" fontStyle="italic" fontSize="8.6" letterSpacing=".2" fill="#fff">AMERICAN</text><text x="30" y="28.5" textAnchor="middle" fontFamily={T.font} fontWeight="900" fontStyle="italic" fontSize="8.6" letterSpacing=".9" fill="#fff">EXPRESS</text></>],
  ['Paystack', '#011b33', <>{[[13, 9], [16.5, 9], [20, 7], [23.5, 9]].map(([y, w]) => <rect key={y} x="7" y={y} width={w} height="2.2" rx="1.1" fill="#0ba4db" />)}<text x="19" y="23.5" fontFamily={T.font} fontWeight="700" fontSize="9" textLength="35" lengthAdjust="spacingAndGlyphs" fill="#fff">paystack</text></>],
  ['Flutterwave', '#fff', <><path d="M4 24c2-6.5 4-6.5 5.2-2S13 26.5 15 20" fill="none" stroke="#f5a623" strokeWidth="2.2" strokeLinecap="round" /><circle cx="15" cy="16" r="1.5" fill="#fb4e20" /><text x="17.5" y="23" fontFamily={T.font} fontWeight="700" fontSize="6.6" textLength="39" lengthAdjust="spacingAndGlyphs" fill="#2a3362">flutterwave</text></>],
  ['OPay', '#1dcf9f', <text x="30" y="25.5" textAnchor="middle" fontFamily={T.font} fontWeight="900" fontSize="15" fill="#fff">OPay</text>],
  ['PalmPay', '#6c2bd9', <text x="30" y="24.5" textAnchor="middle" fontFamily={T.font} fontWeight="800" fontSize="11.5" fill="#fff">PalmPay</text>],
  ['Bank transfer', '#0b2045', <><path d="M30 8.5l8 4.5H22z" fill="#fff" /><path d="M23.5 15h2v7h-2zM29 15h2v7h-2zM34.5 15h2v7h-2zM22 23.5h16v2H22z" fill="#fff" /><text x="30" y="34" textAnchor="middle" fontFamily={T.font} fontWeight="700" fontSize="6.4" letterSpacing=".4" fill="#c3cce0">TRANSFER</text></>],
  ['USSD', '#111', <text x="30" y="24.5" textAnchor="middle" fontFamily="ui-monospace, Menlo, monospace" fontWeight="700" fontSize="11" fill="#fff">*USSD#</text>],
  ['Pay on delivery', '#ff7a2e', <><rect x="19" y="9" width="22" height="13" rx="2" fill="none" stroke="#fff" strokeWidth="2" /><circle cx="30" cy="15.5" r="3" fill="#fff" /><text x="30" y="33" textAnchor="middle" fontFamily={T.font} fontWeight="800" fontSize="7" letterSpacing=".4" fill="#fff">ON DELIVERY</text></>],
]

export function Footer() {
  const { toast } = useStore()
  const soon = (what) => (e) => { e.preventDefault(); toast(`${what} is coming soon`, { icon: 'Bell' }) }
  return (
    <footer className="footer">
      <div className="wrap footer-top">
        {FOOTER_LINKS.map(([title, links]) => (
          <div key={title} className="footer-col">
            <h4>{title}</h4>
            {links.map(([label, to]) => <Link key={label} to={to}>{label}</Link>)}
          </div>
        ))}
        <div className="footer-side">
          <h4>Connect with Oja</h4>
          <div className="socials">
            {SOCIALS.map(([name, glyph]) => (
              <a key={name} href="#" aria-label={name} title={name} onClick={soon(`Oja on ${name}`)}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{glyph}</svg>
              </a>
            ))}
          </div>
          <p className="footer-tagline">From Asia, Europe, America to your doorstep, we handle every step.</p>
        </div>
      </div>

      <div className="wrap footer-brand"><Logo light tagline /></div>

      <div className="wrap footer-trust">
        <div>
          <h4>Security certification</h4>
          <div className="pay-row">{SECURITY.map(([name, bg, art]) => (
            <svg key={name} className="pay-tile" viewBox="0 0 60 40" role="img" aria-label={name}><title>{name}</title><rect width="60" height="40" fill={bg} />{art}</svg>
          ))}</div>
        </div>
        <div>
          <h4>We accept</h4>
          <div className="pay-row">{PAYMENTS.map(([name, bg, art]) => (
            <svg key={name} className="pay-tile" viewBox="0 0 60 40" role="img" aria-label={name}><title>{name}</title><rect width="60" height="40" fill={bg} />{art}</svg>
          ))}</div>
        </div>
      </div>

      <div className="wrap footer-base">
        <span>© 2026 Oja by Cargoland</span>
        <Link to="/help">Terms of use</Link>
        <Link to="/help">Privacy policy</Link>
        <Link to="/help">Cookie choices</Link>
        <span className="footer-note">Prototype build — mock data, no real payments.</span>
      </div>
    </footer>
  )
}
