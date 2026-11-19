import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/Store'
import { Page, Grid, Empty, Tabs, spring, wrap, linkCls } from '../components/common'
import { fieldCls } from './Cart'
import { STATES } from '../lib/commerce'
import { Icon } from '../components/Icon'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

const card = 'rounded-lg bg-white shadow-card'

// Shown on /account when signed out; the sign-in pop-up opens on arrival.
function SignInPrompt() {
  const { dispatch } = useStore()
  useEffect(() => { dispatch({ type: 'openAuth' }) }, [dispatch])
  return (
    <motion.div className={cn(card, 'mx-auto my-10 grid max-w-[460px] justify-items-center gap-2.5 px-7 py-8 text-center')} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <span className="grid size-16 place-items-center rounded-full bg-brand-tint text-brand"><Icon name="User" size={28} /></span>
      <h2>Sign in to your Oja account</h2>
      <p className="mb-1.5 text-muted-foreground">Track orders, save addresses and get price-drop alerts on your wishlist.</p>
      <Button size="lg" className="mt-3.5" onClick={() => dispatch({ type: 'openAuth' })}>Sign in or register</Button>
    </motion.div>
  )
}

function Addresses() {
  const { state, dispatch } = useStore()
  const [f, setF] = useState(null)
  return (
    <div>
      <div className="mb-3 flex flex-col gap-2.5">
        <AnimatePresence>
          {state.addresses.map((a) => (
            <motion.div layout key={a.id} className="flex items-center gap-3 rounded-lg border-[1.5px] border-line bg-white px-3.5 py-3 text-[14px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -40 }}>
              <div className="flex-1"><b>{a.name}</b> · {a.phone}<div className="text-[13px] text-muted-foreground">{a.line}, {a.state}</div></div>
              {a.default && <Badge variant="info">Default</Badge>}
              <button className={cn(linkCls, 'text-[13px] text-bad decoration-[rgba(214,69,69,.3)]')} onClick={() => dispatch({ type: 'removeAddress', id: a.id })}>Remove</button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {f ? (
        <form className="flex flex-col gap-2.5 overflow-hidden p-0.5" onSubmit={(e) => { e.preventDefault(); dispatch({ type: 'addAddress', addr: { id: 'a' + Date.now(), ...f } }); setF(null) }}>
          <Input className={fieldCls} placeholder="Full name" aria-label="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
          <Input className={fieldCls} placeholder="Phone" aria-label="Phone number" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} required />
          <Input className={fieldCls} placeholder="Street address" aria-label="Street address" value={f.line} onChange={(e) => setF({ ...f, line: e.target.value })} required />
          <NativeSelect wrapperClassName="w-full" className={cn(fieldCls, 'pr-7 leading-[21px] max-sm:leading-[19px]')} iconClassName="right-3 text-ink opacity-70" aria-label="State" value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })}>{STATES.map((s) => <NativeSelectOption key={s}>{s}</NativeSelectOption>)}</NativeSelect>
          <label className="flex cursor-pointer items-center gap-2 py-1 text-[14px]"><Checkbox className="m-[3px] ml-1" checked={f.default} onCheckedChange={(v) => setF({ ...f, default: v === true })} /><span className="flex-1">Make default</span></label>
          <div className="flex flex-wrap items-center gap-2.5"><Button size="sm">Save</Button><button type="button" className={linkCls} onClick={() => setF(null)}>Cancel</button></div>
        </form>
      ) : <Button variant="outline" size="sm" onClick={() => setF({ name: '', phone: '', line: '', state: 'Lagos', default: false })}>+ Add address</Button>}
    </div>
  )
}

const statCls = cn(card, 'flex flex-col items-start p-4 text-left')

export default function Account() {
  const { state, dispatch, getProduct } = useStore()
  const [params] = useSearchParams()
  const [tab, setTab] = useState(params.get('tab') || 'wishlist')
  const [confirmReset, setConfirmReset] = useState(false)
  const wish = state.wishlist.map(getProduct).filter(Boolean)
  const stat = (n, label) => <><b className="font-display text-[26px]">{n}</b><span className="text-[13px] text-muted-foreground">{label}</span></>
  return (
    <Page className="tw">
      <div className={wrap}>
        {!state.user ? <SignInPrompt /> : (
          <>
            <div className="mt-[22px] flex items-center gap-4">
              <motion.span className="grid size-[60px] shrink-0 place-items-center rounded-full bg-brand text-[24px] font-bold text-white" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring}>{state.user.name[0]}</motion.span>
              <div><h1>Hi, {state.user.name.split(' ')[0]}</h1><div className="text-[13px] text-muted-foreground">{state.user.phone} · verified</div></div>
              <button className={cn(linkCls, 'ml-auto')} onClick={() => dispatch({ type: 'logout' })}>Sign out</button>
            </div>
            <div className="my-5 grid grid-cols-4 gap-3 max-sm:grid-cols-2">
              <Link to="/orders" className={statCls}>{stat(state.orders.length, 'Orders')}</Link>
              <button className={statCls} onClick={() => setTab('wishlist')}>{stat(state.wishlist.length, 'Wishlist')}</button>
              <Link to="/help" className={statCls}>{stat(state.cases.length, 'Support cases')}</Link>
              <button className={statCls} onClick={() => setTab('addresses')}>{stat(state.addresses.length, 'Addresses')}</button>
            </div>
          </>
        )}
        <div className="mt-6">
          <Tabs id="acct" value={tab} onChange={setTab} tabs={[{ value: 'wishlist', label: <span className="inline-flex items-center gap-1.5"><Icon name="Heart" size={14} /> Wishlist ({wish.length})</span> }, { value: 'addresses', label: 'Addresses' }, { value: 'settings', label: 'Notifications' }]} />
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-[18px]">
              {tab === 'wishlist' && (wish.length ? <><p className="my-[1em] text-[13px] text-muted-foreground">We'll notify you when these drop in price or come back in stock.</p><Grid products={wish} /></> : <Empty icon="Heart" title="No saved items yet" body="Tap the heart on any product to track its price." />)}
              {tab === 'addresses' && <Addresses />}
              {tab === 'settings' && (
                <div className="flex max-w-[560px] flex-col items-start gap-2.5">
                  {[['Order & delivery updates', 'SMS + push', true], ['Price-drop alerts on wishlist', 'Push + email', true], ['Back-in-stock alerts', 'Push', true], ['Deals & campaigns', 'Email', false]].map(([t, c, on]) => (
                    <label key={t} className={cn(card, 'flex w-full cursor-pointer items-center justify-between px-4 py-3.5')}><div><b>{t}</b><div className="text-[13px] text-muted-foreground">{c}</div></div><Switch defaultChecked={on} aria-label={t} /></label>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setConfirmReset(true)}>Reset prototype data</Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent className="tw z-90 w-[min(440px,calc(100vw-32px))] max-w-none gap-0 rounded-lg border-0 p-6 shadow-lift sm:max-w-none" overlayClassName="z-80">
          <AlertDialogHeader className="gap-0 text-left sm:text-left">
            <AlertDialogTitle className="mb-3 font-display text-[19px] font-bold leading-[1.15]">Reset prototype data?</AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] text-ink-2">This clears your cart, orders and dashboard edits on this device.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2.5">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" className="rounded-full" onClick={() => dispatch({ type: 'reset' })}>Reset data</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  )
}
