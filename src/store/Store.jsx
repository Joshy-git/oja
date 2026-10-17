import { createContext, useContext, useEffect, useMemo, useReducer, useCallback } from 'react'
import { PRODUCTS, productById, registerProduct, patchProduct, catId } from '../data/catalog'
import { makeOrderRef, stagesFor } from '../lib/commerce'

const KEY = 'ooja-state-v1'
const H = 3600000

function seedOrders() {
  const now = Date.now()
  const mk = (ref, items, fromChina, stageIdx, ageH, state) => {
    const stages = fromChina ? 10 : 6
    const events = Array.from({ length: stageIdx + 1 }, (_, i) => ({ at: now - ageH * H + i * (ageH / stages) * H, idx: i }))
    const subtotal = items.reduce((s, l) => s + l.unitPrice * l.qty, 0)
    return { ref, items, fromChina, stageIdx, events, subtotal, shipping: 1500, discount: 0, total: subtotal + 1500, address: { name: 'Ada Okafor', phone: '0803 000 0000', line: '12 Admiralty Way, Lekki Phase 1', state }, payment: 'Card (Paystack)', createdAt: now - ageH * H, status: 'active' }
  }
  return [
    mk('OJ-260921-K7Q2M', [{ id: 'p18', title: productById('p18').title, hue: productById('p18').hue, color: 'Pink', size: null, qty: 1, unitPrice: 21500 }], true, 5, 220, 'Lagos'),
    mk('OJ-260929-B3XZ8', [{ id: 'p17', title: productById('p17').title, hue: productById('p17').hue, color: 'Black', size: null, qty: 2, unitPrice: 3500 }, { id: 'p2', title: productById('p2').title, hue: productById('p2').hue, color: 'Black', size: null, qty: 1, unitPrice: 18900 }], false, 5, 96, 'Lagos'),
  ]
}

const initial = {
  user: null,
  accounts: [], // registered shoppers (prototype: phone or email accounts, keyed by id)
  lastLogin: null, // id of the account used last on this device
  authOpen: false, // sign-in pop-up (not persisted)
  addresses: [{ id: 'a1', name: 'Ada Okafor', phone: '0803 000 0000', line: '12 Admiralty Way, Lekki Phase 1', state: 'Lagos', default: true }],
  deliveryState: 'Lagos',
  language: 'en',
  cart: [],
  saved: [],
  wishlist: [],
  viewed: [],
  searches: [],
  orders: seedOrders(),
  cases: [],
  coupon: null,
  usedFirstOrder: false,
  catalog: Object.fromEntries(PRODUCTS.map((p) => [p.id, { price: p.price, qty: p.qty, stock: p.stock, published: true }])),
  audit: [],
  customProducts: [], // products added in the dashboard (form inputs; rebuilt on load)
  admin: {}, // dashboard choices: case statuses, paused coupons, review moderation, settings
  toasts: [],
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return initial
    const saved = JSON.parse(raw)
    ;(saved.customProducts || []).forEach(registerProduct)
    Object.entries(saved.catalog || {}).forEach(([id, patch]) => { if (patch.category) patch.category = catId(patch.category); patchProduct(id, patch) })
    return { ...initial, ...saved, toasts: [], authOpen: false }
  } catch { return initial }
}

const lineKey = (id, color, size) => `${id}|${color || ''}|${size || ''}`

