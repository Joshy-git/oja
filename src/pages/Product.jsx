import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/Store'
import { Page, ProductArt, Stars, Price, Rail, SectionHead, Tabs, Empty, wrap, linkCls, chipCls, chipOn, richText } from '../components/common'
import { CATEGORIES, STOCK, reviewsFor } from '../data/catalog'
import { Icon } from '../components/Icon'
import { sanitizeHtml } from '../lib/sanitize'
import { naira, windowLabel, relatedProducts, frequentlyBoughtTogether, FREE_SHIP_THRESHOLD, SHIP_FEE, discountPct } from '../lib/commerce'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'

const rowIco = 'inline-flex items-center gap-1.5'
const card = 'rounded-lg bg-white shadow-card'
const TONE_TEXT = { good: 'text-good', info: 'text-info', warn: 'text-warn', bad: 'text-bad' }

function Gallery({ p }) {
  const views = p.images?.length ? p.images.map((_, k) => k) : [0]
  const [v, setV] = useState(0)
  useEffect(() => setV(0), [p.id])
  return (
    <div className="sticky top-[160px] grid grid-cols-[84px_1fr] gap-3 max-md:static max-md:grid-cols-1">
      <div className="flex flex-col gap-2.5 max-md:order-2 max-md:flex-row">
        {views.map((k) => (
          <button key={k} className={cn('rounded-lg border-2 border-transparent transition-colors duration-150', v === k && 'border-brand')} onClick={() => setV(k)} onMouseEnter={() => setV(k)} aria-label={`View photo ${k + 1}`} aria-current={v === k}>
            <ProductArt p={p} size="sm" index={k} className="max-md:w-16" />
          </button>
        ))}
      </div>
      <div className={cn(card, 'relative bg-transparent')}>
        <AnimatePresence mode="wait">
          <motion.div key={p.id + v} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
            <ProductArt p={p} size="xl" index={v} />
          </motion.div>
        </AnimatePresence>
        {discountPct(p) > 0 && <span className="absolute left-4 top-4 rounded-[6px] bg-orange px-3 py-1 text-[15px] font-bold text-white">-{discountPct(p)}%</span>}
      </div>
    </div>
  )
}

