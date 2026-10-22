import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useStore } from '../store/Store'
import { Page, Reveal, Grid, Rail, SectionHead, Countdown } from '../components/ui'
import { CATEGORIES, imgUrl, imagesFor } from '../data/catalog'
import { Icon } from '../components/Icon'
import { personalizedFeed, discountPct } from '../lib/commerce'

const HERO_PERKS = [['BadgeCheck', 'Quality', 'products'], ['ShieldCheck', 'Secure', 'checkout'], ['Tag', 'Unbeatable', 'prices'], ['Truck', 'Fast', 'delivery']]
const HERO_CATS = [['House', 'Home', 'essentials', '/search?cat=home'], ['Sparkles', 'Beauty &', 'care', '/search?cat=beauty'], ['Smartphone', 'Electronics &', 'tech', '/search?cat=electronics'], ['ShoppingBag', 'Fashion &', 'accessories', '/search?cat=women'], ['Dumbbell', 'Sports &', 'fitness', '/search?cat=fitness'], ['Plus', 'And much', 'more!', '/search']]
// [productId, className] floating on the podium
const HERO_PRODUCTS = [['p2', 'hp-tall'], ['p5', 'hp-watch'], ['p1', 'hp-buds'], ['p14', 'hp-bag']]

function DealsSlide({ active }) {
  return (
    <div className={`hero-slide hero-main ${active ? 'on' : ''}`} aria-hidden={!active} inert={!active}>
      <div className="hero-glow" aria-hidden />
      <div className="hero-copy">
        <motion.div className="hero-pill" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>The best deals in Africa</motion.div>
        <motion.h1 initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <span className="hero-brand">OJA</span>
          <span className="hero-script">Just for you!</span>
        </motion.h1>
        <motion.ul className="hero-perks" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {HERO_PERKS.map(([ico, a, b]) => <li key={a}><span><Icon name={ico} size={20} /></span>{a}<br />{b}</li>)}
        </motion.ul>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Link to="/deals" className="hero-cta">
            <span className="hero-cta-ico"><Icon name="Heart" size={18} fill="currentColor" /></span>
            <span>Shop today's flash deals<b>and save more!</b></span>
          </Link>
        </motion.div>
      </div>

      <div className="hero-art" aria-hidden>
        <div className="hero-ring" />
        <div className="hero-podium" />
        {HERO_PRODUCTS.map(([id, cls], k) => (
          <motion.img key={id} className={`hero-prod ${cls}`} src={imgUrl(imagesFor(id)[0], 360)} alt="" loading="eager"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: [0, -8, 0] }}
            transition={{ opacity: { delay: 0.15 + k * 0.1 }, y: { repeat: Infinity, duration: 3.5 + k * 0.6, ease: 'easeInOut', delay: k * 0.3 } }} />
        ))}
        <motion.div className="hero-box" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
          <Icon name="ShoppingBag" size={22} />oja
        </motion.div>
      </div>

      <nav className="hero-cats" aria-label="Popular categories">
        {HERO_CATS.map(([ico, a, b, to]) => (
          <Link key={a + b} to={to}><span><Icon name={ico} size={17} /></span><em>{a}<br />{b}</em></Link>
        ))}
      </nav>
    </div>
  )
}

// Double-date sale campaign (edit SALE to change the event)
const SALE = { day: '10', month: '10', dates: '1 – 12 October 2026' }
const SALE_OFFERS = [['Up to 30% off', 'daily deals'], ['Free delivery', 'on orders over ₦50,000'], ['OJA10', 'extra 10% off first order']]
const SALE_FLOATS = [['Gamepad2', 'sf-1', '#ff3d5a'], ['Headphones', 'sf-2', '#2d56a3'], ['ShoppingBag', 'sf-3', '#e0233f'], ['Camera', 'sf-4', '#1b3a75'], ['Footprints', 'sf-5', '#12a36b'], ['Watch', 'sf-6', '#ffb400']]

function SaleSlide({ active }) {
  return (
    <div className={`hero-slide hero-sale ${active ? 'on' : ''}`} aria-hidden={!active} inert={!active}>
      <div className="sale-rays" aria-hidden />
      {SALE_FLOATS.map(([ico, cls, color], k) => (
        <motion.span key={cls} className={`sale-float ${cls}`} style={{ '--c': color }} aria-hidden
          animate={active ? { y: [0, -10, 0], rotate: [0, k % 2 ? 6 : -6, 0] } : {}} transition={{ repeat: Infinity, duration: 3 + k * 0.4, ease: 'easeInOut' }}>
          <Icon name={ico} size={34} stroke={1.8} />
        </motion.span>
      ))}
      {['c1', 'c2', 'c3', 'c4'].map((c) => <span key={c} className={`sale-coin ${c}`} aria-hidden>₦</span>)}
      <div className="sale-phone">
        <div className="sale-notch" />
        <div className="sale-logo"><Icon name="ShoppingBag" size={18} />oja</div>
        <div className="sale-date-big">{SALE.day}<Icon name="Zap" size={44} fill="currentColor" stroke={0} className="sale-bolt" />{SALE.month}</div>
        <div className="sale-title">Super<br />Shopping Day</div>
      </div>
      <Link to="/deals" className="sale-ribbon">
        {SALE_OFFERS.map(([a, b]) => <span key={a}><b>{a}</b>{b}</span>)}
      </Link>
      <div className="sale-dates">{SALE.dates}</div>
    </div>
  )
}