function reducer(s, a) {
  switch (a.type) {
    case 'login': return { ...s, user: a.user, lastLogin: a.user.id || s.lastLogin, authOpen: false }
    case 'register': return { ...s, accounts: [...s.accounts.filter((u) => u.id !== a.user.id), a.user], user: a.user, lastLogin: a.user.id, authOpen: false }
    case 'openAuth': return { ...s, authOpen: true }
    case 'closeAuth': return { ...s, authOpen: false }
    case 'forgetLastLogin': return { ...s, lastLogin: null }
    case 'logout': return { ...s, user: null }
    case 'setDeliveryState': return { ...s, deliveryState: a.state }
    case 'setLanguage': return { ...s, language: a.language }
    case 'addAddress': return { ...s, addresses: [...s.addresses.map((x) => ({ ...x, default: a.addr.default ? false : x.default })), a.addr], deliveryState: a.addr.default ? a.addr.state : s.deliveryState }
    case 'removeAddress': return { ...s, addresses: s.addresses.filter((x) => x.id !== a.id) }
    case 'addToCart': {
      const key = lineKey(a.id, a.color, a.size)
      const ex = s.cart.find((l) => l.key === key)
      const cart = ex ? s.cart.map((l) => (l.key === key ? { ...l, qty: Math.min(l.qty + (a.qty || 1), 10) } : l)) : [...s.cart, { key, id: a.id, color: a.color, size: a.size, qty: a.qty || 1 }]
      return { ...s, cart }
    }
    case 'setQty': return { ...s, cart: s.cart.map((l) => (l.key === a.key ? { ...l, qty: Math.max(1, Math.min(10, a.qty)) } : l)) }
    case 'removeLine': return { ...s, cart: s.cart.filter((l) => l.key !== a.key) }
    case 'saveForLater': {
      const l = s.cart.find((x) => x.key === a.key)
      return { ...s, cart: s.cart.filter((x) => x.key !== a.key), saved: [l, ...s.saved.filter((x) => x.key !== a.key)] }
    }
    case 'moveToCart': {
      const l = s.saved.find((x) => x.key === a.key)
      return { ...s, saved: s.saved.filter((x) => x.key !== a.key), cart: [...s.cart.filter((x) => x.key !== a.key), l] }
    }
    case 'toggleWish': return { ...s, wishlist: s.wishlist.includes(a.id) ? s.wishlist.filter((x) => x !== a.id) : [a.id, ...s.wishlist] }
    case 'viewed': return { ...s, viewed: [a.id, ...s.viewed.filter((x) => x !== a.id)].slice(0, 20) }
    case 'searched': return a.q.trim() ? { ...s, searches: [a.q.trim(), ...s.searches.filter((x) => x !== a.q.trim())].slice(0, 8) } : s
    case 'clearSearches': return { ...s, searches: [] }
    case 'applyCoupon': return { ...s, coupon: a.coupon }
    // Orders entered by staff in the dashboard (phone, WhatsApp, walk-in): keeps the shopper's cart untouched
    case 'adminCreateOrder': {
      if (s.orders.some((o) => o.ref === a.order.ref)) return s
      const catalog = { ...s.catalog }
      a.order.items.forEach((it) => { const c = catalog[it.id]; if (c?.stock === 'nigeria') catalog[it.id] = { ...c, qty: Math.max(0, c.qty - it.qty) } })
      return { ...s, orders: [a.order, ...s.orders], catalog, audit: [{ at: Date.now(), actor: a.actor || 'Super Admin', action: `Created order ${a.order.ref} for ${a.order.address.name} (${a.order.items.length} item${a.order.items.length === 1 ? '' : 's'})` }, ...s.audit].slice(0, 100) }
    }
    case 'updateOrder': return { ...s, orders: s.orders.map((o) => (o.ref === a.ref ? { ...o, ...a.patch } : o)), audit: a.log ? [{ at: Date.now(), actor: a.actor || 'Super Admin', action: a.log }, ...s.audit].slice(0, 100) : s.audit }
    case 'placeOrder': {
      // Idempotent on order ref — a double submit can never create a second order (PRD §27)
      if (s.orders.some((o) => o.ref === a.order.ref)) return s
      const catalog = { ...s.catalog }
      a.order.items.forEach((it) => { const c = catalog[it.id]; if (c?.stock === 'nigeria') catalog[it.id] = { ...c, qty: Math.max(0, c.qty - it.qty) } })
      return { ...s, orders: [a.order, ...s.orders], cart: [], coupon: null, catalog, usedFirstOrder: true }
    }
    case 'advanceOrder': return {
      ...s,
      orders: s.orders.map((o) => {
        if (o.ref !== a.ref) return o
        const max = stagesFor(o).length - 1
        if (o.stageIdx >= max) return o
        return { ...o, stageIdx: o.stageIdx + 1, events: [...o.events, { at: Date.now(), idx: o.stageIdx + 1 }] }
      }),
      audit: a.actor ? [{ at: Date.now(), actor: a.actor, action: `Advanced order ${a.ref}` }, ...s.audit] : s.audit,
    }
    case 'cancelOrder': return { ...s, orders: s.orders.map((o) => (o.ref === a.ref ? { ...o, status: 'cancelled', cancelledAt: Date.now() } : o)) }
    case 'openCase': return { ...s, cases: [a.c, ...s.cases] }
    case 'saveProduct': return {
      ...s,
      catalog: { ...s.catalog, [a.id]: { ...s.catalog[a.id], ...a.patch } },
      audit: [{ at: Date.now(), actor: a.actor || 'Super Admin', action: `Edited product ${a.id}: ${a.patch.title || ''}` }, ...s.audit].slice(0, 100),
    }
    case 'addProduct': return {
      ...s,
      customProducts: [...s.customProducts, a.input],
      catalog: { ...s.catalog, [a.input.id]: { price: a.input.price, qty: a.input.qty, stock: a.input.stock, published: a.input.published, ...(a.patch || {}) } },
      audit: [{ at: Date.now(), actor: a.actor || 'Super Admin', action: `Added product ${a.input.id}: ${a.input.title}` }, ...s.audit].slice(0, 100),
    }
    case 'setAdmin': return { ...s, admin: { ...s.admin, [a.key]: { ...(s.admin[a.key] || {}), ...a.value } }, audit: a.log ? [{ at: Date.now(), actor: a.actor || 'Super Admin', action: a.log }, ...s.audit].slice(0, 100) : s.audit }
    case 'updateCatalog': return {
      ...s,
      catalog: { ...s.catalog, [a.id]: { ...s.catalog[a.id], ...a.patch } },
      audit: [{ at: Date.now(), actor: 'Super Admin', action: `${a.id}: ${Object.entries(a.patch).map(([k, v]) => `${k} → ${v}`).join(', ')}` }, ...s.audit].slice(0, 100),
    }
    case 'toast': return { ...s, toasts: [...s.toasts, a.toast] }
    case 'dismissToast': return { ...s, toasts: s.toasts.filter((t) => t.id !== a.id) }
    // Clears dashboard-only choices (coupons, POs, shipments…) but keeps the keys listed in `keep`
    case 'resetAdmin': return { ...s, admin: Object.fromEntries(Object.entries(s.admin).filter(([k]) => (a.keep || []).includes(k) || k.endsWith('View'))), audit: [{ at: Date.now(), actor: 'Super Admin', action: 'Reset dashboard changes (settings kept)' }, ...s.audit].slice(0, 100) }
    case 'reset': return { ...initial, orders: seedOrders() }
    default: return s
  }
}

