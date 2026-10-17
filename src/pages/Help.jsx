import { useEffect, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/Store'
import { Page, Reveal } from '../components/ui'
import { naira, FREE_SHIP_THRESHOLD } from '../lib/commerce'
import { Icon } from '../components/Icon'

const FAQ = [
  { id: 'delivery', q: 'How long does delivery take?', a: `Items in stock in Nigeria arrive in 1–3 days in Lagos and 3–7 days elsewhere. Items shipping from our China warehouse take about 2–3 weeks. The exact window is shown on every product and at checkout. Delivery is free above ${naira(FREE_SHIP_THRESHOLD)}.` },
  { id: 'customs', q: 'Will I pay customs or extra charges on delivery?', a: 'No. Every price on Oja already includes international freight, customs duties and clearing. The amount you pay at checkout is final.' },
  { id: 'returns', q: 'What is your return & refund policy?', a: 'You can request a return within 7 days of delivery if an item is damaged, defective, wrong, missing parts, or significantly not as described. Upload photos as evidence and we\'ll respond within 24 hours. Refunds go back to your original payment method within 3–5 working days of approval. Some hygiene items (e.g. beauty tools once opened) are non-returnable unless damaged or wrong.' },
  { id: 'payment', q: 'My payment went through but I didn\'t get a confirmation', a: 'We only confirm an order after verifying the payment directly with our payment partner. This usually takes seconds. If you were debited and don\'t see your order after 30 minutes, open a payment case below — duplicate or unmatched payments are automatically reconciled and refunded.' },
  { id: 'tracking', q: 'What do the tracking stages mean?', a: 'Sourcing → China Warehouse → In Transit → Customs/Clearing → Nigeria Warehouse → Out for Delivery. Each stage is updated by our operations team from real shipment events, with a timestamp.' },
  { id: 'cancel', q: 'Can I cancel my order?', a: 'Yes, any time before your order enters sourcing or dispatch. Go to Orders → select your order → Cancel. You\'ll be refunded in full.' },
]

const TYPES = [['damaged', 'Item arrived damaged'], ['defective', 'Item is defective / not working'], ['wrong', 'Wrong item received'], ['missing', 'Item or part missing'], ['snad', 'Significantly not as described'], ['payment', 'Payment issue'], ['delivery', 'Delivery delay or problem'], ['other', 'Something else']]
const PRIORITY = new Set(['damaged', 'missing', 'payment', 'delivery'])

export default function Help() {
  const { state, dispatch, toast } = useStore()
  const [params] = useSearchParams()
  const loc = useLocation()
  const [open, setOpen] = useState(loc.hash.slice(1) || null)
  const [form, setForm] = useState({ order: params.get('order') || '', type: params.get('type') === 'return' ? 'damaged' : '', desc: '', files: [] })
  const [done, setDone] = useState(null)

  useEffect(() => { if (loc.hash) { setOpen(loc.hash.slice(1)); document.getElementById(loc.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'center' }) } }, [loc.hash])
  useEffect(() => { if (params.get('order')) document.getElementById('case')?.scrollIntoView({ behavior: 'smooth' }) }, [params])

  const submit = (e) => {
    e.preventDefault()
    const c = { id: 'CS-' + Math.random().toString(36).slice(2, 8).toUpperCase(), ...form, files: form.files.map((f) => f.name), priority: PRIORITY.has(form.type) ? 'High' : 'Normal', status: 'Open', at: Date.now() }
    dispatch({ type: 'openCase', c })
    toast(`Case ${c.id} created`, { icon: 'Ticket' })
    setDone(c)
    setForm({ order: '', type: '', desc: '', files: [] })
  }

  return (
    <Page>
      <div className="wrap narrow">
        <div className="help-hero">
          <h1>How can we help?</h1>
          <p className="muted">Real people in Lagos, 8am – 9pm daily. Average first reply under 15 minutes.</p>
        </div>

        <section>
          <h3>Frequently asked</h3>
          <div className="faq">
            {FAQ.map((f) => (
              <div key={f.id} id={f.id} className={`faq-item ${open === f.id ? 'on' : ''}`}>
                <button className="faq-q" onClick={() => setOpen(open === f.id ? null : f.id)} aria-expanded={open === f.id}>
                  <span>{f.q}</span>
                  <motion.span animate={{ rotate: open === f.id ? 45 : 0 }} className="faq-plus"><Icon name="Plus" size={20} /></motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {open === f.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="faq-a">
                      <p>{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

        <section id="case" className="panel">
          <h3>Open a support case</h3>
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div key="done" className="case-done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="placed-ico"><Icon name="Ticket" size={26} /></div>
                <div><b>Case {done.id} is open</b><p className="small">Priority: {done.priority}. We'll notify you by SMS when its status changes.</p><button className="link" onClick={() => setDone(null)}>Open another case</button></div>
              </motion.div>
            ) : (
              <motion.form key="form" className="addr-form" onSubmit={submit} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <select value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })}>
                  <option value="">Select an order (optional)</option>
                  {state.orders.map((o) => <option key={o.ref} value={o.ref}>{o.ref} · {o.items[0].title.slice(0, 40)}</option>)}
                </select>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required>
                  <option value="">What went wrong?</option>
                  {TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <textarea rows={4} placeholder="Tell us what happened" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} required />
                <label className="upload">
                  <input type="file" multiple accept="image/*,video/*" onChange={(e) => setForm({ ...form, files: [...e.target.files] })} />
                  <span className="row-ico"><Icon name="Paperclip" size={16} /> {form.files.length ? `${form.files.length} file(s) attached` : 'Add photos or video as evidence'}</span>
                </label>
                {PRIORITY.has(form.type) && <div className="small good row-ico"><Icon name="Zap" size={14} /> This will be handled as a priority case.</div>}
                <button className="btn btn-primary lg">Submit case</button>
              </motion.form>
            )}
          </AnimatePresence>
        </section>

        {state.cases.length > 0 && (
          <section>
            <h3>Your cases</h3>
            {state.cases.map((c, i) => (
              <Reveal key={c.id} delay={i * 0.04} className="case-row">
                <b>{c.id}</b><span className="muted small">{TYPES.find((t) => t[0] === c.type)?.[1]}{c.order ? ` · ${c.order}` : ''}</span>
                <span className={`badge ${c.priority === 'High' ? 'badge-warn' : 'badge-info'}`}>{c.priority}</span><span className="badge badge-good">{c.status}</span>
              </Reveal>
            ))}
          </section>
        )}
      </div>
    </Page>
  )
}