function Hero() {
  const slides = [DealsSlide, SaleSlide]
  const n = slides.length
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const swipe = useRef(null)
  const swiped = useRef(false)
  const go = (k) => setI(((k % n) + n) % n)
  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setI((x) => (x + 1) % n), 6000)
    return () => clearInterval(t)
  }, [paused, n])
  // Swipe / drag to change slide
  const onPointerDown = (e) => { swiped.current = false; swipe.current = { x: e.clientX, y: e.clientY } }
  const onPointerUp = (e) => {
    const s = swipe.current
    swipe.current = null
    if (!s) return
    const dx = e.clientX - s.x
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y)) { swiped.current = true; go(dx < 0 ? i + 1 : i - 1) }
  }
  return (
    <div className="hero" role="region" aria-roledescription="carousel" aria-label="Featured offers"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { swipe.current = null }}
      onClickCapture={(e) => { if (swiped.current) { e.preventDefault(); e.stopPropagation(); swiped.current = false } }}
      onKeyDown={(e) => { if (e.key === 'ArrowRight') go(i + 1); if (e.key === 'ArrowLeft') go(i - 1) }}>
      <div className="hero-track" style={{ transform: `translateX(-${i * 100}%)` }}>
        {slides.map((S, k) => <S key={k} active={k === i} />)}
      </div>
      <button className="hero-nav prev" onClick={() => go(i - 1)} aria-label="Previous banner"><Icon name="ArrowLeft" size={18} /></button>
      <button className="hero-nav next" onClick={() => go(i + 1)} aria-label="Next banner"><Icon name="ArrowRight" size={18} /></button>
      <div className="hero-dots">
        {slides.map((_, k) => <button key={k} className={`hero-dot ${k === i ? 'on' : ''}`} onClick={() => go(k)} aria-label={`Show banner ${k + 1}`} aria-current={k === i} />)}
      </div>
    </div>
  )
}

function TrustStrip() {
  const items = [['Stamp', 'Duties included'], ['Lock', 'Secure privacy'], ['CreditCard', 'Safe payments'], ['Truck', 'Delivery guarantee']]
  return (
    <Reveal>
      <Link to="/help" className="trust">
        <span className="trust-title"><Icon name="ShieldCheck" size={20} fill="currentColor" className="trust-shield" />Why choose Oja?</span>
        <span className="trust-items">
          {items.map(([ico, label]) => <span key={label} className="trust-item"><Icon name={ico} size={19} />{label}</span>)}
          <Icon name="ChevronRight" size={18} className="trust-arrow" />
        </span>
      </Link>
    </Reveal>
  )
}

// "Oja Week" product feed: left-aligned heading, category pills, 5-up grid
function ExploreInterests({ feed, live, personalised, children }) {
  const [tab, setTab] = useState('rec')
  const [count, setCount] = useState(15)
  const pills = useRef(null)
  const products = useMemo(() => (tab === 'rec' ? feed : live.filter((p) => p.category === tab).sort((a, b) => b.sold - a.sold)), [tab, feed, live])
  const pick = (id, el) => { setTab(id); setCount(15); el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' }) }
  const scrollPills = (dir) => pills.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })
  const tabs = [['rec', 'Recommended'], ...CATEGORIES.map((c) => [c.id, c.name])]
  return (
    <section className="explore">
      <div className="explore-head">
        <h2>Explore your interests</h2>
        <p className="muted small">{personalised ? 'Based on what you\'ve browsed' : 'Popular across Africa'}</p>
      </div>
      <div className="pill-bar">
        <div className="pills" ref={pills} role="tablist">
          {tabs.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={`pill ${tab === id ? 'on' : ''}`} onClick={(e) => pick(id, e.currentTarget)}>{label}</button>
          ))}
        </div>
        <button className="pill-arrow" onClick={() => scrollPills(1)} aria-label="More categories"><Icon name="ChevronRight" size={18} /></button>
      </div>
      {children /* Flash deals sit between the category pills and the product grid */}
      {products.length ? <Grid products={products.slice(0, count)} className="grid-5" /> : <p className="muted">No products in this category yet.</p>}
      {count < products.length && (
        <div className="center"><motion.button whileTap={{ scale: 0.96 }} className="btn btn-ghost" onClick={() => setCount((n) => n + 15)}>Show more</motion.button></div>
      )}
    </section>
  )
}

export default function Home() {
  const { state, live, getProduct } = useStore()
  const flashEnds = useMemo(() => { const d = new Date(); d.setHours(23, 59, 59, 0); return d.getTime() }, [])

  const deals = useMemo(() => live.filter((p) => discountPct(p) >= 20 && p.stock !== 'oos').sort((a, b) => discountPct(b) - discountPct(a)), [live])
  const feed = useMemo(() => {
    const ids = personalizedFeed({ viewed: state.viewed, cart: state.cart.map((l) => l.id), purchased: state.orders.flatMap((o) => o.items.map((i) => i.id)), searches: state.searches }).map((p) => p.id)
    return ids.map(getProduct).filter((p) => p?.published)
  }, [state.viewed, state.cart, state.orders, state.searches, getProduct])
  const personalised = state.viewed.length + state.searches.length + state.cart.length > 0

  const { scrollY } = useScroll()
  const bgY = useTransform(scrollY, [0, 600], [0, 80])

  return (
    <Page>
      <motion.div className="home-glow" style={{ y: bgY }} aria-hidden />
      <div className="wrap">
        <Hero />

        <TrustStrip />

        <ExploreInterests feed={feed} live={live} personalised={personalised}>
          <section className="flash flash-in-explore">
            <SectionHead kicker="Ends tonight" title={<span className="row-ico"><Icon name="Zap" size={24} className="accent" fill="currentColor" /> Flash deals</span>} to="/deals">
              <span className="muted small">Ends in</span> <Countdown to={flashEnds} />
            </SectionHead>
            <Rail products={deals.slice(0, 10)} />
          </section>
        </ExploreInterests>
      </div>

    </Page>
  )
}
