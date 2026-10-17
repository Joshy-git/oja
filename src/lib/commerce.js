import { PRODUCTS, CATEGORIES, COUPONS } from '../data/catalog'

export const naira = (n) => '₦' + Math.round(n).toLocaleString('en-NG')

export const discountPct = (p) => (p.refPrice ? Math.round((1 - p.price / p.refPrice) * 100) : 0)

export const canBuy = (p) => p.stock !== 'oos'

// ---------- Delivery zones (PRD §7.3/§7.5) ----------
export const STATES = ['Lagos', 'Abuja (FCT)', 'Rivers', 'Oyo', 'Kano', 'Enugu', 'Edo', 'Kaduna', 'Delta', 'Ogun', 'Anambra', 'Kwara', 'Other']
const ZONE = { Lagos: 1, 'Abuja (FCT)': 2, Rivers: 2, Oyo: 2, Ogun: 2, Enugu: 3, Edo: 3, Kano: 3, Kaduna: 3, Delta: 3, Anambra: 3, Kwara: 3, Other: 3 }
const BASE_DAYS = { nigeria: [1, 3], transit: [6, 10], china: [12, 20], preorder: [21, 30], oos: [0, 0] }
const ZONE_EXTRA = { 1: 0, 2: 2, 3: 4 }
export const SHIP_FEE = { 1: 1500, 2: 2500, 3: 3500 }
export const FREE_SHIP_THRESHOLD = 50000

export function deliveryWindow(stock, state = 'Lagos') {
  const [a, b] = BASE_DAYS[stock] || [3, 7]
  const extra = ZONE_EXTRA[ZONE[state] || 3]
  return [a + extra, b + extra]
}
export function windowLabel(stock, state) {
  const [a, b] = deliveryWindow(stock, state)
  const fmt = (d) => new Date(Date.now() + d * 86400000).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })
  return `${fmt(a)} – ${fmt(b)}`
}

export function shippingFee(state, subtotal, coupon) {
  if (subtotal >= FREE_SHIP_THRESHOLD) return 0
  if (coupon?.type === 'ship' && subtotal >= coupon.min) return 0
  return SHIP_FEE[ZONE[state] || 3]
}

export function couponDiscount(coupon, subtotal) {
  if (!coupon || subtotal < (coupon.min || 0)) return 0
  if (coupon.type === 'percent') return Math.min(Math.round((subtotal * coupon.value) / 100), coupon.cap || Infinity)
  if (coupon.type === 'flat') return coupon.value
  return 0
}

// Buy-more-save-more: 3+ units of one item = 5% off that line
export const bundleSaving = (line, p) => (line.qty >= 3 ? Math.round(p.price * line.qty * 0.05) : 0)

// `extra` holds coupons created in the operations dashboard (state.admin.coupons)
export function findCoupon(code, extra = {}) {
  const k = (code || '').trim().toUpperCase()
  return COUPONS[k] || extra[k] || null
}

// ---------- Search with typo tolerance (PRD §7.2) ----------
function lev(a, b) {
  if (a === b) return 0
  const m = a.length, n = b.length
  if (!m || !n) return m || n
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return prev[n]
}
const words = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)

function tokenScore(q, w) {
  if (w === q) return 3
  if (w.startsWith(q)) return 2.4
  if (q.length >= 4 && w.includes(q)) return 1.8
  const tol = q.length >= 7 ? 2 : q.length >= 4 ? 1 : 0
  if (tol && Math.abs(w.length - q.length) <= tol && lev(q, w) <= tol) return 1.5
  // dropped vowels / short typos: "bnk" → "bank", "erbds" → "earbuds"
  if (q.length >= 3 && q[0] === w[0] && w.length - q.length <= 3 && isSubsequence(q, w)) return 1.2
  return 0
}
function isSubsequence(q, w) {
  let i = 0
  for (const ch of w) if (ch === q[i]) i++
  return i === q.length
}

export function scoreProduct(p, query) {
  const qs = words(query)
  if (!qs.length) return 1
  const cat = CATEGORIES.find((c) => c.id === p.category)
  const hay = [...words(p.title), ...p.tags.flatMap(words), ...words(cat.name), p.sku.toLowerCase()]
  let total = 0, misses = 0
  for (const q of qs) {
    let best = 0
    for (const w of hay) best = Math.max(best, tokenScore(q, w))
    if (!best) misses++
    total += best
  }
  // every word must match, except one stray word in a 3+ word query
  if (misses > (qs.length >= 3 ? 1 : 0)) return 0
  return total + Math.log10(p.sold + 10) * 0.2
}

