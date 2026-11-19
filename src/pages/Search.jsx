import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { useStore } from '../store/Store'
import { Page, ProductCard, Empty, Countdown, SectionHead, GRID, wrap, linkCls, chipCls, chipOn, kicker } from '../components/common'
import { CATEGORIES, PRODUCTS } from '../data/catalog'
import { Icon } from '../components/Icon'
import { searchProducts, didYouMean, SORTS, deliveryWindow, discountPct, naira } from '../lib/commerce'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'

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

const opt = 'flex cursor-pointer items-center gap-2 py-1 text-[14px]'
const group = 'border-b border-line pb-3.5'
const rowIco = 'inline-flex items-center gap-1.5'

// A radio group whose choice can be cleared by clicking it again
function ToggleRadios({ name, value, onChange, options }) {
  return (
    <RadioGroup name={name} value={value == null ? '' : String(value)} onValueChange={(v) => onChange(options.find((o) => String(o.value) === v).value)} className="block">
      {options.map((o) => (
        <label key={o.value} className={cn(opt, o.disabled && 'opacity-45')}>
          <RadioGroupItem value={String(o.value)} className="ml-[5px] mr-[3px] mt-[3px]" onClick={() => value === o.value && onChange(null)} />
          {typeof o.label === 'string' ? <span className="flex-1">{o.label}</span> : o.label}{o.extra}
        </label>
      ))}
    </RadioGroup>
  )
}

function Filters({ f, set, colors, counts }) {
  const pick = (key) => (v) => set({ ...f, [key]: v })
  const flag = (key, label) => (
    <label className={opt}><Checkbox className="m-[3px] ml-1" checked={!!f[key]} onCheckedChange={() => set({ ...f, [key]: !f[key] })} />{typeof label === 'string' ? <span className="flex-1">{label}</span> : label}</label>
  )
  return (
    <div className="flex flex-col gap-[18px]">
      <div className={group}>
        <h4>Category</h4>
        <ToggleRadios name="cat" value={f.cat} onChange={pick('cat')} options={CATEGORIES.map((c) => ({
          value: c.id, disabled: !counts[c.id],
          label: <span className={cn(rowIco, 'flex-1')}><Icon name={c.icon} size={15} className="text-muted-foreground" /> {c.name}</span>,
          extra: <span className="text-[13px] text-muted-foreground">{counts[c.id] || 0}</span>,
        }))} />
      </div>
      <div className={group}>
        <h4>Price</h4>
        <ToggleRadios name="price" value={f.price} onChange={pick('price')} options={PRICE_BANDS.map((b, k) => ({ value: k, label: bandLabel(b) }))} />
      </div>
      <div className={group}>
        <h4>Customer rating</h4>
        <ToggleRadios name="rating" value={f.rating} onChange={pick('rating')} options={[4.5, 4].map((r) => ({ value: r, label: <span className={cn(rowIco, 'flex-1')}><Icon name="Star" size={14} fill="currentColor" className="text-[#ffb400]" /> {r} & up</span> }))} />
      </div>
      <div className={group}>
        <h4>Availability & delivery</h4>
        {flag('inNigeria', '🇳🇬 In stock in Nigeria')}
        {flag('fast', <span className={cn(rowIco, 'flex-1')}><Icon name="Zap" size={14} /> Arrives within 5 days</span>)}
        {flag('hideOos', 'Hide out of stock')}
        {flag('deals', <span className={cn(rowIco, 'flex-1')}><Icon name="Tag" size={14} /> On sale</span>)}
      </div>
      {colors.length > 0 && (
        <div className={group}>
          <h4>Colour</h4>
          <div className="flex flex-wrap gap-2">{colors.map((c) => <button key={c} className={cn(chipCls, f.color === c && chipOn)} aria-pressed={f.color === c} onClick={() => set({ ...f, color: f.color === c ? null : c })}>{c}</button>)}</div>
        </div>
      )}
    </div>
  )
}

