// Full-page product editor for the operations dashboard (create, edit, duplicate).
// Content edits are saved as catalog patches so the storefront, search and product
// pages pick them up; new products are registered into the shared catalog.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/Store'
import { Icon } from '../components/Icon'
import { CATEGORIES, STOCK, imgUrl, registerProduct, patchProduct, landedFrom } from '../data/catalog'
import { naira } from '../lib/commerce'

/* ---------- Safe rich text ---------- */
import { sanitizeHtml, plain } from '../lib/sanitize'
export { sanitizeHtml }

const TOOLS = [
  ['bold', 'B', 'Bold'], ['italic', 'I', 'Italic'], ['underline', 'U', 'Underline'], ['strikeThrough', 'S', 'Strikethrough'],
  ['h2', 'H2', 'Heading'], ['h3', 'H3', 'Subheading'], ['p', '¶', 'Paragraph'], ['blockquote', '❝', 'Quote'],
  ['insertUnorderedList', '•', 'Bulleted list'], ['insertOrderedList', '1.', 'Numbered list'], ['link', '🔗', 'Link'], ['removeFormat', 'Tx', 'Clear formatting'],
]
function RichText({ value, onChange }) {
  const ref = useRef(null)
  const range = useRef(null)
  const [linking, setLinking] = useState(false)
  const [url, setUrl] = useState('')
  useEffect(() => { if (ref.current) ref.current.innerHTML = value || '' }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const emit = () => onChange(sanitizeHtml(ref.current.innerHTML))
  const save = () => { const s = window.getSelection(); if (s.rangeCount && ref.current.contains(s.anchorNode)) range.current = s.getRangeAt(0) }
  const restore = () => { ref.current.focus(); if (range.current) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(range.current) } }
  const run = (cmd) => {
    if (cmd === 'link') { save(); setLinking(true); return }
    restore()
    if (['h2', 'h3', 'p', 'blockquote'].includes(cmd)) document.execCommand('formatBlock', false, cmd.toUpperCase())
    else document.execCommand(cmd)
    emit()
  }
  const addLink = () => {
    const u = url.trim()
    if (!/^https?:\/\/\S+$/.test(u)) return
    restore(); document.execCommand('createLink', false, u); emit(); setLinking(false); setUrl('')
  }
  return (
    <div className="rte">
      <div className="rte-bar" role="toolbar" aria-label="Formatting">
        {TOOLS.map(([cmd, label, title]) => (
          <button key={cmd} type="button" title={title} aria-label={title} onMouseDown={(e) => e.preventDefault()} onClick={() => run(cmd)} className={`rte-btn t-${cmd}`}>{label}</button>
        ))}
      </div>
      {linking && (
        <div className="rte-link"><input id="pe-link" autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink() } if (e.key === 'Escape') setLinking(false) }} />
          <button type="button" className="btn-mini" onClick={addLink}>Add link</button><button type="button" className="btn-mini" onClick={() => setLinking(false)}>Cancel</button></div>
      )}
      <div ref={ref} className="rte-area prose" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Description"
        data-placeholder="Describe the product: what it does, what's in the box, why shoppers will love it." onInput={emit} onBlur={save} onKeyUp={save} onMouseUp={save} />
    </div>
  )
}

