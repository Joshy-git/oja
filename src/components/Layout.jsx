import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion'
import { useStore } from '../store/Store'
import { autocomplete, STATES } from '../lib/commerce'
import { CATEGORIES, SUGGESTED_QUERIES } from '../data/catalog'
import { cn } from '@/lib/utils'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import footerWarehouse from '../assets/footer-warehouse.webp'
import { Icon } from './Icon'
import { ProductArt, wrap, linkCls, chipCls as chip } from './common'

// "oja AFRICA" wordmark, redrawn from the brand logo. Letters use currentColor
// so the light variant turns white; the tilted square is always brand orange.
export function Logo({ light, tagline, className, linkClassName }) {
  return (
    <Link to="/" className={cn('inline-flex items-center leading-[0] text-brand', light && 'text-white', linkClassName)} aria-label="Oja Africa home">
      <svg viewBox={tagline ? '250 135 780 565' : '250 135 780 465'} className={cn('block h-[34px] w-auto', tagline && 'h-14', className)} aria-hidden>
        <g fill="none" stroke="currentColor" strokeWidth="76">
          <ellipse cx="412" cy="388" rx="116" ry="108" />
          <ellipse cx="860" cy="386" rx="122" ry="111" />
          <path d="M637 296 V465 C637 522 600 556 552 556" />
        </g>
        <path fill="currentColor" d="M599 300 V270 Q599 261 608 259 L661 247 Q675 244 675 258 V300 Z" />
        <path fill="currentColor" d="M945 386 H1022 V517 Q1022 527 1012 527 H955 Q945 527 945 517 Z" />
        <rect fill="var(--color-orange)" x="-44" y="-40" width="88" height="80" rx="15" transform="translate(640 190) rotate(-13)" />
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
const Flag = ({ id }) => <svg className="shrink-0 rounded-[2px] shadow-[0_0_0_1px_rgba(11,32,69,.12)]" viewBox="0 0 24 16" width="24" height="16" aria-hidden>{FLAGS[id]}</svg>

function LanguagePicker() {
  const { state, dispatch, toast } = useStore()
  const current = LANGUAGES.find((l) => l.id === state.language) || LANGUAGES[0]
  const pick = (l) => {
    if (l.id === current.id) return
    dispatch({ type: 'setLanguage', language: l.id })
    if (l.id !== 'en') toast(`${l.name} saved. Translation is coming soon, so the site shows in English for now.`, { icon: 'Bell', ms: 4000 })
  }
  return (
    <div className="relative flex items-center">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger className="group inline-flex items-center gap-[7px] rounded-lg px-2.5 py-2 text-[14px] font-bold text-ink outline-none hover:bg-background hover:text-brand focus-visible:ring-2 focus-visible:ring-brand-tint data-[state=open]:bg-background data-[state=open]:text-brand max-sm:gap-[5px] max-sm:px-1.5" aria-label={`Language: ${current.name}`}>
          <Flag id={current.flag} /><span className="max-sm:hidden">{current.code}</span>
          <svg className="text-muted-foreground transition-transform duration-150 group-data-[state=open]:rotate-180" viewBox="0 0 10 6" width="10" height="6" aria-hidden><path d="M0 0h10L5 6z" fill="currentColor" /></svg>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} aria-label="Choose language" className="z-70 min-w-[210px] rounded-lg border-line p-1.5 shadow-lift">
          {LANGUAGES.map((l) => {
            const on = l.id === current.id
            return (
              <DropdownMenuItem key={l.id} onSelect={() => pick(l)} aria-current={on || undefined}
                className={cn('gap-2.5 rounded-md px-2.5 py-[9px] text-[14px] text-ink', on && 'bg-brand-tint font-semibold text-brand focus:bg-brand-tint focus:text-brand')}>
                <Flag id={l.flag} /><span className="flex-1">{l.name}</span><span className="text-[12px] font-semibold text-muted-foreground">{l.code}</span>
                {on && <Icon name="Check" size={15} className="text-brand" />}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

const catlink = 'inline-flex items-center gap-[5px] whitespace-nowrap rounded-full px-3 py-1.5 text-[13.5px] font-medium text-ink-2 hover:bg-background hover:text-ink'
const catlinkHot = 'inline-flex items-center gap-[5px] whitespace-nowrap rounded-full px-3 py-1.5 text-[13.5px] font-bold text-orange hover:bg-background'

function AllCategories() {
  const { live } = useStore()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => { setOpen(false) }, [loc.pathname, loc.search])
  const count = (id) => live.filter((p) => p.category === id).length
  return (
    <div className="shrink-0 border-r border-line pr-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="group inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[13.5px] font-semibold text-ink transition-colors duration-150 hover:bg-background data-[state=open]:bg-brand-tint data-[state=open]:text-brand">
          <Icon name="LayoutGrid" size={16} />All categories<Icon name="ChevronDown" size={16} className="text-muted-foreground transition-transform duration-150 group-data-[state=open]:rotate-180 group-data-[state=open]:text-brand" />
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={6} collisionPadding={12}
          className="z-70 w-[min(760px,calc(100vw-40px))] rounded-lg border-line p-3.5 shadow-lift max-md:max-h-[70dvh] max-md:w-[calc(100vw-24px)] max-md:overflow-y-auto max-md:p-2.5">
          <div className="grid grid-cols-3 gap-1 max-lg:grid-cols-2">
            {CATEGORIES.map((c) => (
              <Link key={c.id} to={`/search?cat=${c.id}`} className="group/item flex min-w-0 items-center gap-3 rounded-lg p-2.5 hover:bg-background max-md:gap-2 max-md:px-1.5 max-md:py-2">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[hsl(var(--h)_70%_94%)] text-[hsl(var(--h)_55%_34%)] max-md:size-[34px]" style={{ '--h': c.hue }}><Icon name={c.icon} size={20} /></span>
                <span className="flex min-w-0 flex-col">
                  <b className="truncate text-[14px] font-semibold text-ink group-hover/item:text-brand max-md:whitespace-normal max-md:text-[13px]">{c.name}</b>
                  <small className="text-[12px] text-muted-foreground">{count(c.id)} products</small>
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2.5">
            <Link to="/deals" className={catlinkHot}><Icon name="Zap" size={15} /> Flash deals</Link>
            <Link to="/search" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-brand underline-offset-3 hover:underline">Browse all products <Icon name="ArrowRight" size={15} /></Link>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

const suggHead = 'mb-2 mt-1.5 flex justify-between text-[12px] font-bold uppercase tracking-[.06em] text-muted-foreground'

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
    <div className="relative min-w-0 flex-1 max-md:order-5 max-md:max-w-none max-md:basis-full" ref={ref}>
      <form onSubmit={(e) => { e.preventDefault(); go(q) }} className="flex items-center rounded-full border-2 border-brand bg-background py-[3px] pl-4 pr-[3px]">
        <span className="mr-1.5 text-[20px] text-muted-foreground" aria-hidden>⌕</span>
        <input
          className="min-w-0 flex-1 border-0 bg-transparent py-2 outline-none"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(-1) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="Search power banks, bonnets, sneakers…"
          aria-label="Search products"
        />
        <button className="rounded-full bg-brand px-[18px] py-2 font-semibold text-white" type="submit">Search</button>
      </form>
      <AnimatePresence>
        {open && (
          <motion.div className="absolute inset-x-0 top-[calc(100%+8px)] z-60 rounded-lg bg-white p-2 shadow-lift" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}>
            {q.trim() ? (
              sugg.length ? sugg.map((s, i) => (
                <button key={s.type + s.id} className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] text-left', hi === i && 'bg-background')} onMouseEnter={() => setHi(i)} onClick={() => pick(s)}>
                  <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-background text-brand">{s.type === 'product' ? <ProductArt p={s.product} size="xs" className="w-9 rounded-lg" /> : <Icon name={s.icon} size={18} />}</span>
                  <span className="flex-1 text-[14px]">{s.label}</span>
                  <span className="text-[12px] text-muted-foreground">{s.type === 'category' ? 'Category' : ''}</span>
                </button>
              )) : <div className="p-3 text-[14px] text-muted-foreground">Press Enter to search “{q}”</div>
            ) : (
              <div className="p-1.5">
                {state.searches.length > 0 && (
                  <>
                    <div className={suggHead}>Recent <button className={linkCls} onClick={() => dispatch({ type: 'clearSearches' })}>Clear</button></div>
                    <div className="flex flex-wrap gap-2">{state.searches.map((s) => <button key={s} className={cn(chip, 'inline-flex items-center gap-1')} onClick={() => go(s)}><Icon name="History" size={13} /> {s}</button>)}</div>
                  </>
                )}
                <div className={cn(suggHead, state.searches.length > 0 && 'mt-3.5')}><span className="inline-flex items-center gap-1.5">Trending across Africa <Icon name="Flame" size={14} className="text-orange" /></span></div>
                <div className="flex flex-wrap gap-2">{SUGGESTED_QUERIES.map((s) => <button key={s} className={chip} onClick={() => go(s)}>{s}</button>)}</div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const hbtn = 'group relative flex flex-col items-center rounded-lg px-2.5 py-1 text-[12px] font-semibold hover:bg-background'
const hbtnIco = 'grid h-6 place-items-center leading-none text-ink group-hover:text-brand'

function CartButton() {
  const { cartCount } = useStore()
  const ctl = useAnimationControls()
  const prev = useRef(cartCount)
  useEffect(() => {
    if (cartCount > prev.current) ctl.start({ scale: [1, 1.35, 0.9, 1.1, 1], rotate: [0, -12, 10, -4, 0], transition: { duration: 0.55 } })
    prev.current = cartCount
  }, [cartCount, ctl])
  return (
    <Link to="/cart" className={hbtn} aria-label={`Cart, ${cartCount} items`}>
      <motion.span animate={ctl} className={hbtnIco}><Icon name="ShoppingCart" size={22} /></motion.span>
      <span className="max-md:hidden">Cart</span>
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.span key={cartCount} className="absolute -top-0.5 right-0.5 grid h-[19px] min-w-[19px] place-items-center rounded-lg bg-orange px-[5px] text-[11px] font-bold text-white" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>
            {cartCount}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  )
}

const PROMOS = [['Truck', <>Free delivery on orders above ₦50,000</>], ['Stamp', <>Import duties included — no surprise charges</>], ['Gift', <>New here? 10% off with <b className="text-sun">OJA10</b></>], ['Lock', <>Payments verified securely</>], ['RotateCcw', <>Easy returns on eligible items</>]]

export function Header() {
  const { state, dispatch } = useStore()
  return (
    <header className="tw sticky top-0 z-50 bg-white shadow-[0_1px_0_var(--color-line)]">
      <div className="flex h-[30px] items-center overflow-hidden bg-brand-ink text-[12.5px] text-[#dbe4f5]">
        <div className="w-full overflow-hidden">
          <div className="flex w-max animate-marquee whitespace-nowrap motion-reduce:animate-none">
            {Array.from({ length: 2 }).map((_, k) => (
              <span key={k} className="inline-flex">
                {PROMOS.map(([ico, text], j) => (
                  <span key={j} className="mr-9 inline-flex items-center gap-1.5"><Icon name={ico} size={14} className="text-sun" />{text}</span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className={cn(wrap, 'flex h-[70px] items-center gap-[18px] max-md:h-auto max-md:flex-wrap max-md:gap-x-3.5 max-md:gap-y-2.5 max-md:py-2.5')}>
        <Logo />
        <label className="flex flex-col leading-[1.1] max-md:hidden">
          <span className="text-[13px] text-muted-foreground">Deliver to</span>
          <select className="cursor-pointer border-0 bg-transparent p-0 text-[14px] font-bold" value={state.deliveryState} onChange={(e) => dispatch({ type: 'setDeliveryState', state: e.target.value })} aria-label="Delivery state">
            {STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <SearchBox />
        <nav className="ml-auto flex gap-1">
          <LanguagePicker />
          <Link to="/orders" className={hbtn}><span className={hbtnIco}><Icon name="Package" size={22} /></span><span className="max-md:hidden">Orders</span></Link>
          {state.user
            ? <Link to="/account" className={hbtn}><span className={hbtnIco}><Icon name="User" size={22} /></span><span className="max-md:hidden">{state.user.name.split(' ')[0]}</span></Link>
            : <button className={hbtn} onClick={() => dispatch({ type: 'openAuth' })}><span className={hbtnIco}><Icon name="User" size={22} /></span><span className="max-md:hidden">Sign in</span></button>}
          <CartButton />
        </nav>
      </div>
      <div className="border-t border-line">
        <div className={cn(wrap, 'relative flex items-center gap-1.5')}>
          <AllCategories />
          <div className="no-scrollbar flex h-[42px] min-w-0 flex-1 items-center gap-1 overflow-x-auto max-md:h-10">
            <NavLink to="/search?sort=popular" className={catlinkHot}><Icon name="Flame" size={15} /> Best sellers</NavLink>
            <NavLink to="/deals" className={catlinkHot}><Icon name="Zap" size={15} /> Flash deals</NavLink>
            {CATEGORIES.map((c) => <NavLink key={c.id} to={`/search?cat=${c.id}`} className={catlink}>{c.name}</NavLink>)}
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
    <nav className="tw fixed inset-x-0 bottom-0 z-45 hidden h-[62px] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_var(--color-line)] max-md:flex">
      {items.map(([to, ico, label]) => (
        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => cn('relative flex flex-1 flex-col items-center justify-center text-[11px] font-semibold text-muted-foreground', isActive && 'text-brand')}>
          {({ isActive }) => (
            <>
              {isActive && <motion.span layoutId="tabbar-dot" className="absolute top-1.5 h-[30px] w-12 rounded-[15px] bg-brand-tint" />}
              <span className="relative grid h-6 place-items-center"><Icon name={ico} size={21} stroke={isActive ? 2.2 : 1.8} />{to === '/cart' && cartCount > 0 && <b className="absolute -right-2.5 -top-1 grid h-4 min-w-4 place-items-center rounded-lg bg-orange px-1 text-[10px] text-white">{cartCount}</b>}</span>
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

const footH = 'mb-4 text-[17px] text-white max-sm:mb-2.5 max-sm:text-[15px]'
const PayTile = ({ name, bg, art }) => (
  <svg className="block h-10 w-[60px] shrink-0 rounded-[4px] shadow-[0_0_0_1px_rgba(255,255,255,.1)]" viewBox="0 0 60 40" role="img" aria-label={name}><title>{name}</title><rect width="60" height="40" fill={bg} />{art}</svg>
)

export function Footer() {
  const { toast } = useStore()
  const soon = (what) => (e) => { e.preventDefault(); toast(`${what} is coming soon`, { icon: 'Bell' }) }
  return (
    <footer className="tw mt-10 bg-brand-ink pb-7 pt-[52px] text-[#c3cce0] max-md:pb-[90px]">
      <div className={cn(wrap, 'grid grid-cols-[1.25fr_1fr_0.9fr_1.55fr] gap-8 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:gap-x-4 max-sm:gap-y-6')}>
        {FOOTER_LINKS.map(([title, links]) => (
          <div key={title}>
            <h4 className={footH}>{title}</h4>
            {links.map(([label, to]) => <Link key={label} to={to} className="block py-1.5 text-[15px] text-[#c3cce0] transition-colors duration-150 hover:text-white max-sm:py-[5px] max-sm:text-[14px]">{label}</Link>)}
          </div>
        ))}
        <div className="max-lg:col-span-full">
          <h4 className={footH}>Connect with Oja</h4>
          <div className="flex flex-wrap gap-[18px]">
            {SOCIALS.map(([name, glyph]) => (
              <a key={name} href="#" aria-label={name} title={name} onClick={soon(`Oja on ${name}`)} className="text-white opacity-90 transition-[opacity,color] duration-150 hover:text-orange hover:opacity-100">
                <svg className="inline align-baseline" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{glyph}</svg>
              </a>
            ))}
          </div>
          {/* Cargoland warehouse photo on the right, faded into black on the left for the text */}
          <div className="relative mt-[18px] flex min-h-[100px] items-center overflow-hidden rounded-xl border-2 border-white/55 px-[18px] py-3 max-lg:max-w-[560px]"
            style={{ background: `linear-gradient(90deg, #000 0%, #000 38%, rgba(0, 0, 0, .55) 55%, rgba(0, 0, 0, 0) 78%), url(${footerWarehouse}) right 26% / 64% auto no-repeat, #000` }}>
            <p className="max-w-[66%] font-display text-[15.5px] font-bold leading-[1.3] text-white max-lg:max-w-[58%] max-lg:text-[17px] max-xs:max-w-[64%] max-xs:text-[16px]">From Asia, Europe, America to your doorstep, we handle every step.</p>
          </div>
        </div>
      </div>

      <div className={cn(wrap, 'mt-9')}><Logo light tagline className="h-16" /></div>

      <div className={cn(wrap, 'mt-8 grid grid-cols-2 gap-8 max-md:grid-cols-1')}>
        <div>
          <h4 className={footH}>Security certification</h4>
          <div className="flex flex-wrap gap-2.5">{SECURITY.map(([name, bg, art]) => <PayTile key={name} name={name} bg={bg} art={art} />)}</div>
        </div>
        <div>
          <h4 className={footH}>We accept</h4>
          <div className="flex flex-wrap gap-2.5">{PAYMENTS.map(([name, bg, art]) => <PayTile key={name} name={name} bg={bg} art={art} />)}</div>
        </div>
      </div>

      <div className={cn(wrap, 'mt-9 flex flex-wrap items-center justify-center gap-x-[26px] gap-y-2.5 border-t border-white/12 pt-5 text-[14px] max-md:pt-0 max-sm:justify-start max-sm:gap-x-[18px]')}>
        <span>© 2026 Oja by Cargoland</span>
        {['Terms of use', 'Privacy policy', 'Cookie choices'].map((l) => <Link key={l} to="/help" className="text-[#c3cce0] underline underline-offset-3 hover:text-white">{l}</Link>)}
        <span className="w-full text-center text-[12.5px] opacity-55 max-sm:text-left">Prototype build — mock data, no real payments.</span>
      </div>
    </footer>
  )
}
