import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { useStore } from '../store/Store'
import { Page, ProductCard, Empty, Countdown, SectionHead } from '../components/ui'
import { CATEGORIES, PRODUCTS } from '../data/catalog'
import { Icon } from '../components/Icon'
import { searchProducts, didYouMean, SORTS, deliveryWindow, discountPct, naira } from '../lib/commerce'

const PRICE_BANDS = [[0, 5000], [5000, 10000], [10000, 20000], [20000, 999999]]
const bandLabel = ([a, b]) => (b > 100000 ? `${naira(a)}+` : a === 0 ? `Under ${naira(b)}` : `${naira(a)} – ${naira(b)}`)

export function logZeroResult(q) {
  try {
    const k = 'ooja-zero-results'
    const m = JSON.parse(localStorage.getItem(k) || '{}')
    m[q] = (m[q] || 0) + 1
    localStorage.setItem(k, JSON.stringify(m))
  } catch {}
}

function Filters({ f, set, colors, counts }) {
  const toggle = (key, v) => set({ ...f, [key]: f[key] === v ? null : v })
  return (
    <div className="filters">
      <div className="f-group">
        <h4>Category</h4>
        {CATEGORIES.map((c) => (
          <label key={c.id} className={`f-opt ${!counts[c.id] ? 'disabled' : ''}`}>
            <input type="radio" name="cat" checked={f.cat === c.id} onChange={() => toggle('cat', c.id)} onClick={() => f.cat === c.id && set({ ...f, cat: null })} />
            <span className="row-ico"><Icon name={c.icon} size={15} className="muted" /> {c.name}</span><span className="muted small">{counts[c.id] || 0}</span>
          </label>
        ))}
      </div>
      <div className="f-group">
        <h4>Price</h4>
        {PRICE_BANDS.map((b, k) => (
          <label key={k} className="f-opt"><input type="radio" name="price" checked={f.price === k} onChange={() => toggle('price', k)} onClick={() => f.price === k && set({ ...f, price: null })} /><span>{bandLabel(b)}</span></label>
        ))}
      </div>
      <div className="f-group">
        <h4>Customer rating</h4>
        {[4.5, 4].map((r) => <label key={r} className="f-opt"><input type="radio" name="rating" checked={f.rating === r} onChange={() => toggle('rating', r)} onClick={() => f.rating === r && set({ ...f, rating: null })} /><span className="row-ico"><Icon name="Star" size={14} fill="currentColor" className="star-ico" /> {r} & up</span></label>)}
      </div>
      <div className="f-group">
        <h4>Availability & delivery</h4>
        <label className="f-opt"><input type="checkbox" checked={!!f.inNigeria} onChange={() => set({ ...f, inNigeria: !f.inNigeria })} /><span>🇳🇬 In stock in Nigeria</span></label>
        <label className="f-opt"><input type="checkbox" checked={!!f.fast} onChange={() => set({ ...f, fast: !f.fast })} /><span className="row-ico"><Icon name="Zap" size={14} /> Arrives within 5 days</span></label>
        <label className="f-opt"><input type="checkbox" checked={!!f.hideOos} onChange={() => set({ ...f, hideOos: !f.hideOos })} /><span>Hide out of stock</span></label>
        <label className="f-opt"><input type="checkbox" checked={!!f.deals} onChange={() => set({ ...f, deals: !f.deals })} /><span className="row-ico"><Icon name="Tag" size={14} /> On sale</span></label>
      </div>
      {colors.length > 0 && (
        <div className="f-group">
          <h4>Colour</h4>
          <div className="chips">{colors.map((c) => <button key={c} className={`chip ${f.color === c ? 'on' : ''}`} onClick={() => toggle('color', c)}>{c}</button>)}</div>
        </div>
      )}
    </div>
  )
}