export default function Search({ dealsMode = false }) {
  const { getProduct, state, dispatch } = useStore()
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
    <Page className="tw">
      <div className={wrap}>
        {dealsMode ? (
          <motion.div className="mb-5 mt-5 flex flex-wrap items-center justify-between gap-5 rounded-lg bg-[linear-gradient(120deg,#ff6418,var(--color-orange)_40%,var(--color-sun))] px-8 py-7 text-white" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div>
              <div className={cn(kicker, 'text-white/85')}>Today only</div>
              <h1 className={cn(rowIco, 'text-white')}><Icon name="Zap" size={30} fill="currentColor" /> Flash deals</h1>
              <p className="mt-1.5 opacity-92">Genuine discounts against our previous selling price. Margin-checked, never fake.</p>
            </div>
            <div className="flex flex-col items-end gap-1.5 max-sm:items-start"><span className="text-[13px]">Ends in</span><Countdown to={flashEnds} /></div>
          </motion.div>
        ) : (
          <div className="mb-4 mt-[22px] flex flex-wrap items-baseline gap-3">
            <h1>{q ? <>Results for “{q}”</> : cat ? <span className={rowIco}><Icon name={cat.icon} size={28} className="text-orange" /> {cat.name}</span> : 'All products'}</h1>
            <span className="text-muted-foreground">{results.length} item{results.length === 1 ? '' : 's'}</span>
          </div>
        )}

        <div className="grid grid-cols-[240px_minmax(0,1fr)] gap-6 max-md:grid-cols-[minmax(0,1fr)]">
          <aside className="sticky top-[160px] max-h-[calc(100vh-180px)] min-w-0 self-start overflow-auto max-md:hidden"><Filters f={f} set={setF} colors={colors} counts={counts} /></aside>
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" className="hidden max-md:inline-flex" onClick={() => setDrawer(true)}><Icon name="SlidersHorizontal" size={15} /> Filters {active.length ? `(${active.length})` : ''}</Button>
              <div className="flex flex-1 flex-wrap items-center gap-1.5">
                <AnimatePresence>
                  {active.map((a) => <motion.span layout key={a} className={cn(chipCls, chipOn)} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>{a}</motion.span>)}
                </AnimatePresence>
                {active.length > 0 && <button className={linkCls} onClick={() => setF({ cat: null, price: null, rating: null, inNigeria: false, fast: false, hideOos: false, deals: dealsMode, color: null })}>Clear all</button>}
              </div>
              <label className="flex items-center gap-2">
                <span className="text-[13px] text-muted-foreground">Sort</span>
                <NativeSelect value={sort} onChange={(e) => setSort(e.target.value)} className="h-auto rounded-lg border-[1.5px] border-line bg-white py-[9px] pl-3 pr-7 text-[length:inherit] leading-[21px] max-sm:leading-[19px] shadow-none focus-visible:border-brand focus-visible:ring-0 md:text-[length:inherit]" iconClassName="right-3 text-ink opacity-70">
                  {Object.entries(SORTS).map(([k, v]) => <NativeSelectOption key={k} value={k}>{v.label}</NativeSelectOption>)}
                </NativeSelect>
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
                <motion.div layout className={GRID.auto}>
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

      {/* Mobile filters: bottom sheet, drag down to close */}
      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="bottom" showCloseButton={false} className="z-90 gap-0 border-0 bg-transparent shadow-none" overlayClassName="z-80">
          <motion.div className="tw max-h-[85vh] overflow-auto rounded-t-lg bg-white px-5 pb-[30px] pt-2.5" drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }} onDragEnd={(_, i) => i.offset.y > 120 && setDrawer(false)}>
            <div className="mx-auto mb-3.5 h-[5px] w-11 rounded-[3px] bg-line" />
            <SheetTitle className="sr-only">Filters</SheetTitle>
            <SheetDescription className="sr-only">Narrow down the products shown</SheetDescription>
            <SectionHead title="Filters"><Button size="sm" onClick={() => setDrawer(false)}>Show {results.length}</Button></SectionHead>
            <Filters f={f} set={setF} colors={colors} counts={counts} />
          </motion.div>
        </SheetContent>
      </Sheet>
    </Page>
  )
}