export function searchProducts(query) {
  return PRODUCTS.map((p) => ({ p, s: scoreProduct(p, query) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.p)
}

export function didYouMean(query) {
  const qs = words(query)
  const vocab = [...new Set(PRODUCTS.flatMap((p) => [...words(p.title), ...p.tags]))]
  const fixed = qs.map((q) => {
    let best = q, bd = 3
    for (const w of vocab) { const d = lev(q, w); if (d < bd) { bd = d; best = w } }
    return best
  })
  const s = fixed.join(' ')
  return s !== qs.join(' ') ? s : null
}

export function autocomplete(query) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const titles = PRODUCTS.filter((p) => scoreProduct(p, q) > 0).slice(0, 5).map((p) => ({ type: 'product', label: p.title, id: p.id, product: p }))
  const cats = CATEGORIES.filter((c) => c.name.toLowerCase().includes(q)).map((c) => ({ type: 'category', label: c.name, id: c.id, icon: c.icon }))
  return [...cats, ...titles].slice(0, 7)
}

export const SORTS = {
  relevance: { label: 'Relevance', fn: null },
  popular: { label: 'Top sales', fn: (a, b) => b.sold - a.sold },
  newest: { label: 'Newest', fn: (a, b) => b.createdAt - a.createdAt },
  priceAsc: { label: 'Price: low to high', fn: (a, b) => a.price - b.price },
  priceDesc: { label: 'Price: high to low', fn: (a, b) => b.price - a.price },
  rating: { label: 'Top rated', fn: (a, b) => b.rating - a.rating || b.reviews - a.reviews },
}

// ---------- Rules-based recommendations (PRD §14) ----------
export function personalizedFeed(signals) {
  const { viewed = [], cart = [], purchased = [], searches = [] } = signals
  const catWeight = {}
  const bump = (id, w) => { const p = PRODUCTS.find((x) => x.id === id); if (p) catWeight[p.category] = (catWeight[p.category] || 0) + w }
  viewed.forEach((id) => bump(id, 1))
  cart.forEach((id) => bump(id, 2))
  purchased.forEach((id) => bump(id, 1.5))
  const searchHits = new Set(searches.flatMap((q) => searchProducts(q).slice(0, 4).map((p) => p.id)))
  return [...PRODUCTS]
    .filter((p) => canBuy(p))
    .map((p) => ({
      p,
      s: (catWeight[p.category] || 0) * 2 + (searchHits.has(p.id) ? 3 : 0) + p.rating + Math.log10(p.sold) * 0.8 + (p.refPrice ? 0.6 : 0) - (viewed.includes(p.id) ? 2 : 0),
    }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p)
}

export function relatedProducts(p, n = 8) {
  return PRODUCTS.filter((x) => x.id !== p.id && canBuy(x))
    .map((x) => ({ x, s: (x.category === p.category ? 5 : 0) + x.tags.filter((t) => p.tags.includes(t)).length * 2 + x.rating }))
    .sort((a, b) => b.s - a.s).slice(0, n).map((o) => o.x)
}

const FBT = { p1: ['p2', 'p4'], p2: ['p4', 'p40'], p5: ['p2', 'p1'], p7: ['p11', 'p2'], p13: ['p14', 'p15'], p17: ['p19', 'p18'], p26: ['p27', 'p28'], p32: ['p33', 'p1'], p35: ['p36', 'p37'] }
export function frequentlyBoughtTogether(p) {
  const ids = FBT[p.id] || relatedProducts(p, 2).map((x) => x.id)
  return ids.map((id) => PRODUCTS.find((x) => x.id === id)).filter((x) => x && canBuy(x))
}

// ---------- Order lifecycle (PRD §8) ----------
export const ORDER_STAGES = [
  { key: 'placed', label: 'Order Placed', desc: 'We\'ve received your order.', icon: 'ReceiptText' },
  { key: 'paid', label: 'Payment Confirmed', desc: 'Payment verified with your bank.', icon: 'BadgeCheck' },
  { key: 'processing', label: 'Processing', desc: 'Order validated and stock allocated.', icon: 'Settings' },
  { key: 'sourcing', label: 'Sourcing', desc: 'Being purchased from our approved supplier.', icon: 'Factory', china: true },
  { key: 'chinaWh', label: 'China Warehouse', desc: 'Inspected and packed in Guangzhou.', icon: 'Package', china: true },
  { key: 'transit', label: 'In Transit', desc: 'On its way to Nigeria.', icon: 'Plane', china: true },
  { key: 'customs', label: 'Customs/Clearing', desc: 'Clearing at Lagos port. Duties already covered.', icon: 'Stamp', china: true },
  { key: 'ngWh', label: 'Nigeria Warehouse', desc: 'Arrived at our Ikeja fulfillment centre.', icon: 'Warehouse' },
  { key: 'out', label: 'Out for Delivery', desc: 'Your rider is on the way.', icon: 'Bike' },
  { key: 'delivered', label: 'Delivered', desc: 'Signed for. Enjoy!', icon: 'PartyPopper' },
]
// Local-stock orders skip the China legs
export function stagesFor(order) {
  return order.fromChina ? ORDER_STAGES : ORDER_STAGES.filter((s) => !s.china)
}

export function makeOrderRef() {
  const d = new Date()
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `OJ-${ymd}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}
