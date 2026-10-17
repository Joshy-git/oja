import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useStore } from '../store/Store'
import { naira, discountPct } from '../lib/commerce'
import { STOCK, CATEGORIES, PRODUCTS, imgUrl, imagesFor, productById } from '../data/catalog'
import { Icon } from './Icon'

export const spring = { type: 'spring', stiffness: 380, damping: 30 }

export function Page({ children, className = '' }) {
  return (
    <motion.main
      className={`page ${className}`}
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
      className={`art art-${size} ${showImg ? 'has-img' : ''} ${loaded ? 'loaded' : ''} ${className}`}
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

export function Stars({ value, size = 14, showValue = false }) {
  const pct = (value / 5) * 100
  return (
    <span className="stars" style={{ fontSize: size }} aria-label={`${value} out of 5 stars`}>
      <span className="stars-bg">★★★★★</span>
      <span className="stars-fg" style={{ width: `${pct}%` }}>★★★★★</span>
      {showValue && <b className="stars-val">{value.toFixed(1)}</b>}
    </span>
  )
}

export function StockBadge({ stock }) {
  const s = STOCK[stock]
  return <span className={`badge badge-${s.tone}`}>{s.short}</span>
}

export function Price({ p, big = false }) {
  const off = discountPct(p)
  return (
    <div className={`price ${big ? 'price-big' : ''}`}>
      <span className="price-now">{naira(p.price)}</span>
      {p.refPrice && <s className="price-ref">{naira(p.refPrice)}</s>}
      {off > 0 && <span className="price-off">-{off}%</span>}
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

// One line of urgency or reassurance under the price
function urgencyFor(p, off) {
  if (p.stock === 'nigeria' && p.qty > 0 && p.qty <= 120) return { text: `Only ${p.qty} left`, icon: 'Hourglass', tone: 'hot' }
  const hl = highlightFor(p)
  if (hl) return { text: <><span>{hl.label}</span> in {hl.cat}</> }
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

export function ProductCard({ p, i = 0, rank }) {
  const { state, dispatch, toast } = useStore()
  const wished = state.wishlist.includes(p.id)
  const off = discountPct(p)
  const badge = dealBadge(p, off)
  const urgency = urgencyFor(p, off)
  const quickAdd = (e) => {
    e.preventDefault()
    dispatch({ type: 'addToCart', id: p.id, color: p.variants.color?.[0] || null, size: p.variants.size?.[0] || null })
    toast(`Added to cart`, { icon: 'ShoppingCart' })
  }
  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.4, delay: (i % 6) * 0.05 }}
    >
      <Link to={`/p/${p.id}`} className="card-link">
        <div className="card-media">
          <ProductArt p={p} />
          {rank && <span className="card-rank">#{rank}</span>}
          {p.stock === 'oos' && <span className="card-oos">Out of stock</span>}
          {p.stock === 'preorder' && <span className="card-pre">Pre-order</span>}
          <motion.button
            className={`wish ${wished ? 'on' : ''}`}
            whileTap={{ scale: 0.8 }}
            onClick={(e) => { e.preventDefault(); dispatch({ type: 'toggleWish', id: p.id }); toast(wished ? 'Removed from wishlist' : 'Saved to wishlist — we\'ll alert you on price drops', { icon: 'Heart' }) }}
            aria-label="Toggle wishlist"
          >
            <Icon name="Heart" size={16} fill={wished ? 'currentColor' : 'none'} />
          </motion.button>
        </div>
        <div className="card-body">
          <div className="card-title">
            {badge && <span className={`deal-badge db-${badge.tone}`}>{badge.icon && <Icon name={badge.icon} size={11} fill="currentColor" stroke={0} />}{badge.label}</span>}
            {p.title}
          </div>
          <div className="card-buy">
            <div className={`card-price ${badge?.tone === 'clear' ? 'cp-red' : ''}`}>
              {badge?.lastDay && <span className="cp-last">Last day</span>}
              <span className="cp-now">{naira(p.price)}</span>
              {p.refPrice && <s className="cp-ref">{naira(p.refPrice)}</s>}
            </div>
            {p.stock !== 'oos' && (
              <motion.button className="quick-add" whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.06 }} onClick={quickAdd} aria-label="Quick add to cart"><CartIcon /></motion.button>
            )}
          </div>
          {urgency && <div className={`card-hl ${urgency.tone || ''}`}>{urgency.icon && <Icon name={urgency.icon} size={13} fill="currentColor" />}{urgency.text}</div>}
          <div className="card-meta">
            <Stars value={p.rating} size={13} />
            <span className="card-revs"><Icon name="Flame" size={12} className="flame" fill="currentColor" />{soldLabel(p.sold)} sold</span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export function Grid({ products, ranked = false, className = '' }) {
  return (
    <div className={`grid ${className}`}>
      {products.map((p, i) => <ProductCard key={p.id} p={p} i={i} rank={ranked ? i + 1 : undefined} />)}
    </div>
  )
}

export function Rail({ products, ranked }) {
  return (
    <div className="rail">
      {products.map((p, i) => <div className="rail-item" key={p.id}><ProductCard p={p} i={i} rank={ranked ? i + 1 : undefined} /></div>)}
    </div>
  )
}

export function SectionHead({ title, kicker, to, children }) {
  return (
    <div className="sec-head">
      <div>
        {kicker && <div className="kicker">{kicker}</div>}
        <h2>{title}</h2>
      </div>
      <div className="sec-head-r">
        {children}
        {to && <Link to={to} className="see-all">See all <Icon name="ChevronRight" size={16} /></Link>}
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
    <span className="countdown">
      {parts.map((v, i) => (
        <span key={i} className="cd-cell">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={v} initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }} transition={{ duration: 0.22 }}>{v}</motion.span>
          </AnimatePresence>
        </span>
      )).reduce((acc, el, i) => (i ? [...acc, <i key={'s' + i}>:</i>, el] : [el]), [])}
    </span>
  )
}

export function Toasts() {
  const { state, dispatch } = useStore()
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>
        {state.toasts.map((t) => (
          <motion.div key={t.id} layout className="toast" initial={{ opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 60 }} transition={spring} onClick={() => dispatch({ type: 'dismissToast', id: t.id })}>
            {t.icon && <span className="toast-ico"><Icon name={t.icon} size={16} /></span>}
            <span>{t.msg}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function Tabs({ tabs, value, onChange, id = 'tabs' }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} className={`tab ${value === t.value ? 'on' : ''}`} onClick={() => onChange(t.value)}>
          {value === t.value && <motion.span layoutId={`${id}-pill`} className="tab-pill" transition={spring} />}
          <span className="tab-label">{t.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Empty({ icon, title, body, action }) {
  return (
    <motion.div className="empty" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
      <motion.div className="empty-ico" animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}><Icon name={icon} size={38} stroke={1.6} /></motion.div>
      <h3>{title}</h3>
      {body && <p className="muted">{body}</p>}
      {action}
    </motion.div>
  )
}
