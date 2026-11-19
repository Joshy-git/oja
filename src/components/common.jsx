import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useStore } from '../store/Store'
import { naira, discountPct } from '../lib/commerce'
import { STOCK, CATEGORIES, PRODUCTS, imgUrl, imagesFor, productById } from '../data/catalog'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Tabs as TabsRoot, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Icon } from './Icon'

// Shared layout classes
export const wrap = 'mx-auto max-w-[1280px] px-5 max-md:px-4'
export const linkCls = 'font-semibold text-brand underline decoration-[rgba(11,32,69,.3)] underline-offset-3'
// Small filter / search chips (as they render today: 11px, squared)
export const chipCls = 'rounded-[5px] border-[1.5px] border-line bg-white px-[7px] py-px text-[11px] font-semibold not-italic transition-all duration-150 hover:border-brand'
export const chipOn = 'border-brand bg-brand text-white'
// Formatted text written in the dashboard's rich text editor (product descriptions)
export const richText = '[&_a]:text-brand [&_a]:underline [&_blockquote]:my-2 [&_blockquote]:border-l-3 [&_blockquote]:border-orange [&_blockquote]:pl-3 [&_blockquote]:text-ink-2 [&_ol]:my-[1em] [&_ol]:list-decimal [&_ol]:pl-10 [&_p]:my-[1em] [&_ul]:my-[1em] [&_ul]:list-disc [&_ul]:pl-10'

export const spring = { type: 'spring', stiffness: 380, damping: 30 }

export function Page({ children, className = '' }) {
  return (
    <motion.main
      className={cn('relative min-h-[70vh] overflow-x-clip pb-[60px] max-md:pb-[140px]', className)}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.main>
  )
}

export function Reveal({ children, delay = 0, y = 18, className, as = 'div' }) {
  const C = motion[as]
  return (
    <C className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.45, delay, ease: [0.2, 0.7, 0.2, 1] }}>
      {children}
    </C>
  )
}

const IMG_W = { xs: 120, sm: 200, md: 480, xl: 1000 }

