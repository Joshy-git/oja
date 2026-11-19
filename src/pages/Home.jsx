import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useStore } from '../store/Store'
import { Page, Reveal, Grid, SectionHead, Countdown, wrap } from '../components/common'
import { CATEGORIES, imgUrl, imagesFor } from '../data/catalog'
import { Icon } from '../components/Icon'
import { personalizedFeed, discountPct } from '../lib/commerce'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const HERO_PERKS = [['BadgeCheck', 'Quality', 'products'], ['ShieldCheck', 'Secure', 'checkout'], ['Tag', 'Unbeatable', 'prices'], ['Truck', 'Fast', 'delivery']]
const HERO_CATS = [['House', 'Home', 'essentials', '/search?cat=home'], ['Sparkles', 'Beauty &', 'care', '/search?cat=beauty'], ['Smartphone', 'Electronics &', 'tech', '/search?cat=electronics'], ['ShoppingBag', 'Fashion &', 'accessories', '/search?cat=women'], ['Dumbbell', 'Sports &', 'fitness', '/search?cat=fitness'], ['Plus', 'And much', 'more!', '/search']]
// [productId, placement] floating on the podium
const HERO_PRODUCTS = [
  ['p2', 'bottom-[46px] left-[20%] h-[196px] w-[140px] rotate-[-4deg]'],
  ['p5', 'bottom-[60px] left-[44%] z-1 h-[150px] w-[130px] rotate-[5deg]'],
  ['p1', 'bottom-[22px] left-[6%] z-2 size-[112px] rotate-[-8deg]'],
  ['p14', 'bottom-[112px] right-[4%] size-[132px] rotate-[6deg] max-sm:hidden'],
]

const slide = 'min-w-0 flex-[0_0_100%]'

