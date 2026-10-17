import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig } from 'framer-motion'
import { Header, Footer, MobileTabBar } from './components/Layout'
import { Toasts } from './components/ui'
import { AuthModal } from './components/AuthModal'
import Home from './pages/Home'
import Search from './pages/Search'
import Product from './pages/Product'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import { OrdersList, OrderDetail } from './pages/Orders'
import Account from './pages/Account'
import Help from './pages/Help'

// Admin is code-split so shoppers on mobile data never download it
const Admin = lazy(() => import('./pages/Admin'))

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  const loc = useLocation()
  const isAdmin = loc.pathname.startsWith('/admin')
  return (
    <MotionConfig reducedMotion="user">
      <ScrollTop />
      {isAdmin ? <Suspense fallback={<div className="empty">Loading operations…</div>}><Admin /></Suspense> : (
        <>
          <Header />
          <AnimatePresence mode="wait">
            <Routes location={loc} key={loc.pathname}>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/deals" element={<Search dealsMode />} />
              <Route path="/p/:id" element={<Product />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/orders" element={<OrdersList />} />
              <Route path="/orders/:ref" element={<OrderDetail />} />
              <Route path="/account" element={<Account />} />
              <Route path="/help" element={<Help />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </AnimatePresence>
          <Footer />
          <MobileTabBar />
        </>
      )}
      <AuthModal />
      <Toasts />
    </MotionConfig>
  )
}