function Reviews({ p }) {
  const all = useMemo(() => reviewsFor(p), [p])
  const [filter, setFilter] = useState('all')
  const [helped, setHelped] = useState({})
  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, pct: s === 5 ? 68 : s === 4 ? 21 : s === 3 ? 7 : s === 2 ? 2 : 2 }))
  const shown = all.filter((r) => filter === 'all' || (filter === 'photos' ? r.photos : filter === 'repeat' ? r.repeat : r.stars === Number(filter)))
  const deliveryScore = (all.reduce((s, r) => s + r.delivery, 0) / all.length).toFixed(1)
  return (
    <section className="mt-10">
      <SectionHead title="Customer reviews" kicker="Verified purchases only" />
      <div className={cn(card, 'grid grid-cols-[180px_1fr_220px] items-center gap-6 p-[22px] max-lg:grid-cols-[150px_1fr] max-sm:grid-cols-1')}>
        <div className="flex flex-col gap-1">
          <div className="font-display text-[48px] font-extrabold leading-none">{p.rating.toFixed(1)}</div>
          <Stars value={p.rating} size={18} />
          <div className="text-[13px] text-muted-foreground">{p.reviews.toLocaleString()} product ratings</div>
        </div>
        <div className="flex flex-col gap-1.5">
          {dist.map(({ s, pct }) => (
            <button key={s} className="grid grid-cols-[30px_1fr_40px] items-center gap-2.5 text-[13px]" onClick={() => setFilter(String(s))}>
              <span className={rowIco}>{s}<Icon name="Star" size={11} fill="currentColor" /></span>
              <span className="block h-2 overflow-hidden rounded-[4px] bg-background"><motion.span className="block h-full rounded-[4px] bg-[linear-gradient(90deg,var(--color-orange),var(--color-sun))]" initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }} transition={{ duration: 0.8, delay: (5 - s) * 0.08 }} /></span>
              <span className="text-[13px] text-muted-foreground">{pct}%</span>
            </button>
          ))}
        </div>
        <div className="border-l border-line pl-5 max-lg:col-span-2 max-lg:border-l-0 max-lg:border-t max-lg:pl-0 max-lg:pt-3.5 max-sm:col-span-1">
          <div className="text-[13px] text-muted-foreground">Delivery experience</div>
          <div className={cn(rowIco, 'font-display text-[24px] font-extrabold')}><Icon name="Truck" size={22} className="text-brand" /> {deliveryScore}/5</div>
          <p className="mt-1 text-[13px] text-muted-foreground">Rated separately so you can tell product quality apart from delivery.</p>
        </div>
      </div>
      <div className="my-4 flex flex-wrap gap-2">
        {[['all', 'All'], ['photos', 'With photos', 'Camera'], ['repeat', 'Repeat buyers', 'Repeat'], ['5', '5', 'Star'], ['4', '4', 'Star'], ['3', '3', 'Star']].map(([k, l, ico]) => (
          <button key={k} className={cn(chipCls, 'inline-flex items-center gap-1', filter === k && chipOn)} aria-pressed={filter === k} onClick={() => setFilter(k)}>{ico === 'Star' ? <>{l}<Icon name="Star" size={12} fill="currentColor" /></> : <>{ico && <Icon name={ico} size={13} />}{l}</>}</button>
        ))}
      </div>
      <motion.div layout className="flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {shown.length === 0 && <motion.p key="none" className="my-[1em] text-muted-foreground" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>No reviews match this filter yet.</motion.p>}
          {shown.map((r) => (
            <motion.article layout key={r.id} className={cn(card, 'px-[18px] py-4')} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand font-bold text-white">{r.name[0]}</span>
                <div><b>{r.name}</b> <span className="text-[13px] text-muted-foreground">· {r.city}</span><div className="text-[13px]"><Stars value={r.stars} size={12} /> <Badge variant="good"><Icon name="BadgeCheck" size={12} /> Verified purchase</Badge>{r.repeat && <Badge variant="info">Repeat buyer</Badge>}</div></div>
                <span className="ml-auto text-[13px] text-muted-foreground">{new Date(r.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span>
              </div>
              <h4 className="mb-1 mt-2.5">{r.title}</h4>
              <p className="mb-1.5 text-ink-2">{r.body}</p>
              {r.variant && <div className="text-[13px] text-muted-foreground">Variant: {r.variant}</div>}
              {r.photos > 0 && <div className="my-2 flex gap-2">{Array.from({ length: r.photos }).map((_, k) => <ProductArt key={k} p={p} size="xs" index={k + 1} />)}</div>}
              <motion.button whileTap={{ scale: 0.92 }} className={cn('mt-2 rounded-full border-[1.5px] border-line px-3 py-1 text-[13px]', helped[r.id] && 'border-good bg-good-tint text-good')} aria-pressed={!!helped[r.id]} onClick={() => setHelped((h) => ({ ...h, [r.id]: !h[r.id] }))}><Icon name="ThumbsUp" size={13} fill={helped[r.id] ? 'currentColor' : 'none'} /> Helpful ({r.helpful + (helped[r.id] ? 1 : 0)})</motion.button>
            </motion.article>
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  )
}

function Bundle({ p }) {
  const { dispatch, toast } = useStore()
  const others = frequentlyBoughtTogether(p)
  const items = [p, ...others]
  const [sel, setSel] = useState(() => Object.fromEntries(items.map((x) => [x.id, true])))
  if (!others.length) return null
  const chosen = items.filter((x) => sel[x.id])
  const total = chosen.reduce((s, x) => s + x.price, 0)
  return (
    <section className={cn(card, 'mt-10 p-5')}>
      <SectionHead title="Frequently bought together" />
      <div className="flex flex-wrap items-center gap-2.5 max-sm:flex-col max-sm:items-stretch">
        {items.map((x, k) => (
          <div key={x.id} className="flex items-center gap-2.5 max-sm:flex-col">
            {k > 0 && <span className="grid text-muted-foreground"><Icon name="Plus" size={20} /></span>}
            <label className={cn('relative flex w-[150px] cursor-pointer flex-col gap-1.5 transition-opacity duration-200 max-sm:w-full max-sm:flex-row max-sm:items-center', !sel[x.id] && 'opacity-45')}>
              <Checkbox className="absolute left-1.5 top-1.5 z-2 size-[18px]" checked={!!sel[x.id]} onCheckedChange={() => setSel((s) => ({ ...s, [x.id]: !s[x.id] }))} />
              <ProductArt p={x} size="sm" className="w-[150px] max-sm:w-16" />
              <span className="line-clamp-2 text-[13px]">{k === 0 ? 'This item: ' : ''}{x.title}</span>
              <b>{naira(x.price)}</b>
            </label>
          </div>
        ))}
        <div className="ml-auto flex flex-col items-start gap-1.5 pl-5 max-sm:ml-0 max-sm:pl-0">
          <div className="text-[13px] text-muted-foreground">Total for {chosen.length} item{chosen.length === 1 ? '' : 's'}</div>
          <motion.div key={total} initial={{ scale: 1.15, color: 'var(--color-orange)' }} animate={{ scale: 1, color: 'var(--color-ink)' }} className="font-display text-[26px] font-extrabold">{naira(total)}</motion.div>
          <Button disabled={!chosen.length} onClick={() => { chosen.forEach((x) => dispatch({ type: 'addToCart', id: x.id, color: x.variants.color?.[0] || null, size: x.variants.size?.[0] || null })); toast(`${chosen.length} items added to cart`, { icon: 'ShoppingCart' }) }}>Add selected to cart</Button>
        </div>
      </div>
    </section>
  )
}

const REPORT_REASONS = ['Incorrect product information', 'Prohibited or unsafe item', 'Counterfeit / misleading branding', 'Price looks wrong', 'Other']

function ReportModal({ open, onClose, p }) {
  const { toast } = useStore()
  const [reason, setReason] = useState('')
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} overlayClassName="z-80" className="tw z-90 block w-[min(440px,calc(100vw-32px))] max-w-none rounded-lg border-0 bg-white p-6 shadow-lift sm:max-w-none">
        <DialogTitle className="mb-3 font-display text-[19px] font-bold leading-[1.15]">Report this product</DialogTitle>
        <DialogDescription className="my-[1em] text-[13px] text-muted-foreground">Our catalog team reviews every report within 24 hours.</DialogDescription>
        <RadioGroup value={reason} onValueChange={setReason} className="block">
          {REPORT_REASONS.map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-2 py-1 text-[14px]"><RadioGroupItem value={r} className="ml-[5px] mr-[3px] mt-[3px]" /><span className="flex-1">{r}</span></label>
          ))}
        </RadioGroup>
        <div className="mt-4 flex justify-end gap-2.5">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!reason} onClick={() => { toast(`Report received for ${p.sku}`, { icon: 'Flag' }); onClose() }}>Submit report</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const DELIVERY_STATES = ['Lagos', 'Abuja (FCT)', 'Rivers', 'Oyo', 'Kano', 'Enugu', 'Edo', 'Kaduna', 'Delta', 'Ogun', 'Anambra', 'Kwara', 'Other']
