# Oja — storefront & operations prototype

A frontend prototype of the Oja PRD v1.0 (affordable imports delivered across Africa), built with Vite, React 19, React Router and Framer Motion. It runs on mock data stored in the browser's `localStorage`. **There is no backend, database or real payment yet**: every change made in the storefront or the operations dashboard is saved only in the browser that made it.

- Live preview: https://ooja-olive.vercel.app (dashboard at `/admin`)
- Design system and screens: [Figma — Oja Project](https://www.figma.com/design/fjhXGiRtyotxlO8XpgYHYh/Oja-Project)

## Getting started

Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the production build locally
```

## What's in it

| Area | Route | PRD section |
|---|---|---|
| Home / discovery feed, flash deals, best sellers, new arrivals, rules-based "Picked for you" | `/` | 7.1, 13, 14 |
| Search with typo tolerance, autocomplete, filters (price, rating, stock, ≤5-day delivery, colour), sort; logs zero-result searches | `/search`, `/deals` | 7.2 |
| Product page: gallery, variants, delivery estimate by state, landed-cost-inclusive price, reviews (verified, filterable, separate delivery score), bought-together, report | `/p/:id` | 7.3, 15 |
| Cart: qty, save for later, coupons (`OJA10`, `FREESHIP`, `SAVE2K`), buy-more-save-more, free-delivery bar | `/cart` | 7.4 |
| Checkout: address + phone, final NGN total disclosed, payment method, server-verification flow, idempotent order ref, price snapshot | `/checkout` | 7.5, 27 |
| Order tracking: China → Nigeria milestones with timestamps, cancel, returns | `/orders/:ref` | 8, 9, 16 |
| Phone + OTP sign-in, addresses, wishlist, notification prefs | `/account` | 20 |
| Help centre, FAQ, support/return cases with evidence upload + priority | `/help` | 16, 17 |
| Operations dashboard: overview KPIs, orders (create order), products (full-page editor, margin guardrail, publish), customers, inventory (restock), logistics (shipments), procurement (purchase orders), promotions (coupons that work at checkout), reviews, support cases, audit log, team & permissions, settings. A role switcher in the sidebar footer simulates each staff role and read-only access | `/admin` | 10–12, 18, 19 |

Use **▶ Simulate next update** on an order page (or the Orders tab in admin) to advance a shipment through the lifecycle. **Account → Notifications → Reset prototype data** clears everything.

## Structure

```
src/
  App.jsx              routes
  styles.css           all styles; design tokens are CSS variables at the top (:root)
  data/catalog.js      mock catalog, categories, reviews, coupons, product photos
  lib/commerce.js      pricing, delivery zones and fees, search, recommendations, order stages
  lib/sanitize.js      HTML sanitiser for rich-text product descriptions
  store/Store.jsx      app state (cart, orders, accounts, admin data, audit log) via one reducer + localStorage
  components/          Layout (header, footer, nav), AuthModal, shared UI, Icon registry (lucide-react)
  pages/               one file per storefront screen
  pages/Admin.jsx      dashboard shell (sidebar, roles, routing between views); lazy-loaded
  pages/Admin*.jsx     one file per dashboard page (Orders, Products, Customers, Inventory, …)
  pages/ProductEditor.jsx  full-page create/edit product screen
```

### Conventions

- **Design tokens:** colours, radius and shadows are CSS variables in `styles.css` (`--brand` navy `#0b2045`, `--accent` orange `#ff7a2e`, 8px radius). The same tokens exist as Figma variables in the design file.
- **Fonts:** Bricolage Grotesque for headings, prices and stats; Inter for everything else (loaded in `index.html`).
- **Dashboard list pages** share one layout: header with actions → stat cards → underline tabs → search + Filter / Sort / Show statistics → table → pagination. Their CSS classes are `ord-*` and `prd-*`; new list pages should reuse them.
- **Pop-ups** (Create order, Add customer, New shipment…) render through `createPortal` into `document.body`, because the animated page wrapper breaks `position: fixed`.
- **Icons:** add any new lucide icon to the import and the `ICONS` map in `src/components/Icon.jsx` before using it by name.
- **Dashboard data:** choices made in the dashboard live under `state.admin.<key>` and are written with the `setAdmin` action, which also records the audit log. Settings → Data → *Reset dashboard changes* clears them.

## Deploying

The live preview is a static Vite build hosted on Vercel. `vercel.json` rewrites every non-asset path to `index.html` so client-side routes work on refresh. Any static host works the same way: run `npm run build` and serve `dist/` with that rewrite.

## What a production version still needs

- A backend and database for products, orders, customers, stock and staff accounts (the reducer actions in `Store.jsx` map closely to the API calls needed).
- Real authentication (shopper OTP and staff sign-in) and server-side role checks. The dashboard role switcher is a simulation only.
- Payment provider integration with server-side verification, and real email/SMS notifications.

## Product photos

Product images are free-to-use photos from [Unsplash](https://unsplash.com/license), listed per product in `IMAGES` in `src/data/catalog.js` and served from Unsplash's CDN as compressed square crops. They're stand-ins chosen to match each product type. Replace them with your own product photography (or your CDN's keys/URLs) before launch. If an image fails to load, the card falls back to an emoji tile.