// Product photo with a category-icon tile fallback if the image is missing or fails to load
export function ProductArt({ p, size = 'md', index = 0, layoutId, className = '' }) {
  const images = p.images || imagesFor(p.id)
  const catIcon = CATEGORIES.find((c) => c.id === (p.category || productById(p.id)?.category))?.icon || 'Package'
  const key = images[index % (images.length || 1)]
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const showImg = key && !failed
  return (
    <motion.div
      layoutId={layoutId}
      className={cn(`art art-${size}`, showImg && 'has-img', loaded && 'loaded', className)}
      style={{ '--h': p.hue }}
    >
      {showImg ? (
        <img
          src={imgUrl(key, IMG_W[size])}
          srcSet={`${imgUrl(key, IMG_W[size])} 1x, ${imgUrl(key, IMG_W[size] * 2)} 2x`}
          alt={p.title}
          loading={size === 'xl' ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="art-icon"><Icon name={catIcon} size={ART_ICON[size]} stroke={1.5} /></span>
      )}
    </motion.div>
  )
}
const ART_ICON = { xs: 20, sm: 30, md: 56, xl: 120 }

export function Stars({ value, size = 14, showValue = false, className, fgClassName }) {
  const pct = (value / 5) * 100
  return (
    <span className={cn('relative inline-flex items-center gap-1 align-middle leading-none tracking-[1px]', className)} style={{ fontSize: size }} aria-label={`${value} out of 5 stars`}>
      <span className="text-[#dde1e9]">★★★★★</span>
      <span className={cn('absolute left-0 top-0 overflow-hidden whitespace-nowrap text-[#ffb400]', fgClassName)} style={{ width: `${pct}%` }}>★★★★★</span>
      {showValue && <b className="ml-1 text-[14px] tracking-normal">{value.toFixed(1)}</b>}
    </span>
  )
}

export function StockBadge({ stock, className }) {
  const s = STOCK[stock]
  return <Badge variant={s.tone} className={className}>{s.short}</Badge>
}

export function Price({ p, big = false }) {
  const off = discountPct(p)
  return (
    <div className="flex flex-wrap items-baseline gap-1.5">
      <span className={cn('font-display text-[17px] font-extrabold', big && 'text-[32px] text-orange')}>{naira(p.price)}</span>
      {p.refPrice && <s className={cn('text-[12.5px] text-muted-foreground', big && 'text-[16px]')}>{naira(p.refPrice)}</s>}
      {off > 0 && <span className={cn('text-[12.5px] font-bold text-orange', big && 'rounded-[6px] bg-[#fff0e5] px-2 py-0.5 text-[14px]')}>-{off}%</span>}
    </div>
  )
}

const soldLabel = (n) => (n >= 1000 ? `${Math.floor(n / 1000)}K+` : n)

// Merchandising highlights: best seller and top rated within each category
const BEST_IN_CAT = new Set(CATEGORIES.map((c) => [...PRODUCTS].filter((p) => p.category === c.id).sort((a, b) => b.sold - a.sold)[0]?.id))
function highlightFor(p) {
  const cat = CATEGORIES.find((c) => c.id === p.category)?.name
  if (BEST_IN_CAT.has(p.id)) return { label: 'Best-Selling Item', cat }
  if (p.rating >= 4.7 && p.reviews >= 300) return { label: 'Top Rated', cat }
  return null
}

// Campaign badge shown before the title (mirrors the "Oja Week" promotion)
const RECENT_MS = 30 * 24 * 3600 * 1000
function dealBadge(p, off) {
  if (off >= 30) return { label: 'Clearance deal', tone: 'clear', icon: 'Tag', lastDay: true }
  if (off >= 20) return { label: 'Lightning deal', tone: 'lightning', icon: 'Zap', lastDay: true }
  if (Date.now() - p.createdAt < RECENT_MS || off > 0) return { label: 'Oja Week', tone: 'week', lastDay: off > 0 }
  return null
}
const DEAL_TONE = { clear: 'bg-bad uppercase font-extrabold', lightning: 'bg-orange uppercase font-extrabold', week: 'bg-brand font-bold' }

// One line of urgency or reassurance under the price
function urgencyFor(p, off) {
  if (p.stock === 'nigeria' && p.qty > 0 && p.qty <= 120) return { text: `Only ${p.qty} left`, icon: 'Hourglass', tone: 'hot' }
  const hl = highlightFor(p)
  if (hl) return { text: <><span className="font-medium text-orange">{hl.label}</span> in {hl.cat}</> }
  if (off > 0 && p.rating >= 4.5) return { text: 'Lowest for similar items', tone: 'hot' }
  return null
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.5 3.5h2.2l2.1 11.2a1.6 1.6 0 0 0 1.6 1.3h8.7a1.6 1.6 0 0 0 1.6-1.2l1.5-6.8H6" />
      <circle cx="9.5" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" />
      <path d="M13 7.6v4.8M10.6 10h4.8" />
    </svg>
  )
}