function DealsSlide({ active }) {
  return (
    <div className={cn(slide, 'relative isolate grid grid-cols-[1fr_1.05fr] grid-rows-[1fr_auto] gap-x-4 bg-[radial-gradient(circle_at_72%_42%,rgba(255,214,150,.55),transparent_38%),linear-gradient(115deg,#ff4f1a_0%,#ff7a2e_52%,#ff5a1f_100%)] px-9 pb-2.5 pt-3.5 text-white max-md:grid-cols-1 max-md:px-6 max-md:pb-4 max-md:pt-6 max-sm:px-4 max-sm:pb-3.5 max-sm:pt-5')} aria-hidden={!active} inert={!active}>
      <div className="absolute inset-0 -z-1 bg-[radial-gradient(rgba(255,255,255,.22)_1.2px,transparent_1.4px)] bg-size-[22px_22px] opacity-50 [mask-image:linear-gradient(90deg,#000,transparent_45%,transparent_60%,#000)]" aria-hidden />
      <div className="flex min-w-0 flex-col items-start gap-[7px]">
        <motion.div className="rounded-full bg-brand px-4 py-[5px] font-display text-[12.5px] font-bold uppercase tracking-[.06em] text-white shadow-[0_6px_16px_rgba(7,22,49,.35)] max-sm:px-3.5 max-sm:py-1.5 max-sm:text-[12px]" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>The best deals in Africa</motion.div>
        <motion.h1 className="flex flex-col leading-[.9]" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <span className="font-display text-[clamp(42px,5vw,58px)] font-extrabold tracking-[-.02em] text-white [text-shadow:0_4px_0_rgba(160,40,0,.35),0_12px_28px_rgba(120,30,0,.35)]">OJA</span>
          <span className="-mt-1 ml-[46px] -rotate-4 font-script text-[clamp(26px,3vw,34px)] font-normal text-[#ffe27a] [text-shadow:0_3px_0_rgba(150,40,0,.35)] max-sm:ml-7">Just for you!</span>
        </motion.h1>
        <motion.ul className="mt-0.5 flex flex-wrap gap-[18px] max-sm:grid max-sm:grid-cols-2 max-sm:gap-x-3 max-sm:gap-y-2.5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {HERO_PERKS.map(([ico, a, b]) => (
            <li key={a} className="flex items-center gap-2 text-[11.5px] font-extrabold uppercase leading-[1.15] tracking-[.02em]">
              <span className="grid size-[30px] shrink-0 place-items-center rounded-full border-2 border-white/90 max-sm:size-[34px]"><Icon name={ico} size={20} /></span>{a}<br />{b}
            </li>
          ))}
        </motion.ul>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Link to="/deals" className="inline-flex items-center gap-3 rounded-full bg-brand py-[5px] pl-2 pr-[18px] shadow-[0_8px_22px_rgba(7,22,49,.35)] transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-brand-2 max-sm:pr-4">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-orange"><Icon name="Heart" size={18} fill="currentColor" /></span>
            <span className="flex flex-col text-[15px] font-bold uppercase leading-[1.2] max-sm:text-[13px]">Shop today's flash deals<b className="font-display text-[17px] font-extrabold text-[#ffe27a] max-sm:text-[15px]">and save more!</b></span>
          </Link>
        </motion.div>
      </div>

      <div className="relative min-h-[270px] [zoom:.66] max-md:mx-auto max-md:mt-2.5 max-md:w-full max-md:max-w-[540px] max-sm:m-0 max-sm:[zoom:.6]" aria-hidden>
        <div className="absolute bottom-10 left-1/2 size-[290px] -translate-x-1/2 rounded-full border-3 border-[rgba(255,236,200,.9)] shadow-[0_0_24px_rgba(255,230,180,.9),inset_0_0_24px_rgba(255,230,180,.6)] [clip-path:inset(0_0_52%_0)] max-sm:hidden" />
        <div className="absolute inset-x-[6%] bottom-1.5 h-16 rounded-[50%] bg-[radial-gradient(ellipse_at_50%_35%,#ff9a52,#e2470f_70%)] shadow-[0_-3px_0_rgba(255,220,170,.9),0_0_30px_rgba(255,210,150,.7),0_18px_30px_rgba(120,30,0,.35)]" />
        {HERO_PRODUCTS.map(([id, place], k) => (
          <motion.img key={id} className={cn('absolute rounded-lg border-4 border-white bg-white object-cover shadow-[0_14px_30px_rgba(110,30,0,.35)]', place)} src={imgUrl(imagesFor(id)[0], 360)} alt="" loading="eager"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: [0, -8, 0] }}
            transition={{ opacity: { delay: 0.15 + k * 0.1 }, y: { repeat: Infinity, duration: 3.5 + k * 0.6, ease: 'easeInOut', delay: k * 0.3 } }} />
        ))}
        <motion.div className="absolute bottom-5 right-[3%] z-2 flex h-[88px] w-[150px] items-center justify-center gap-1.5 rounded-lg border-2 border-white/55 bg-[linear-gradient(160deg,#ff8a3d,#f05a12)] font-display text-[30px] font-extrabold tracking-[-.03em] shadow-[0_14px_28px_rgba(110,30,0,.4)]" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
          <Icon name="ShoppingBag" size={22} />oja
        </motion.div>
      </div>

      <nav className="no-scrollbar col-span-full mt-2 flex justify-between gap-1.5 overflow-x-auto rounded-lg bg-white px-2.5 py-[5px] shadow-[0_6px_18px_rgba(110,30,0,.2)] max-sm:justify-start" aria-label="Popular categories">
        {HERO_CATS.map(([ico, a, b, to]) => (
          <Link key={a + b} to={to} className="flex shrink-0 items-center gap-2 rounded-lg px-2 py-1 text-brand transition-colors duration-150 hover:bg-brand-tint">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-orange text-white"><Icon name={ico} size={17} /></span>
            <em className="text-[11.5px] font-extrabold uppercase not-italic leading-[1.15]">{a}<br />{b}</em>
          </Link>
        ))}
      </nav>
    </div>
  )
}