const dlRow = 'flex items-start gap-3 text-[14px]'
const dlIco = 'grid w-[22px] pt-px text-brand'
const variantLabel = 'mb-2 flex flex-wrap items-center gap-2 text-[14px]'
const chipLg = 'rounded-[5px] border-[1.5px] border-line bg-white px-4 py-[9px] text-[14px] font-semibold transition-all duration-150 hover:border-brand'

export default function Product() {
  const { id } = useParams()
  const nav = useNavigate()
  const { getProduct, state, dispatch, toast } = useStore()
  const p = getProduct(id)
  // Page title from the dashboard's search-engine listing (falls back to the product name)
  useEffect(() => {
    if (!p) return
    const prev = document.title
    document.title = p.seo?.title || `${p.title} — Oja`
    return () => { document.title = prev }
  }, [p?.id, p?.title, p?.seo?.title]) // eslint-disable-line react-hooks/exhaustive-deps
  const [color, setColor] = useState(null)
  const [size, setSize] = useState(null)
  const [qty, setQty] = useState(1)
  const [tab, setTab] = useState('details')
  const [report, setReport] = useState(false)
  const [needSize, setNeedSize] = useState(false)

  useEffect(() => {
    if (!p) return
    dispatch({ type: 'viewed', id: p.id })
    setColor(p.variants.color?.[0] || null); setSize(null); setQty(1); setTab('details')
    window.scrollTo({ top: 0 })
  }, [id]) // eslint-disable-line

  if (!p || !p.published) return <Page className="tw"><div className={wrap}><Empty icon="PackageX" title="This product isn't available" body="It may have been unpublished by our catalog team." action={<Button asChild><Link to="/">Back to shopping</Link></Button>} /></div></Page>

  const cat = CATEGORIES.find((c) => c.id === p.category)
  const wished = state.wishlist.includes(p.id)
  const oos = p.stock === 'oos'
  const lowStock = p.stock === 'nigeria' && p.qty > 0 && p.qty < 100
  const free = p.price * qty >= FREE_SHIP_THRESHOLD

  const add = (buyNow) => {
    if (p.variants.size && !size) {
      setNeedSize(true)
      document.getElementById('size-picker')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      toast('Please choose a size first', { icon: 'Ruler' })
      return
    }
    dispatch({ type: 'addToCart', id: p.id, color, size, qty })
    if (buyNow) nav('/checkout')
    else toast(`Added ${qty} × ${p.title.split(',')[0]}`, { icon: 'ShoppingCart' })
  }

  return (
    <Page className="tw">
      <div className={wrap}>
        <nav className="mb-3.5 mt-[18px] flex items-center gap-2 text-[14px] text-muted-foreground"><Link to="/" className="hover:text-brand">Home</Link> / <Link to={`/search?cat=${cat.id}`} className="hover:text-brand">{cat.name}</Link> / <span className="text-muted-foreground">{p.sku}</span></nav>
        <div className="grid grid-cols-[1.05fr_1fr] items-start gap-10 max-md:grid-cols-1 max-md:gap-5">
          <Gallery p={p} />
          <div>
            <h1 className="text-[clamp(22px,2.4vw,28px)] font-bold">{p.title}</h1>
            <p className="my-2 text-[16px] text-ink-2">{p.pitch}</p>
            <div className="flex flex-wrap items-center gap-2.5 text-[14px]">
              <a href="#reviews" className="inline-flex items-center gap-1.5"><Stars value={p.rating} size={15} showValue /> <span className="text-muted-foreground">({p.reviews.toLocaleString()} reviews)</span></a>
              <span className="inline-block size-[3px] rounded-full bg-muted-foreground" /><span className="text-muted-foreground">{p.sold.toLocaleString()} sold</span>
            </div>

            <div className={cn(card, 'my-[18px] flex flex-col gap-1.5 px-[18px] py-4')}>
              <Price p={p} big />
              {p.refPrice && <div className="text-[13px] text-muted-foreground">Previous Oja price {naira(p.refPrice)} — you save {naira(p.refPrice - p.price)}</div>}
              <div className={cn(rowIco, 'text-[13px] font-semibold text-good')}><Icon name="CircleCheck" size={15} /> Import duties, customs & clearing included in price</div>
              <div className={cn(rowIco, 'rounded-lg border-[1.5px] border-dashed border-orange bg-[repeating-linear-gradient(-45deg,#fff6ee,#fff6ee_8px,#fff_8px,#fff_16px)] px-3 py-2 text-[13.5px]')}><Icon name="Ticket" size={16} className="text-orange" /> Extra 10% off your first order with <b>OJA10</b></div>
            </div>

            {p.variants.color && (
              <div className="my-4">
                <div className={variantLabel}>Colour: <b>{color}</b></div>
                <div className="flex flex-wrap gap-2">{p.variants.color.map((c) => <motion.button whileTap={{ scale: 0.94 }} key={c} className={cn(chipLg, color === c && chipOn)} aria-pressed={color === c} onClick={() => setColor(c)}>{c}</motion.button>)}</div>
              </div>
            )}
            {p.variants.size && (
              <motion.div id="size-picker" className="my-4" animate={needSize ? { x: [0, -8, 8, -5, 5, 0] } : {}} transition={{ duration: 0.4 }} onAnimationComplete={() => setNeedSize(false)}>
                <div className={variantLabel}>Size: <b>{size || <span className={needSize ? 'text-bad' : 'text-muted-foreground'}>Select a size</span>}</b></div>
                <div className="flex flex-wrap gap-2">{p.variants.size.map((s) => <motion.button whileTap={{ scale: 0.94 }} key={s} className={cn(chipLg, 'min-w-[52px]', size === s && chipOn)} aria-pressed={size === s} onClick={() => setSize(s)}>{s}</motion.button>)}</div>
              </motion.div>
            )}

            <div className="my-4">
              <div className={variantLabel}>Quantity {qty >= 3 && <Badge variant="good">Buy-more-save-more: 5% off applied in cart</Badge>}</div>
              <div className="inline-flex items-center overflow-hidden rounded-full border-[1.5px] border-line bg-white">
                <button className="size-10 text-[18px] not-disabled:hover:bg-background" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
                <AnimatePresence mode="popLayout" initial={false}><motion.span key={qty} className="inline-block min-w-[34px] text-center font-bold" initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}>{qty}</motion.span></AnimatePresence>
                <button className="size-10 text-[18px] not-disabled:hover:bg-background" onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label="Increase">+</button>
              </div>
            </div>

            <div className={cn(card, 'my-[18px] flex flex-col gap-2.5 px-4 py-3.5')}>
              <div className={cn('text-[14px] font-bold', TONE_TEXT[STOCK[p.stock].tone])}>● {STOCK[p.stock].label}{lowStock && <b> — only {p.qty} left</b>}</div>
              {!oos && (
                <>
                  <div className={dlRow}><span className={dlIco}><Icon name="Truck" /></span><div>Delivery to <select className="cursor-pointer border-0 bg-transparent font-bold text-brand underline" value={state.deliveryState} onChange={(e) => dispatch({ type: 'setDeliveryState', state: e.target.value })} aria-label="Delivery state">{DELIVERY_STATES.map((s) => <option key={s}>{s}</option>)}</select><br /><b>{windowLabel(p.stock, state.deliveryState)}</b></div></div>
                  <div className={dlRow}><span className={dlIco}><Icon name="Banknote" /></span><div>{free ? <b className="text-good">Free delivery on this order</b> : <>Delivery from {naira(SHIP_FEE[1])} · <span className="text-muted-foreground">free above {naira(FREE_SHIP_THRESHOLD)}</span></>}</div></div>
                  {p.stock !== 'nigeria' && <div className={dlRow}><span className={dlIco}><Icon name="Plane" /></span><div className="text-[13px]">Ships from our China warehouse. You'll see each milestone — sourcing, export, customs and delivery.</div></div>}
                </>
              )}
              <div className={dlRow}><span className={dlIco}><Icon name="RotateCcw" /></span><div className="text-[13px]">{p.returnable ? 'Eligible for return within 7 days of delivery (damaged, defective, wrong or not-as-described).' : 'Not returnable for hygiene reasons — refunds still available for damaged or wrong items.'}</div></div>
            </div>

            <div className="mb-2.5 mt-[18px] flex gap-2.5 max-md:justify-start">
              <Button asChild size="lg" className="flex-1 max-md:hidden"><motion.button whileTap={{ scale: 0.97 }} disabled={oos} onClick={() => add(false)}>{oos ? 'Out of stock' : 'Add to cart'}</motion.button></Button>
              <Button asChild variant="accent" size="lg" className="flex-1 max-md:hidden"><motion.button whileTap={{ scale: 0.97 }} disabled={oos} onClick={() => add(true)}>Buy now</motion.button></Button>
              <Button asChild variant="wish"><motion.button whileTap={{ scale: 0.85 }} aria-pressed={wished} onClick={() => { dispatch({ type: 'toggleWish', id: p.id }); toast(wished ? 'Removed from wishlist' : oos ? 'We\'ll tell you when it\'s back in stock' : 'Saved — we\'ll alert you if the price drops', { icon: 'Heart' }) }} aria-label="Wishlist"><Icon name="Heart" size={22} fill={wished ? 'currentColor' : 'none'} /></motion.button></Button>
            </div>
            {oos && <p className={cn(rowIco, 'my-[1em] text-[13px] text-muted-foreground')}>Tap <Icon name="Heart" size={14} /> to get a back-in-stock notification.</p>}
            <button className={cn(linkCls, rowIco, 'text-[13px]')} onClick={() => setReport(true)}><Icon name="Flag" size={14} /> Report an issue with this product</button>
          </div>
        </div>

        <Bundle p={p} />

        <section className="mt-10">
          <Tabs id="pdp" value={tab} onChange={setTab} tabs={[{ value: 'details', label: 'Details' }, { value: 'specs', label: 'Specifications' }, { value: 'box', label: "What's included" }, { value: 'ship', label: 'Shipping & returns' }]} />
          <AnimatePresence mode="wait">
            <motion.div key={tab} className="mt-[18px] [&_p]:my-[1em] [&_p]:max-w-[760px] [&_p]:text-ink-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {tab === 'details' && <div>{p.description && <div className={cn(richText, 'mb-3.5 border-b border-line pb-3.5')} dangerouslySetInnerHTML={{ __html: sanitizeHtml(p.description) }} />}<p><b>{p.pitch}.</b> Selected by Oja's sourcing team from {p.specs.Origin || 'a vetted supplier'} and quality-checked before export.</p><p>Every Oja listing passes an eligibility review for safety, legality and import feasibility. The price you see already includes international freight, customs duties and clearing — no extra charges at delivery.</p></div>}
              {tab === 'specs' && <table className="w-full max-w-[640px] border-collapse text-[14px]"><tbody>{Object.entries({ SKU: p.sku, ...p.specs, ...(p.variants.color ? { Colours: p.variants.color.join(', ') } : {}), ...(p.variants.size ? { Sizes: p.variants.size.join(', ') } : {}) }).map(([k, v]) => <tr key={k}><th className="w-[45%] border-b border-line px-3 py-[9px] text-left font-medium text-muted-foreground">{k}</th><td className="border-b border-line px-3 py-[9px] text-left">{v}</td></tr>)}</tbody></table>}
              {tab === 'box' && <ul className="my-[1em] flex flex-col gap-2">{p.inBox.map((x) => <li key={x} className={rowIco}><Icon name="Package" size={16} className="text-brand" /> {x}</li>)}</ul>}
              {tab === 'ship' && <div><p><b>Delivery estimate to {state.deliveryState}:</b> {oos ? '—' : windowLabel(p.stock, state.deliveryState)}.</p><p>Lagos {naira(1500)} · Abuja, PH, Ibadan, Ogun {naira(2500)} · Other states {naira(3500)}. Free above {naira(FREE_SHIP_THRESHOLD)}.</p><p>{p.returnable ? 'Return within 7 days of delivery for damaged, defective, wrong, missing or significantly-not-as-described items. Refunds go back to your original payment method.' : 'This item is non-returnable once opened. Damaged or wrong items are still fully refundable.'} <Link to="/help#returns">Read full policy</Link></p></div>}
            </motion.div>
          </AnimatePresence>
        </section>

        <div id="reviews"><Reviews p={p} /></div>

        <section className="mt-10">
          <SectionHead title="You may also like" />
          <Rail products={relatedProducts(p).map((x) => getProduct(x.id)).filter((x) => x.published)} />
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-[62px] z-40 hidden items-center gap-2 bg-white px-4 py-2.5 shadow-[0_-4px_20px_rgba(0,0,0,.08)] max-md:flex">
        <div className="flex-1"><div className="font-display text-[20px] font-extrabold text-orange">{naira(p.price)}</div>{p.refPrice && <s className="text-[13px] text-muted-foreground">{naira(p.refPrice)}</s>}</div>
        <Button disabled={oos} onClick={() => add(false)}>Add to cart</Button>
        <Button variant="accent" disabled={oos} onClick={() => add(true)}>Buy now</Button>
      </div>

      <ReportModal open={report} p={p} onClose={() => setReport(false)} />
    </Page>
  )
}