export function ProductCard({ p, i = 0, rank, className }) {
  const { state, dispatch, toast } = useStore()
  const wished = state.wishlist.includes(p.id)
  const off = discountPct(p)
  const badge = dealBadge(p, off)
  const urgency = urgencyFor(p, off)
  const red = badge?.tone === 'clear'
  const quickAdd = (e) => {
    e.preventDefault()
    dispatch({ type: 'addToCart', id: p.id, color: p.variants.color?.[0] || null, size: p.variants.size?.[0] || null })
    toast(`Added to cart`, { icon: 'ShoppingCart' })
  }
  return (
    <motion.div
      className={cn('tw group/card h-full', className)}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.4, delay: (i % 6) * 0.05 }}
    >
      <Link to={`/p/${p.id}`} className="flex h-full flex-col">
        <div className="relative overflow-hidden rounded-[6px]">
          <ProductArt p={p} className="rounded-[6px] transition-transform duration-350 ease-[ease] group-hover/card:scale-104" />
          {rank && <span className="absolute left-2 top-2 rounded-[6px] bg-brand px-2 py-px font-display text-[13px] font-extrabold text-white">#{rank}</span>}
          {p.stock === 'oos' && <span className="absolute inset-x-0 bottom-0 bg-[rgba(11,22,45,.72)] p-[5px] text-center text-[12px] font-semibold text-white">Out of stock</span>}
          {p.stock === 'preorder' && <span className="absolute inset-x-0 bottom-0 bg-[rgba(11,32,69,.85)] p-[5px] text-center text-[12px] font-semibold text-white">Pre-order</span>}
          <motion.button
            className={cn('absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white/92 text-bad opacity-0 shadow-card transition-opacity duration-200 group-hover/card:opacity-100 touch:opacity-100', wished && 'opacity-100')}
            whileTap={{ scale: 0.8 }}
            onClick={(e) => { e.preventDefault(); dispatch({ type: 'toggleWish', id: p.id }); toast(wished ? 'Removed from wishlist' : 'Saved to wishlist — we\'ll alert you on price drops', { icon: 'Heart' }) }}
            aria-label="Toggle wishlist"
          >
            <Icon name="Heart" size={16} fill={wished ? 'currentColor' : 'none'} />
          </motion.button>
        </div>
        <div className="flex flex-1 flex-col gap-1 pt-2">
          <div className="truncate text-[13.5px] leading-[1.35] text-ink group-hover/card:text-brand">
            {badge && <span className={cn('mr-[5px] inline-flex items-center gap-[3px] rounded-[3px] px-1.5 py-px align-[1px] text-[11.5px] tracking-[.02em] text-white', DEAL_TONE[badge.tone])}>{badge.icon && <Icon name={badge.icon} size={11} fill="currentColor" stroke={0} />}{badge.label}</span>}
            {p.title}
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-baseline gap-1 overflow-hidden whitespace-nowrap max-sm:flex-wrap max-sm:gap-y-0">
              {badge?.lastDay && <span className={cn('shrink-0 text-[14px] font-semibold text-orange', red && 'text-bad')}>Last day</span>}
              <span className={cn('shrink-0 font-display text-[18px] font-extrabold tracking-[-.01em] text-orange max-sm:text-[17px]', red && 'text-bad')}>{naira(p.price)}</span>
              {p.refPrice && <s className="shrink-0 text-[12px] text-muted-foreground">{naira(p.refPrice)}</s>}
            </div>
            {p.stock !== 'oos' && (
              <motion.button className="grid h-[30px] w-[38px] shrink-0 place-items-center rounded-full border-[1.5px] border-ink bg-white text-ink transition-colors duration-150 hover:border-brand hover:bg-brand hover:text-white max-sm:h-7 max-sm:w-[34px]" whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.06 }} onClick={quickAdd} aria-label="Quick add to cart"><CartIcon /></motion.button>
            )}
          </div>
          {urgency && <div className={cn('flex items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-ink-2', urgency.tone === 'hot' && 'font-medium text-orange')}>{urgency.icon && <Icon name={urgency.icon} size={13} fill="currentColor" />}{urgency.text}</div>}
          <div className="flex items-center gap-1.5 text-[12.5px]">
            <Stars value={p.rating} size={13} fgClassName="text-ink" />
            <span className="inline-flex items-center gap-0.5 text-ink-2"><Icon name="Flame" size={12} className="text-orange" fill="currentColor" />{soldLabel(p.sold)} sold</span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

// layout: 'auto' fills the row with ~215px cards; 'five' is the home feed's fixed 5-up grid
export const GRID = {
  auto: 'grid grid-cols-[repeat(auto-fill,minmax(215px,1fr))] gap-x-5 gap-y-[26px] max-sm:grid-cols-2 max-sm:gap-x-3 max-sm:gap-y-5',
  five: 'grid grid-cols-5 gap-x-5 gap-y-[30px] max-lg:grid-cols-4 max-md:grid-cols-3 max-sm:grid-cols-2 max-sm:gap-x-3 max-sm:gap-y-5',
}
const CARD = { five: '-m-2 rounded-lg p-2 transition-[background,box-shadow] duration-200 hover:bg-white hover:shadow-lift max-sm:m-0 max-sm:p-0 max-sm:hover:bg-transparent max-sm:hover:shadow-none' }