export default function Search({ dealsMode = false }) {
  const { live, getProduct, state, dispatch } = useStore()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const sort = params.get('sort') || (q ? 'relevance' : dealsMode ? 'popular' : 'popular')
  const [f, setF] = useState({ cat: params.get('cat'), price: null, rating: null, inNigeria: false, fast: false, hideOos: false, deals: dealsMode, color: null })
  const [drawer, setDrawer] = useState(false)

  useEffect(() => { setF((x) => ({ ...x, cat: params.get('cat') })) }, [params])

  const base = useMemo(() => {
    const ids = q ? searchProducts(q).map((p) => p.id) : PRODUCTS.map((p) => p.id)
    return ids.map(getProduct).filter((p) => p?.published)
  }, [q, getProduct])

  const results = useMemo(() => {
    let r = base.filter((p) => {
      if (f.cat && p.category !== f.cat) return false
      if (f.price != null) { const [a, b] = PRICE_BANDS[f.price]; if (p.price < a || p.price >= b) return false }
      if (f.rating && p.rating < f.rating) return false
      if (f.inNigeria && p.stock !== 'nigeria') return false
      if (f.fast && (p.stock === 'oos' || deliveryWindow(p.stock, state.deliveryState)[1] > 5)) return false
      if (f.hideOos && p.stock === 'oos') return false
      if (f.deals && discountPct(p) < 1) return false
      if (f.color && !p.variants.color?.includes(f.color)) return false
      return true
    })
    const fn = SORTS[sort]?.fn
    if (fn) r = [...r].sort(fn)
    return r
  }, [base, f, sort, state.deliveryState])

  const counts = useMemo(() => base.reduce((m, p) => ((m[p.category] = (m[p.category] || 0) + 1), m), {}), [base])
  const colors = useMemo(() => [...new Set(base.filter((p) => !f.cat || p.category === f.cat).flatMap((p) => p.variants.color || []))].slice(0, 14), [base, f.cat])
  const suggestion = q && base.length === 0 ? didYouMean(q) : null

  useEffect(() => { if (q && base.length === 0) logZeroResult(q) }, [q, base.length])

  const setSort = (v) => { const n = new URLSearchParams(params); n.set('sort', v); setParams(n, { replace: true }) }
  const cat = CATEGORIES.find((c) => c.id === f.cat)
  const active = [f.cat && cat?.name, f.price != null && bandLabel(PRICE_BANDS[f.price]), f.rating && `${f.rating}+ stars`, f.inNigeria && 'In Nigeria', f.fast && '≤5 days', f.deals && !dealsMode && 'On sale', f.color].filter(Boolean)
  const flashEnds = useMemo(() => { const d = new Date(); d.setHours(23, 59, 59, 0); return d.getTime() }, [])

  return (
    <Page>
      <div className="wrap">
        {dealsMode ? (
          <motion.div className="deals-banner" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div><div className="kicker light">Today only</div><h1 className="row-ico"><Icon name="Zap" size={30} fill="currentColor" /> Flash deals</h1><p>Genuine discounts against our previous selling price. Margin-checked, never fake.</p></div>
            <div className="deals-cd"><span className="small">Ends in</span><Countdown to={flashEnds} /></div>
          </motion.div>
        ) : (
          <div className="results-head">
            <h1>{q ? <>Results for “{q}”</> : cat ? <span className="row-ico"><Icon name={cat.icon} size={28} className="accent" /> {cat.name}</span> : 'All products'}</h1>
            <span className="muted">{results.length} item{results.length === 1 ? '' : 's'}</span>
          </div>
        )}

        <div className="search-layout">
          <aside className="filters-side"><Filters f={f} set={setF} colors={colors} counts={counts} /></aside>
          <div>
            <div className="toolbar">
              <button className="btn btn-ghost sm only-mobile" onClick={() => setDrawer(true)}><Icon name="SlidersHorizontal" size={15} /> Filters {active.length ? `(${active.length})` : ''}</button>
              <div className="active-chips">
                <AnimatePresence>
                  {active.map((a) => <motion.span layout key={a} className="chip on" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>{a}</motion.span>)}
                </AnimatePresence>
                {active.length > 0 && <button className="link" onClick={() => setF({ cat: null, price: null, rating: null, inNigeria: false, fast: false, hideOos: false, deals: dealsMode, color: null })}>Clear all</button>}
              </div>
              <label className="sort">
                <span className="muted small">Sort</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </label>
            </div>

            {results.length === 0 ? (
              <Empty
                icon="SearchX"
                title={q ? `No matches for “${q}”` : 'Nothing matches these filters'}
                body={suggestion ? <>Did you mean <Link to={`/search?q=${encodeURIComponent(suggestion)}`} onClick={() => dispatch({ type: 'searched', q: suggestion })}><b>{suggestion}</b></Link>? We've noted this search so our sourcing team can find it.</> : 'Try fewer filters or a different word. We log unmatched searches to source new products.'}
              />
            ) : (
              <LayoutGroup>
                <motion.div layout className="grid">
                  <AnimatePresence mode="popLayout">
                    {results.map((p, i) => (
                      <motion.div key={p.id} layout initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.25 }}>
                        <ProductCard p={p} i={i} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </LayoutGroup>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {drawer && (
          <>
            <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.div className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }} onDragEnd={(_, i) => i.offset.y > 120 && setDrawer(false)}>
              <div className="sheet-handle" />
              <SectionHead title="Filters"><button className="btn btn-primary sm" onClick={() => setDrawer(false)}>Show {results.length}</button></SectionHead>
              <Filters f={f} set={setF} colors={colors} counts={counts} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Page>
  )
}