// Double-date sale campaign (edit SALE to change the event)
const SALE = { day: '10', month: '10', dates: '1 – 12 October 2026' }
const SALE_OFFERS = [['Up to 30% off', 'daily deals'], ['Free delivery', 'on orders over ₦50,000'], ['OJA10', 'extra 10% off first order']]
const SALE_FLOATS = [
  ['Gamepad2', 'left-[7%] top-[12%] max-sm:left-[4%] max-sm:top-[5%]', '#ff3d5a'],
  ['Headphones', 'left-[4%] top-[52%] max-sm:hidden', '#2d56a3'],
  ['ShoppingBag', 'right-[8%] top-[10%] max-sm:right-[4%] max-sm:top-[5%]', '#e0233f'],
  ['Camera', 'right-[4%] top-[46%] max-sm:hidden', '#1b3a75'],
  ['Footprints', 'bottom-[8%] right-[15%] max-sm:bottom-[5%] max-sm:right-[8%]', '#12a36b'],
  ['Watch', 'bottom-[9%] left-[15%] max-sm:bottom-[5%] max-sm:left-[8%]', '#ffb400'],
]
const SALE_COINS = ['left-[24%] top-[8%]', 'right-[25%] top-[6%]', 'bottom-[26%] left-[26%] max-sm:hidden', 'bottom-[30%] right-[27%] max-sm:hidden']

function SaleSlide({ active }) {
  return (
    <div className={cn(slide, 'relative isolate flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_42%,#ffb26b,#ff7a2e_32%,#ff5a1f_68%,#e3400c)] px-5 py-2.5 text-white')} aria-hidden={!active} inert={!active}>
      <div className="absolute -inset-[60%] -z-1 animate-sale-spin bg-[repeating-conic-gradient(from_0deg_at_50%_50%,rgba(255,255,255,.13)_0deg_7deg,transparent_7deg_20deg)]" aria-hidden />
      {SALE_FLOATS.map(([ico, place, color], k) => (
        <motion.span key={ico} className={cn('absolute grid size-[62px] place-items-center rounded-lg bg-white text-(--c) shadow-[0_14px_28px_rgba(120,30,0,.35)] max-sm:size-[50px] max-sm:[&_svg]:size-6', place)} style={{ '--c': color }} aria-hidden
          animate={active ? { y: [0, -10, 0], rotate: [0, k % 2 ? 6 : -6, 0] } : {}} transition={{ repeat: Infinity, duration: 3 + k * 0.4, ease: 'easeInOut' }}>
          <Icon name={ico} size={34} stroke={1.8} />
        </motion.span>
      ))}
      {SALE_COINS.map((place) => <span key={place} className={cn('absolute grid size-[30px] place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff1a8,#ffc93c_60%,#e9a400)] text-[14px] font-extrabold text-[#a46a00] shadow-[0_4px_10px_rgba(120,30,0,.3)]', place)} aria-hidden>₦</span>)}
      <div className="relative w-[240px] rounded-[40px] border-8 border-[#ffc49a] bg-[linear-gradient(180deg,#ff9047,#ff6418)] px-3.5 pb-12 pt-3.5 text-center shadow-[0_24px_50px_rgba(120,30,0,.45),inset_0_0_0_2px_rgba(255,255,255,.25)] max-sm:w-[230px] max-sm:rounded-[32px] max-sm:border-6 max-sm:px-3 max-sm:pb-[58px] max-sm:pt-6">
        <div className="absolute left-1/2 top-2 h-2 w-20 -translate-x-1/2 rounded-[4px] bg-[rgba(120,30,0,.35)]" />
        <div className="inline-flex items-center gap-1.5 font-display text-[18px] font-extrabold tracking-[-.03em]"><Icon name="ShoppingBag" size={18} />oja</div>
        <div className="flex items-center justify-center font-display text-[60px] font-extrabold leading-[.95] tracking-[-.04em] [text-shadow:0_5px_0_var(--color-brand),0_14px_26px_rgba(7,22,49,.35)] max-sm:text-[68px]">{SALE.day}<Icon name="Zap" size={44} fill="currentColor" stroke={0} className="-mx-1 size-9 text-[#ffe27a] drop-shadow-[0_4px_0_var(--color-brand)] max-sm:size-8" />{SALE.month}</div>
        <div className="mt-1 font-display text-[23px] font-extrabold uppercase leading-none [text-shadow:0_3px_0_var(--color-brand)] max-sm:text-[25px]">Super<br />Shopping Day</div>
      </div>
      <Link to="/deals" className="relative z-2 -mt-9 grid grid-cols-[repeat(3,auto)] overflow-hidden rounded-lg border-3 border-white shadow-[0_14px_30px_rgba(7,22,49,.4)] transition-transform duration-150 hover:-translate-y-0.5">
        {SALE_OFFERS.map(([a, b], k) => (
          <span key={a} className={cn('flex flex-col items-center justify-center bg-[linear-gradient(180deg,#2d56a3,#1b3a75)] px-[18px] py-1.5 text-center text-[11.5px] font-semibold uppercase leading-[1.2] max-sm:px-2 max-sm:py-[7px] max-sm:text-[9.5px]', k === 1 && 'bg-[linear-gradient(180deg,#132d5e,var(--color-brand))]')}>
            <b className="font-display text-[16px] font-extrabold text-[#ffe27a] max-sm:text-[13px]">{a}</b>{b}
          </span>
        ))}
      </Link>
      <div className="mt-2 text-[12.5px] font-extrabold uppercase tracking-[.06em] [text-shadow:0_2px_6px_rgba(120,30,0,.35)] max-sm:text-[12px]">{SALE.dates}</div>
    </div>
  )
}