export function Grid({ products, ranked = false, layout = 'auto', className = '' }) {
  return (
    <div className={cn(GRID[layout], className)}>
      {products.map((p, i) => <ProductCard key={p.id} p={p} i={i} rank={ranked ? i + 1 : undefined} className={CARD[layout]} />)}
    </div>
  )
}

export function Rail({ products, ranked }) {
  return (
    <div className="-mx-1 grid snap-x snap-proximity auto-cols-[236px] grid-flow-col gap-4 overflow-x-auto px-1 pb-3.5 pt-1 [scrollbar-width:thin] max-sm:auto-cols-[46%] max-sm:gap-2.5">
      {products.map((p, i) => <div className="snap-start" key={p.id}><ProductCard p={p} i={i} rank={ranked ? i + 1 : undefined} /></div>)}
    </div>
  )
}

export const kicker = 'mb-1 text-[12px] font-bold uppercase tracking-[.08em] text-orange'

export function SectionHead({ title, kicker: k, to, children }) {
  return (
    <div className="tw mb-3.5 flex items-end justify-between gap-3 max-sm:flex-wrap max-sm:items-start">
      <div>
        {k && <div className={kicker}>{k}</div>}
        <h2>{title}</h2>
      </div>
      <div className="flex items-center gap-2.5">
        {children}
        {to && <Link to={to} className="inline-flex items-center gap-0.5 whitespace-nowrap text-[14px] font-semibold text-brand">See all <Icon name="ChevronRight" size={16} /></Link>}
      </div>
    </div>
  )
}

export function Countdown({ to }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  const d = Math.max(0, to - now)
  const parts = [Math.floor(d / 3600000), Math.floor((d % 3600000) / 60000), Math.floor((d % 60000) / 1000)].map((n) => String(n).padStart(2, '0'))
  return (
    <span className="inline-flex items-center gap-[3px] font-display font-bold">
      {parts.map((v, i) => (
        <span key={i} className="relative grid h-7 w-[30px] place-items-center overflow-hidden rounded-[6px] bg-ink text-[15px] text-white">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={v} initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }} transition={{ duration: 0.22 }}>{v}</motion.span>
          </AnimatePresence>
        </span>
      )).reduce((acc, el, i) => (i ? [...acc, <i key={'s' + i} className="not-italic text-orange">:</i>, el] : [el]), [])}
    </span>
  )
}

// Pill tabs with a sliding highlight (shadcn/ui Tabs underneath; panels are rendered by the caller)
export function Tabs({ tabs, value, onChange, id = 'tabs' }) {
  return (
    <TabsRoot value={value} onValueChange={onChange} className="inline-flex data-[orientation=horizontal]:flex-row">
      <TabsList className="h-auto flex-wrap justify-start gap-0.5 rounded-full bg-white p-1 text-ink-2 shadow-card">
        {tabs.map((t) => (
          <TabsTrigger key={t.value} value={t.value}
            className="h-auto flex-none rounded-full border-0 px-4 py-2 text-[14px] font-semibold text-ink-2 hover:text-ink-2 data-[state=active]:bg-transparent data-[state=active]:text-white group-data-[variant=default]/tabs-list:data-[state=active]:shadow-none">
            {value === t.value && <motion.span layoutId={`${id}-pill`} className="absolute inset-0 rounded-full bg-brand" transition={spring} />}
            <span className="relative z-1">{t.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </TabsRoot>
  )
}

export function Empty({ icon, title, body, action }) {
  return (
    <motion.div className="tw flex flex-col items-center gap-2.5 px-5 py-[60px] text-center" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
      <motion.div className="mb-1.5 grid size-[84px] place-items-center rounded-full bg-brand-tint text-brand" animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}><Icon name={icon} size={38} stroke={1.6} /></motion.div>
      <h3>{title}</h3>
      {body && <p className="mb-2 max-w-[420px] text-muted-foreground">{body}</p>}
      {action}
    </motion.div>
  )
}