const Ctx = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    try { const { toasts, authOpen, ...persist } = state; localStorage.setItem(KEY, JSON.stringify(persist)) } catch {}
  }, [state])

  const toast = useCallback((msg, opts = {}) => {
    const id = Math.random().toString(36).slice(2)
    dispatch({ type: 'toast', toast: { id, msg, ...opts } })
    setTimeout(() => dispatch({ type: 'dismissToast', id }), opts.ms || 2600)
  }, [])

  // Merge admin-controlled catalog fields (price/stock/publish) into products
  // Visibility: scheduled products go live once their publish date has passed
  const isLive = (p) => (p.visibility === 'hidden' ? false : p.visibility === 'scheduled' ? (p.publishAt || 0) <= Date.now() : p.published)
  const products = useMemo(() => PRODUCTS.map((p) => { const m = { ...p, ...state.catalog[p.id], ...(state.catalog[p.id]?.qty === 0 && state.catalog[p.id]?.stock === 'nigeria' ? { stock: 'oos' } : {}) }; return { ...m, published: isLive(m) } }), [state.catalog])
  const live = useMemo(() => products.filter((p) => p.published), [products])
  const getProduct = useCallback((id) => products.find((p) => p.id === id), [products])

  const cartCount = state.cart.reduce((n, l) => n + l.qty, 0)

  const value = useMemo(() => ({ state, dispatch, toast, products, live, getProduct, cartCount, makeOrderRef }), [state, toast, products, live, getProduct, cartCount])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)