const heroNav = 'absolute top-1/2 z-5 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/92 text-brand opacity-0 shadow-card transition-opacity duration-200 group-hover/hero:opacity-100 max-sm:hidden'

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
    <div className="group/hero relative mt-5 touch-pan-y select-none overflow-hidden rounded-lg shadow-lift" role="region" aria-roledescription="carousel" aria-label="Featured offers"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { swipe.current = null }}
      onClickCapture={(e) => { if (swiped.current) { e.preventDefault(); e.stopPropagation(); swiped.current = false } }}
      onKeyDown={(e) => { if (e.key === 'ArrowRight') go(i + 1); if (e.key === 'ArrowLeft') go(i - 1) }}>
      <div className="flex transition-transform duration-600 ease-[cubic-bezier(.4,.1,.2,1)] motion-reduce:transition-none" style={{ transform: `translateX(-${i * 100}%)` }}>
        {slides.map((S, k) => <S key={k} active={k === i} />)}
      </div>
      <button className={cn(heroNav, 'left-3')} onClick={() => go(i - 1)} aria-label="Previous banner"><Icon name="ArrowLeft" size={18} /></button>
      <button className={cn(heroNav, 'right-3')} onClick={() => go(i + 1)} aria-label="Next banner"><Icon name="ArrowRight" size={18} /></button>
      <div className="absolute right-5 top-4 z-5 flex gap-1.5">
        {slides.map((_, k) => <button key={k} className={cn('h-1.5 w-[22px] rounded-[3px] bg-white/45 transition-[background-color,width] duration-200', k === i && 'w-[34px] bg-white')} onClick={() => go(k)} aria-label={`Show banner ${k + 1}`} aria-current={k === i} />)}
      </div>
    </div>
  )
}

