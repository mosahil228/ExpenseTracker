import { useEffect } from 'react'
import { HashRouter, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { LayoutGrid, CalendarDays, TrendingUp, Gem, Ellipsis, BookUser } from 'lucide-react'
import { Toaster } from 'sonner'
import { App as CapApp } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import Home from '@/pages/Home'
import Months from '@/pages/Months'
import Earn from '@/pages/Earn'
import Invest from '@/pages/Invest'
import Khata, { KhataContact } from '@/pages/Khata'
import More, { AutopayPage, AccountsPage, HeadsPage, DataPage } from '@/pages/More'
import { closeTopSheet, ease } from '@/components/ui'
import { Intro } from '@/components/Intro'
import { isNative, tap } from '@/lib/native'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/', label: 'Home', icon: LayoutGrid },
  { to: '/months', label: 'Months', icon: CalendarDays },
  { to: '/earn', label: 'Earn', icon: TrendingUp },
  { to: '/khata', label: 'Khata', icon: BookUser },
  { to: '/invest', label: 'Invest', icon: Gem },
  { to: '/more', label: 'More', icon: Ellipsis },
]

function BottomNav() {
  const { pathname } = useLocation()
  const active = TABS.find((t) => (t.to === '/' ? pathname === '/' : pathname.startsWith(t.to)))?.to
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md px-4" style={{ paddingBottom: 'calc(var(--sab) + 12px)' }}>
      <div className="flex rounded-[26px] border border-white/[0.08] bg-zinc-900/80 p-1 shadow-2xl shadow-black/60 backdrop-blur-xl">
        {TABS.map(({ to, label, icon: Icon }) => {
          const on = active === to
          return (
            <NavLink key={to} to={to} onClick={() => tap()} className="relative flex h-[52px] flex-1 flex-col items-center justify-center gap-0.5">
              {on && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-[20px] bg-white/[0.08]" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
              <motion.span animate={{ y: on ? -1 : 0, scale: on ? 1.08 : 1 }} className="relative">
                <Icon className={cn('size-[21px] transition-colors', on ? 'text-lime-300' : 'text-zinc-500')} strokeWidth={on ? 2.4 : 2} />
              </motion.span>
              <span className={cn('relative text-[10px] font-semibold transition-colors', on ? 'text-zinc-100' : 'text-zinc-600')}>{label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

function Shell() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isNative) return
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
    StatusBar.setBackgroundColor({ color: '#09090b' }).catch(() => {})
    SplashScreen.hide().catch(() => {})
  }, [])

  useEffect(() => {
    if (!isNative) return
    const handle = CapApp.addListener('backButton', () => {
      if (closeTopSheet()) return
      const p = location.pathname
      if (p.startsWith('/more/')) navigate('/more')
      else if (p.startsWith('/khata/')) navigate('/khata')
      else if (p !== '/') navigate('/')
      else CapApp.exitApp()
    })
    return () => { handle.then((h) => h.remove()) }
  }, [location.pathname, navigate])

  useEffect(() => { window.scrollTo({ top: 0 }) }, [location.pathname])

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <main className="mx-auto max-w-md px-4" style={{ paddingTop: 'calc(var(--sat) + 14px)', paddingBottom: 'calc(var(--sab) + 176px)' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'none' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
            transition={{ duration: 0.24, ease }}
          >
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/months" element={<Months />} />
              <Route path="/earn" element={<Earn />} />
              <Route path="/khata" element={<Khata />} />
              <Route path="/khata/:id" element={<KhataContact />} />
              <Route path="/invest" element={<Invest />} />
              <Route path="/more" element={<More />} />
              <Route path="/more/autopay" element={<AutopayPage />} />
              <Route path="/more/accounts" element={<AccountsPage />} />
              <Route path="/more/heads" element={<HeadsPage />} />
              <Route path="/more/data" element={<DataPage />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
      <Intro />
      <Toaster theme="dark" position="top-center" offset={{ top: 'calc(var(--sat) + 12px)' }} mobileOffset={{ top: 'calc(var(--sat) + 12px)' }}
        toastOptions={{ className: '!rounded-2xl !border-white/10 !bg-zinc-900 !text-zinc-100 !font-[inherit]' }} />
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  )
}