/* ---------- Photos ---------- */
const MAX_PHOTOS = 6
function squareJpeg(file, size = 800) {
  return new Promise((resolve, reject) => {
    const src = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const s = Math.min(img.naturalWidth, img.naturalHeight)
      const c = document.createElement('canvas')
      c.width = c.height = Math.min(size, s)
      const ctx = c.getContext('2d')
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height)
      ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, c.width, c.height)
      URL.revokeObjectURL(src); resolve(c.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error('unreadable')) }
    img.src = src
  })
}
function ImagesCard({ images, onChange }) {
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [link, setLink] = useState('')
  const room = MAX_PHOTOS - images.length
  const add = async (files) => {
    setMsg('')
    const list = [...files], imgs = list.filter((f) => f.type.startsWith('image/')), problems = []
    if (imgs.length < list.length) problems.push('Only image files (JPG, PNG, WebP) can be added.')
    const ok = imgs.filter((f) => f.size <= 10 * 1024 * 1024)
    if (ok.length < imgs.length) problems.push('Photos over 10 MB were skipped.')
    if (ok.length > room) problems.push(`Up to ${MAX_PHOTOS} photos, so only ${Math.max(room, 0)} more were added.`)
    if (!ok.length || room <= 0) { setMsg(problems.join(' ') || `You already have ${MAX_PHOTOS} photos.`); return }
    setBusy(true)
    const out = []
    for (const f of ok.slice(0, room)) { try { out.push(await squareJpeg(f)) } catch { problems.push(`${f.name} couldn't be read.`) } }
    setBusy(false); onChange([...images, ...out]); setMsg(problems.join(' '))
  }
  const addLink = () => {
    const u = link.trim()
    if (!/^https:\/\/\S+$/.test(u)) return setMsg('Use a full https:// image link.')
    if (room <= 0) return setMsg(`You already have ${MAX_PHOTOS} photos.`)
    onChange([...images, u]); setLink(''); setMsg('')
  }
  const src = (k, w) => imgUrl(k, w)
  return (
    <div className="pe-card">
      <h4 className="pe-h">Product images <span className="pe-tip" title="The first photo is the main image on cards and the product page.">i</span></h4>
      <div className={`pe-main-img ${images.length ? '' : 'empty'}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files) }}>
        {images.length ? <img src={src(images[0], 800)} alt="Main product photo" /> : (
          <label className={`pe-drop ${drag ? 'drag' : ''}`}>
            <input id="pe-files-main" type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { add(e.target.files); e.target.value = '' }} />
            <span className="np-drop-ico"><Icon name={busy ? 'Hourglass' : 'Camera'} size={22} /></span>
            <b>{busy ? 'Preparing photos…' : 'Click to upload or drag photos here'}</b>
            <span className="muted small">JPG, PNG or WebP · up to 10 MB · cropped square</span>
          </label>
        )}
      </div>
      {images.length > 0 && (
        <div className="pe-thumbs">
          {images.map((k, i) => (
            <div key={k.slice(-32) + i} className={`pe-thumb ${i === 0 ? 'main' : ''}`}>
              <img src={src(k, 300)} alt={`Photo ${i + 1}`} />
              {i === 0 ? <span className="np-main-tag">Main</span> : <button type="button" className="np-make-main" onClick={() => onChange([k, ...images.filter((_, x) => x !== i)])}>Make main</button>}
              <button type="button" className="np-remove" onClick={() => onChange(images.filter((_, x) => x !== i))} aria-label={`Remove photo ${i + 1}`}><Icon name="X" size={13} /></button>
            </div>
          ))}
          {room > 0 && (
            <label className={`pe-thumb pe-add ${drag ? 'drag' : ''}`} onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files) }}>
              <input id="pe-files" type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { add(e.target.files); e.target.value = '' }} />
              <Icon name={busy ? 'Hourglass' : 'Plus'} size={20} /><span>{busy ? 'Adding…' : 'Add photo'}</span>
            </label>
          )}
        </div>
      )}
      <div className="np-link">
        <input id="pe-image-link" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="…or paste an image link (https://)" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }} />
        <button type="button" className="btn-mini" disabled={!link.trim()} onClick={addLink}>Add link</button>
      </div>
      <p className="muted small pe-hint">{images.length}/{MAX_PHOTOS} photos. The first one is the main image.</p>
      {msg && <div className="err small">{msg}</div>}
    </div>
  )
}

/* ---------- Editor ---------- */
const BRANDS = ['Oja Select', 'Anker', 'Xiaomi', 'Oraimo', 'Baseus', 'Ugreen', 'Tecno', 'Infinix', 'Generic']
const today = () => new Date().toISOString().slice(0, 10)
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60)

function formFrom(p) {
  if (!p) return { brand: 'Oja Select', category: 'electronics', title: '', price: '', refPrice: '', description: '', pitch: '', landedTotal: '', stock: 'nigeria', qty: '', supplier: '', colors: '', sizes: '', tags: '', images: [], visibility: 'published', publishAt: today(), seoTitle: '', seoDesc: '', slug: '' }
  return {
    brand: p.specs?.Brand || '', category: p.category, title: p.title, price: String(p.price), refPrice: p.refPrice ? String(p.refPrice) : '',
    description: p.description || (p.pitch ? `<p>${p.pitch}</p>` : ''), pitch: p.pitch || '', landedTotal: String(p.landed.total), stock: p.stock === 'oos' ? 'nigeria' : p.stock, qty: String(p.qty),
    supplier: p.supplier || '', colors: (p.variants.color || []).join(', '), sizes: (p.variants.size || []).join(', '), tags: (p.tags || []).join(', '), images: [...(p.images || [])],
    visibility: p.visibility || (p.published ? 'published' : 'hidden'), publishAt: p.publishAt ? new Date(p.publishAt).toISOString().slice(0, 10) : today(),
    seoTitle: p.seo?.title || '', seoDesc: p.seo?.description || '', slug: p.seo?.slug || '',
  }
}

export default function ProductEditor({ productId, minMargin, onBack, onOpen, edit }) {
  const { products, dispatch, toast } = useStore()
  const p = productId === 'new' ? null : products.find((x) => x.id === productId)
  const initial = useMemo(() => formFrom(p), [productId]) // eslint-disable-line react-hooks/exhaustive-deps
  const [f, setF] = useState(initial)
  const [tried, setTried] = useState(false)
  const [leaving, setLeaving] = useState(false)
  useEffect(() => { setF(initial); setTried(false); setLeaving(false) }, [initial])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const dirty = JSON.stringify(f) !== JSON.stringify(initial)
  const isNew = !p

  const price = +f.price, landed = +f.landedTotal, ref = +f.refPrice, qty = f.qty === '' ? NaN : +f.qty
  const margin = price > 0 && landed > 0 ? (price - landed) / price : null
  const minM = minMargin / 100
  const errors = {
    title: f.title.trim().length < 3 && 'Give the product a name (at least 3 characters).',
    price: !(price > 0) && 'Enter a selling price above ₦0.',
    landedTotal: !(landed > 0) && 'Enter the landed cost per unit.',
    margin: margin !== null && margin < minM && `Margin is ${(margin * 100).toFixed(1)}%, below the ${minMargin}% minimum. Price it at ${naira(Math.ceil(landed / (1 - minM)))} or more.`,
    refPrice: f.refPrice !== '' && !(ref > price) && 'The compare-at price must be higher than the selling price.',
    qty: !(Number.isInteger(qty) && qty >= 0) && 'Enter the units on hand (0 or more).',
    publishAt: f.visibility === 'scheduled' && !f.publishAt && 'Pick the date it should go live.',
  }
  const firstError = Object.values(errors).find(Boolean)
  const show = (k) => tried && errors[k] && <div className="err small">{errors[k]}</div>

  const list = (s) => s.split(',').map((x) => x.trim()).filter(Boolean)
  const patchFrom = (form) => {
    const desc = sanitizeHtml(form.description)
    const publishAt = form.visibility === 'scheduled' ? new Date(`${form.publishAt}T08:00:00`).getTime() : null
    return {
      title: form.title.trim(), pitch: plain(desc).split(/(?<=[.!?])\s/)[0].slice(0, 120) || form.pitch, description: desc, category: form.category,
      price: +form.price, refPrice: form.refPrice === '' ? null : +form.refPrice, stock: +form.qty === 0 && form.stock === 'nigeria' ? 'oos' : form.stock, qty: +form.qty,
      supplier: form.supplier.trim() || 'To be confirmed', variants: { color: list(form.colors).length ? list(form.colors) : null, size: list(form.sizes).length ? list(form.sizes) : null },
      tags: list(form.tags).map((t) => t.toLowerCase()), images: form.images, visibility: form.visibility, publishAt,
      published: form.visibility === 'published' || (form.visibility === 'scheduled' && publishAt <= Date.now()),
      specs: { ...(p?.specs || {}), Brand: form.brand.trim() || 'Generic' }, landed: landedFrom(+form.landedTotal),
      seo: { title: form.seoTitle.trim(), description: form.seoDesc.trim(), slug: slugify(form.slug || form.title) },
    }
  }
  const nextId = () => `p${Math.max(100, ...products.map((x) => parseInt(x.id.slice(1), 10) || 0)) + 1}`
  const create = (form, toastMsg) => {
    const patch = patchFrom(form)
    const input = { id: nextId(), title: patch.title, pitch: patch.pitch, category: patch.category, price: patch.price, refPrice: patch.refPrice, landedTotal: +form.landedTotal, stock: patch.stock, qty: patch.qty, colors: form.colors, sizes: form.sizes, tags: form.tags, images: form.images, supplier: patch.supplier, published: patch.published, createdAt: Date.now() }
    registerProduct(input); patchProduct(input.id, patch)
    dispatch({ type: 'addProduct', input, patch })
    toast(toastMsg(patch), { icon: 'CircleCheck' })
    return input.id
  }

  const save = (e) => {
    e?.preventDefault()
    setTried(true)
    if (firstError) { document.querySelector('.pe .err')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return }
    if (isNew) {
      const id = create(f, (pt) => `${pt.title} ${pt.published ? 'is live on the store' : pt.visibility === 'scheduled' ? `is scheduled for ${new Date(pt.publishAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}` : 'saved as hidden'}`)
      onOpen(id)
    } else {
      const patch = patchFrom(f)
      patchProduct(p.id, patch)
      dispatch({ type: 'saveProduct', id: p.id, patch })
      toast('Changes saved', { icon: 'CircleCheck' })
      setF(formFrom({ ...p, ...patch })); setTried(false)
    }
  }
  const duplicate = () => {
    const id = create({ ...f, title: `Copy of ${f.title}`.slice(0, 120), visibility: 'hidden', slug: '' }, (pt) => `${pt.title} created as a hidden draft`)
    onOpen(id)
  }
  const back = () => { if (dirty && !leaving) { setLeaving(true); return } onBack() }

  const vis = [['published', 'Published', 'Visible on the store now'], ['scheduled', 'Scheduled', 'Goes live on a date'], ['hidden', 'Hidden', 'Only visible here']]
  const seoTitle = f.seoTitle || `${f.title || 'Product name'} — Oja`
  const seoDesc = f.seoDesc || plain(f.description).slice(0, 155) || 'Add a description so shoppers know what they are buying.'

  return (
    <form className="pe" onSubmit={save} noValidate>
      <div className="pe-top">
        <div className="pe-title">
          <button type="button" className="icon-btn" onClick={back} aria-label="Back to products"><Icon name="ArrowLeft" size={18} /></button>
          <h1>{isNew ? 'New Product' : 'Edit Product'}</h1>
          <span className="pe-crumb">/ <button type="button" onClick={back}>Products</button> / {isNew ? 'New product' : (p.title.length > 28 ? p.title.slice(0, 28) + '…' : p.title)}</span>
        </div>
        <div className="pe-actions">
          {leaving ? (
            <span className="pe-leave">Leave without saving? <button type="button" className="btn-mini" onClick={onBack}>Leave</button><button type="button" className="btn-mini" onClick={() => setLeaving(false)}>Stay</button></span>
          ) : dirty && <span className="muted small">Unsaved changes</span>}
          {!isNew && <button type="button" className="btn-soft" disabled={!edit} onClick={duplicate}>Duplicate</button>}
          <button className="btn-dark" disabled={!edit}>{isNew ? 'Create product' : 'Save'}</button>
        </div>
      </div>
      {!edit && <div className="auth-note"><Icon name="Lock" size={14} /> Your role can view products but not change them.</div>}
      {tried && firstError && <div className="err pe-summary">{firstError}</div>}

      <fieldset className="pe-grid" disabled={!edit}>
        <div className="pe-col">
          <div className="pe-card">
            <h4 className="pe-h">Basic information</h4>
            <label className="set-field"><span>Brand name</span><input id="pe-brand" list="pe-brands" value={f.brand} onChange={set('brand')} placeholder="e.g. Oja Select" /><datalist id="pe-brands">{BRANDS.map((b) => <option key={b} value={b} />)}</datalist></label>
            <div className="pe-3">
              <label className="set-field"><span>Category</span><select id="pe-cat" value={f.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <label className="set-field"><span>Stock location</span><select id="pe-stock" value={f.stock} onChange={set('stock')}>{Object.entries(STOCK).filter(([k]) => k !== 'oos').map(([k, s]) => <option key={k} value={k}>{s.short}</option>)}</select></label>
              <label className="set-field"><span>Price (₦)</span><input id="pe-price" type="number" min="0" inputMode="numeric" value={f.price} onChange={set('price')} placeholder="15000" /></label>
            </div>
            {show('price')}
            <label className="set-field"><span>Product name</span><input id="pe-title" value={f.title} onChange={set('title')} placeholder="e.g. Rechargeable LED Desk Lamp" /></label>
            {show('title')}
            <div className="pe-desc-field"><span className="pe-label" id="pe-desc-label">Description</span><RichText key={productId} value={f.description} onChange={(description) => setF((cur) => ({ ...cur, description }))} /></div>
          </div>

          <div className="pe-card">
            <h4 className="pe-h">Pricing & cost</h4>
            <div className="pe-3">
              <label className="set-field"><span>Selling price (₦)</span><input type="number" min="0" inputMode="numeric" value={f.price} onChange={set('price')} aria-label="Selling price" /></label>
              <label className="set-field"><span>Compare-at price (₦)</span><input id="pe-ref" type="number" min="0" inputMode="numeric" value={f.refPrice} onChange={set('refPrice')} placeholder="Optional" /></label>
              <label className="set-field"><span>Landed cost / unit (₦)</span><input id="pe-landed" type="number" min="0" inputMode="numeric" value={f.landedTotal} onChange={set('landedTotal')} placeholder="9500" /></label>
            </div>
            {show('refPrice')}{show('landedTotal')}
            <div className={`np-margin ${margin === null ? '' : margin < minM ? 'bad' : 'good'}`}>
              {margin === null ? `Enter a price and landed cost to see the margin. Minimum is ${minMargin}%.` : <>Margin <b>{(margin * 100).toFixed(1)}%</b> · profit {naira(price - landed)} per unit{ref > price ? ` · shows ${Math.round((1 - price / ref) * 100)}% off` : ''}</>}
            </div>
            {tried && errors.margin && <div className="err small">{errors.margin}</div>}
            {landed > 0 && (
              <details className="pe-cost"><summary>Landed cost breakdown</summary>
                <table className="spec"><tbody>
                  {[['Product cost', 'productCost'], ['China logistics', 'chinaLogistics'], ['International freight', 'freight'], ['Insurance', 'insurance'], ['Customs / clearing', 'customs'], ['Handling', 'handling'], ['Allocated ops', 'ops']].map(([l, k]) => <tr key={k}><th>{l}</th><td>{naira(landedFrom(landed)[k])}</td></tr>)}
                  <tr className="total"><th>Landed cost</th><td>{naira(landed)}</td></tr>
                </tbody></table>
              </details>
            )}
          </div>

          <div className="pe-card">
            <h4 className="pe-h">Inventory & options</h4>
            <div className="pe-3">
              <label className="set-field"><span>Units on hand</span><input id="pe-qty" type="number" min="0" step="1" inputMode="numeric" value={f.qty} onChange={set('qty')} placeholder="250" /></label>
              <label className="set-field pe-span2"><span>Supplier</span><input id="pe-supplier" value={f.supplier} onChange={set('supplier')} placeholder="e.g. Shenzhen Jiaxin Trading" /></label>
            </div>
            {show('qty')}
            <div className="pe-2">
              <label className="set-field"><span>Colours <em>comma-separated</em></span><input id="pe-colors" value={f.colors} onChange={set('colors')} placeholder="Black, White" /></label>
              <label className="set-field"><span>Sizes <em>comma-separated</em></span><input id="pe-sizes" value={f.sizes} onChange={set('sizes')} placeholder="S, M, L" /></label>
            </div>
            <label className="set-field"><span>Search tags <em>comma-separated</em></span><input id="pe-tags" value={f.tags} onChange={set('tags')} placeholder="lamp, desk, rechargeable" /></label>
          </div>

          <div className="pe-card">
            <h4 className="pe-h">Search engine listing</h4>
            <p className="muted small pe-sub">How the product appears on Google and when shared.</p>
            <div className="pe-serp"><span className="pe-serp-url">ooja-olive.vercel.app › p › {slugify(f.slug || f.title) || 'product'}</span><b>{seoTitle}</b><span>{seoDesc}</span></div>
            <label className="set-field"><span>Page title</span><input id="pe-seo-title" value={f.seoTitle} onChange={set('seoTitle')} placeholder={`${f.title || 'Product name'} — Oja`} maxLength={70} /></label>
            <label className="set-field"><span>Meta description <em>{(f.seoDesc || '').length}/160</em></span><textarea id="pe-seo-desc" rows={3} value={f.seoDesc} onChange={set('seoDesc')} maxLength={160} placeholder="A short summary for search results" /></label>
            <label className="set-field"><span>URL handle</span><input id="pe-slug" value={f.slug} onChange={set('slug')} placeholder={slugify(f.title) || 'rechargeable-led-desk-lamp'} /></label>
          </div>
        </div>

        <div className="pe-col pe-side">
          <div className="pe-card">
            <h4 className="pe-h">Visibility</h4>
            <div className="pe-radios" role="radiogroup" aria-label="Visibility">
              {vis.map(([v, l, hint]) => (
                <label key={v} className={`pe-radio ${f.visibility === v ? 'on' : ''}`} title={hint}>
                  <input type="radio" name="pe-vis" value={v} checked={f.visibility === v} onChange={set('visibility')} /> {l}
                </label>
              ))}
            </div>
            {f.visibility === 'scheduled' && (
              <label className="set-field pe-date"><span>Publish date</span><input id="pe-date" type="date" min={today()} value={f.publishAt} onChange={set('publishAt')} />
                <em className="muted small">The product won't be visible on the store until this date.</em></label>
            )}
            {show('publishAt')}
            <p className="muted small pe-hint">{vis.find((v) => v[0] === f.visibility)[2]}.</p>
          </div>
          <div className="pe-card">
            <h4 className="pe-h">Category</h4>
            <select value={f.category} onChange={set('category')} aria-label="Category" className="pe-select">{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <p className="muted small pe-hint">Shoppers find it under this category in the menu and on the home page.</p>
          </div>
          <ImagesCard images={f.images} onChange={(images) => setF((cur) => ({ ...cur, images }))} />
          {!isNew && <p className="muted small pe-meta">{p.sku} · added {new Date(p.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
        </div>
      </fieldset>
    </form>
  )
}