function TrustStrip() {
  const items = [['Stamp', 'Duties included'], ['Lock', 'Secure privacy'], ['CreditCard', 'Safe payments'], ['Truck', 'Delivery guarantee']]
  return (
    <Reveal>
      <Link to="/help" className="group/trust mt-6 flex items-center justify-between gap-4 rounded-lg bg-brand px-5 py-3 text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-brand-2 max-lg:flex-col max-lg:items-start max-lg:gap-2 max-lg:px-4 max-sm:px-3.5 max-sm:text-[14px]">
        <span className="inline-flex items-center gap-2.5 whitespace-nowrap"><Icon name="ShieldCheck" size={20} fill="currentColor" className="fill-white text-brand" />Why choose Oja?</span>
        <span className="no-scrollbar flex min-w-0 items-center overflow-x-auto max-lg:w-full max-md:grid max-md:grid-cols-2 max-md:gap-x-3 max-md:gap-y-2 max-md:overflow-visible">
          {items.map(([ico, label], k) => (
            <span key={label} className={cn('inline-flex items-center gap-2 whitespace-nowrap px-[18px] font-medium max-md:p-0 max-sm:text-[13px]', k === 0 ? 'max-lg:pl-0' : 'border-l-[1.5px] border-white/55 max-md:border-l-0')}>
              <Icon name={ico} size={19} className="text-orange" />{label}
            </span>
          ))}
          <Icon name="ChevronRight" size={18} className="ml-0.5 shrink-0 transition-transform duration-150 group-hover/trust:translate-x-[3px] max-lg:hidden" />
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
  const pick = (id) => { setTab(id); setCount(15) }
  const scrollPills = (dir) => pills.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })
  const tabs = [['rec', 'Recommended'], ...CATEGORIES.map((c) => [c.id, c.name])]
  return (
    <section className="tw mt-10">
      <div className="mb-[18px]">
        <h2 className="text-[20px] font-extrabold uppercase text-brand">Explore your interests</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">{personalised ? 'Based on what you\'ve browsed' : 'Popular across Africa'}</p>
      </div>
      <Tabs value={tab} onValueChange={pick} className="relative mb-[22px] items-center gap-2.5 data-[orientation=horizontal]:flex-row">
        <TabsList ref={pills} className="no-scrollbar h-auto w-auto flex-1 justify-start gap-3 overflow-x-auto scroll-smooth rounded-none bg-transparent p-0.5 text-ink">
          {tabs.map(([id, label]) => (
            <TabsTrigger key={id} value={id} onClick={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })}
              className="h-auto flex-none shrink-0 rounded-full border-[1.5px] border-[#c9cfdb] bg-white px-6 py-3 text-[15px] font-medium text-ink transition-colors duration-150 hover:border-brand hover:text-ink data-[state=active]:border-2 data-[state=active]:border-brand data-[state=active]:bg-brand data-[state=active]:font-semibold data-[state=active]:text-white group-data-[variant=default]/tabs-list:data-[state=active]:shadow-none max-sm:px-4 max-sm:py-[9px] max-sm:text-[14px]">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <button className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-brand shadow-card hover:text-orange max-sm:hidden" onClick={() => scrollPills(1)} aria-label="More categories"><Icon name="ChevronRight" size={18} /></button>
      </Tabs>
      {children /* Flash deals sit between the category pills and the product grid */}
      {products.length ? <Grid products={products.slice(0, count)} layout="five" /> : <p className="my-[1em] text-muted-foreground">No products in this category yet.</p>}
      {count < products.length && (
        <div className="mt-6 flex justify-center"><Button asChild variant="outline"><motion.button whileTap={{ scale: 0.96 }} onClick={() => setCount((n) => n + 15)}>Show more</motion.button></Button></div>
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
    <Page className="tw">
      {/* framer's y transform replaces any CSS transform here, so the glow is anchored at its left edge */}
      <motion.div className="pointer-events-none absolute -top-[120px] left-1/2 -z-1 h-[500px] w-[900px] bg-[radial-gradient(closest-side,rgba(255,122,46,.12),transparent)]" style={{ y: bgY }} aria-hidden />
      <div className={wrap}>
        <Hero />

        <TrustStrip />

        <ExploreInterests feed={feed} live={live} personalised={personalised}>
          <section className="mb-[26px] mt-10 rounded-lg border-[1.5px] border-[#ffe0c7] bg-[linear-gradient(135deg,#fff4ea,#fff)] px-5 pb-[18px] pt-5">
            <SectionHead kicker="Ends tonight" title={<span className="inline-flex items-center gap-1.5"><Icon name="Zap" size={24} className="text-orange" fill="currentColor" /> Flash deals</span>} to="/deals">
              <span className="text-[13px] text-muted-foreground">Ends in</span> <Countdown to={flashEnds} />
            </SectionHead>
            {/* A fixed row, not a scroller; See all opens /deals with every deal. 5 on desktop, 4 when the grid drops to 4 or 2 columns */}
            <Grid products={deals.slice(0, 5)} layout="five" className="max-lg:[&>:nth-child(n+5)]:hidden" />
          </section>
        </ExploreInterests>
      </div>

    </Page>
  )
}
