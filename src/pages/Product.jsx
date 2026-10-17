import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/Store'
import { Page, ProductArt, Stars, Price, Rail, SectionHead, Tabs, Empty, spring } from '../components/ui'
import { CATEGORIES, STOCK, reviewsFor } from '../data/catalog'
import { Icon } from '../components/Icon'
import { sanitizeHtml } from '../lib/sanitize'
import { naira, windowLabel, relatedProducts, frequentlyBoughtTogether, FREE_SHIP_THRESHOLD, SHIP_FEE, discountPct } from '../lib/commerce'

function Gallery({ p }) {
  const views = p.images?.length ? p.images.map((_, k) => k) : [0]
  const [v, setV] = useState(0)
  useEffect(() => setV(0), [p.id])
  return (
    <div className="gallery">
      <div className="gallery-thumbs">
        {views.map((k) => (
          <button key={k} className={`thumb ${v === k ? 'on' : ''}`} onClick={() => setV(k)} onMouseEnter={() => setV(k)} aria-label={`View photo ${k + 1}`}>
            <ProductArt p={p} size="sm" index={k} />
          </button>
        ))}
      </div>
      <div className="gallery-main">
        <AnimatePresence mode="wait">
          <motion.div key={p.id + v} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
            <ProductArt p={p} size="xl" index={v} />
          </motion.div>
        </AnimatePresence>
        {discountPct(p) > 0 && <span className="card-flag lg">-{discountPct(p)}%</span>}
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
    <section className="reviews">
      <SectionHead title="Customer reviews" kicker="Verified purchases only" />
      <div className="rev-summary">
        <div className="rev-score">
          <div className="rev-big">{p.rating.toFixed(1)}</div>
          <Stars value={p.rating} size={18} />
          <div className="muted small">{p.reviews.toLocaleString()} product ratings</div>
        </div>
        <div className="rev-bars">
          {dist.map(({ s, pct }) => (
            <button key={s} className="rev-bar" onClick={() => setFilter(String(s))}>
              <span className="row-ico">{s}<Icon name="Star" size={11} fill="currentColor" /></span>
              <span className="bar"><motion.span initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }} transition={{ duration: 0.8, delay: (5 - s) * 0.08 }} /></span>
              <span className="muted small">{pct}%</span>
            </button>
          ))}
        </div>
        <div className="rev-delivery">
          <div className="small muted">Delivery experience</div>
          <div className="rev-dscore row-ico"><Icon name="Truck" size={22} className="brand" /> {deliveryScore}/5</div>
          <p className="small muted">Rated separately so you can tell product quality apart from delivery.</p>
        </div>
      </div>
      <div className="chips rev-filters">
        {[['all', 'All'], ['photos', 'With photos', 'Camera'], ['repeat', 'Repeat buyers', 'Repeat'], ['5', '5', 'Star'], ['4', '4', 'Star'], ['3', '3', 'Star']].map(([k, l, ico]) => (
          <button key={k} className={`chip chip-ico ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{ico === 'Star' ? <>{l}<Icon name="Star" size={12} fill="currentColor" /></> : <>{ico && <Icon name={ico} size={13} />}{l}</>}</button>
        ))}
      </div>
      <motion.div layout className="rev-list">
        <AnimatePresence mode="popLayout">
          {shown.length === 0 && <motion.p key="none" className="muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>No reviews match this filter yet.</motion.p>}
          {shown.map((r) => (
            <motion.article layout key={r.id} className="rev" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="rev-top">
                <span className="avatar">{r.name[0]}</span>
                <div><b>{r.name}</b> <span className="muted small">· {r.city}</span><div className="small"><Stars value={r.stars} size={12} /> <span className="badge badge-good"><Icon name="BadgeCheck" size={12} /> Verified purchase</span>{r.repeat && <span className="badge badge-info">Repeat buyer</span>}</div></div>
                <span className="muted small rev-date">{new Date(r.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span>
              </div>
              <h4>{r.title}</h4>
              <p>{r.body}</p>
              {r.variant && <div className="muted small">Variant: {r.variant}</div>}
              {r.photos > 0 && <div className="rev-photos">{Array.from({ length: r.photos }).map((_, k) => <ProductArt key={k} p={p} size="xs" index={k + 1} />)}</div>}
              <motion.button whileTap={{ scale: 0.92 }} className={`helpful ${helped[r.id] ? 'on' : ''}`} onClick={() => setHelped((h) => ({ ...h, [r.id]: !h[r.id] }))}><Icon name="ThumbsUp" size={13} fill={helped[r.id] ? 'currentColor' : 'none'} /> Helpful ({r.helpful + (helped[r.id] ? 1 : 0)})</motion.button>
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
    <section className="bundle">
      <SectionHead title="Frequently bought together" />
      <div className="bundle-row">
        {items.map((x, k) => (
          <div key={x.id} className="bundle-item-wrap">
            {k > 0 && <span className="bundle-plus"><Icon name="Plus" size={20} /></span>}
            <label className={`bundle-item ${sel[x.id] ? '' : 'off'}`}>
              <input type="checkbox" checked={!!sel[x.id]} onChange={() => setSel((s) => ({ ...s, [x.id]: !s[x.id] }))} />
              <ProductArt p={x} size="sm" />
              <span className="small clamp2">{k === 0 ? 'This item: ' : ''}{x.title}</span>
              <b>{naira(x.price)}</b>
            </label>
          </div>
        ))}
        <div className="bundle-total">
          <div className="muted small">Total for {chosen.length} item{chosen.length === 1 ? '' : 's'}</div>
          <motion.div key={total} initial={{ scale: 1.15, color: 'var(--accent)' }} animate={{ scale: 1, color: 'var(--ink)' }} className="bundle-price">{naira(total)}</motion.div>
          <button className="btn btn-primary" disabled={!chosen.length} onClick={() => { chosen.forEach((x) => dispatch({ type: 'addToCart', id: x.id, color: x.variants.color?.[0] || null, size: x.variants.size?.[0] || null })); toast(`${chosen.length} items added to cart`, { icon: 'ShoppingCart' }) }}>Add selected to cart</button>
        </div>
      </div>
    </section>
  )
}

function ReportModal({ onClose, p }) {
  const { toast } = useStore()
  const [reason, setReason] = useState('')
  return (
    <>
      <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="modal" role="dialog" aria-modal initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={spring}>
        <h3>Report this product</h3>
        <p className="muted small">Our catalog team reviews every report within 24 hours.</p>
        {['Incorrect product information', 'Prohibited or unsafe item', 'Counterfeit / misleading branding', 'Price looks wrong', 'Other'].map((r) => (
          <label key={r} className="f-opt"><input type="radio" name="rep" checked={reason === r} onChange={() => setReason(r)} /><span>{r}</span></label>
        ))}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!reason} onClick={() => { toast(`Report received for ${p.sku}`, { icon: 'Flag' }); onClose() }}>Submit report</button>
        </div>
      </motion.div>
    </>
  )
}

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

  if (!p || !p.published) return <Page><div className="wrap"><Empty icon="PackageX" title="This product isn't available" body="It may have been unpublished by our catalog team." action={<Link className="btn btn-primary" to="/">Back to shopping</Link>} /></div></Page>

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
    <Page>
      <div className="wrap">
        <nav className="crumbs small"><Link to="/">Home</Link> / <Link to={`/search?cat=${cat.id}`}>{cat.name}</Link> / <span className="muted">{p.sku}</span></nav>
        <div className="pdp">
          <Gallery p={p} />
          <div className="pdp-info">
            <h1 className="pdp-title">{p.title}</h1>
            <p className="pdp-pitch">{p.pitch}</p>
            <div className="pdp-meta">
              <a href="#reviews" className="pdp-rating"><Stars value={p.rating} size={15} showValue /> <span className="muted">({p.reviews.toLocaleString()} reviews)</span></a>
              <span className="dot" /><span className="muted">{p.sold.toLocaleString()} sold</span>
            </div>

            <div className="pdp-price-box">
              <Price p={p} big />
              {p.refPrice && <div className="muted small">Previous Oja price {naira(p.refPrice)} — you save {naira(p.refPrice - p.price)}</div>}
              <div className="small included row-ico"><Icon name="CircleCheck" size={15} /> Import duties, customs & clearing included in price</div>
              <div className="coupon-hint row-ico"><Icon name="Ticket" size={16} className="accent" /> Extra 10% off your first order with <b>OJA10</b></div>
            </div>

            {p.variants.color && (
              <div className="variant">
                <div className="variant-label">Colour: <b>{color}</b></div>
                <div className="chips">{p.variants.color.map((c) => <motion.button whileTap={{ scale: 0.94 }} key={c} className={`chip lg ${color === c ? 'on' : ''}`} onClick={() => setColor(c)}>{c}</motion.button>)}</div>
              </div>
            )}
            {p.variants.size && (
              <motion.div id="size-picker" className="variant" animate={needSize ? { x: [0, -8, 8, -5, 5, 0] } : {}} transition={{ duration: 0.4 }} onAnimationComplete={() => setNeedSize(false)}>
                <div className="variant-label">Size: <b>{size || <span className={needSize ? 'err' : 'muted'}>Select a size</span>}</b></div>
                <div className="chips">{p.variants.size.map((s) => <motion.button whileTap={{ scale: 0.94 }} key={s} className={`chip lg sq ${size === s ? 'on' : ''}`} onClick={() => setSize(s)}>{s}</motion.button>)}</div>
              </motion.div>
            )}

            <div className="variant">
              <div className="variant-label">Quantity {qty >= 3 && <span className="badge badge-good">Buy-more-save-more: 5% off applied in cart</span>}</div>
              <div className="qty">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
                <AnimatePresence mode="popLayout" initial={false}><motion.span key={qty} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}>{qty}</motion.span></AnimatePresence>
                <button onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label="Increase">+</button>
              </div>
            </div>

            <div className="delivery-box">
              <div className={`stock-line tone-${STOCK[p.stock].tone}`}>● {STOCK[p.stock].label}{lowStock && <b> — only {p.qty} left</b>}</div>
              {!oos && (
                <>
                  <div className="dl-row"><span><Icon name="Truck" /></span><div>Delivery to <select className="inline-select" value={state.deliveryState} onChange={(e) => dispatch({ type: 'setDeliveryState', state: e.target.value })}>{['Lagos', 'Abuja (FCT)', 'Rivers', 'Oyo', 'Kano', 'Enugu', 'Edo', 'Kaduna', 'Delta', 'Ogun', 'Anambra', 'Kwara', 'Other'].map((s) => <option key={s}>{s}</option>)}</select><br /><b>{windowLabel(p.stock, state.deliveryState)}</b></div></div>
                  <div className="dl-row"><span><Icon name="Banknote" /></span><div>{free ? <b className="good">Free delivery on this order</b> : <>Delivery from {naira(SHIP_FEE[1])} · <span className="muted">free above {naira(FREE_SHIP_THRESHOLD)}</span></>}</div></div>
                  {p.stock !== 'nigeria' && <div className="dl-row"><span><Icon name="Plane" /></span><div className="small">Ships from our China warehouse. You'll see each milestone — sourcing, export, customs and delivery.</div></div>}
                </>
              )}
              <div className="dl-row"><span><Icon name="RotateCcw" /></span><div className="small">{p.returnable ? 'Eligible for return within 7 days of delivery (damaged, defective, wrong or not-as-described).' : 'Not returnable for hygiene reasons — refunds still available for damaged or wrong items.'}</div></div>
            </div>

            <div className="pdp-actions">
              <motion.button whileTap={{ scale: 0.97 }} className="btn btn-primary lg" disabled={oos} onClick={() => add(false)}>{oos ? 'Out of stock' : 'Add to cart'}</motion.button>
              <motion.button whileTap={{ scale: 0.97 }} className="btn btn-accent lg" disabled={oos} onClick={() => add(true)}>Buy now</motion.button>
              <motion.button whileTap={{ scale: 0.85 }} className={`btn btn-icon ${wished ? 'wished' : ''}`} onClick={() => { dispatch({ type: 'toggleWish', id: p.id }); toast(wished ? 'Removed from wishlist' : oos ? 'We\'ll tell you when it\'s back in stock' : 'Saved — we\'ll alert you if the price drops', { icon: 'Heart' }) }} aria-label="Wishlist"><Icon name="Heart" size={22} fill={wished ? 'currentColor' : 'none'} /></motion.button>
            </div>
            {oos && <p className="small muted row-ico">Tap <Icon name="Heart" size={14} /> to get a back-in-stock notification.</p>}
            <button className="link small row-ico" onClick={() => setReport(true)}><Icon name="Flag" size={14} /> Report an issue with this product</button>
          </div>
        </div>

        <Bundle p={p} />

        <section className="pdp-tabs">
          <Tabs id="pdp" value={tab} onChange={setTab} tabs={[{ value: 'details', label: 'Details' }, { value: 'specs', label: 'Specifications' }, { value: 'box', label: "What's included" }, { value: 'ship', label: 'Shipping & returns' }]} />
          <AnimatePresence mode="wait">
            <motion.div key={tab} className="tab-panel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {tab === 'details' && <div className="prose">{p.description && <div className="pdp-desc" dangerouslySetInnerHTML={{ __html: sanitizeHtml(p.description) }} />}<p><b>{p.pitch}.</b> Selected by Oja's sourcing team from {p.specs.Origin || 'a vetted supplier'} and quality-checked before export.</p><p>Every Oja listing passes an eligibility review for safety, legality and import feasibility. The price you see already includes international freight, customs duties and clearing — no extra charges at delivery.</p></div>}
              {tab === 'specs' && <table className="spec"><tbody>{Object.entries({ SKU: p.sku, ...p.specs, ...(p.variants.color ? { Colours: p.variants.color.join(', ') } : {}), ...(p.variants.size ? { Sizes: p.variants.size.join(', ') } : {}) }).map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody></table>}
              {tab === 'box' && <ul className="inbox">{p.inBox.map((x) => <li key={x} className="row-ico"><Icon name="Package" size={16} className="brand" /> {x}</li>)}</ul>}
              {tab === 'ship' && <div className="prose"><p><b>Delivery estimate to {state.deliveryState}:</b> {oos ? '—' : windowLabel(p.stock, state.deliveryState)}.</p><p>Lagos {naira(1500)} · Abuja, PH, Ibadan, Ogun {naira(2500)} · Other states {naira(3500)}. Free above {naira(FREE_SHIP_THRESHOLD)}.</p><p>{p.returnable ? 'Return within 7 days of delivery for damaged, defective, wrong, missing or significantly-not-as-described items. Refunds go back to your original payment method.' : 'This item is non-returnable once opened. Damaged or wrong items are still fully refundable.'} <Link to="/help#returns">Read full policy</Link></p></div>}
            </motion.div>
          </AnimatePresence>
        </section>

        <div id="reviews"><Reviews p={p} /></div>

        <section>
          <SectionHead title="You may also like" />
          <Rail products={relatedProducts(p).map((x) => getProduct(x.id)).filter((x) => x.published)} />
        </section>
      </div>

      <div className="buybar only-mobile">
        <div><div className="buybar-price">{naira(p.price)}</div>{p.refPrice && <s className="muted small">{naira(p.refPrice)}</s>}</div>
        <button className="btn btn-primary" disabled={oos} onClick={() => add(false)}>Add to cart</button>
        <button className="btn btn-accent" disabled={oos} onClick={() => add(true)}>Buy now</button>
      </div>

      <AnimatePresence>{report && <ReportModal p={p} onClose={() => setReport(false)} />}</AnimatePresence>
    </Page>
  )
}
