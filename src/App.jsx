import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, LayoutDashboard, ListOrdered, CreditCard, Repeat, Calculator, ChartPie, Settings2, Building2, Target } from 'lucide-react'
import { db } from './db/schema.js'
import { useSettings } from './store/useSettings.js'
import { BadgeOffline } from './components/ui.jsx'
import { ChefIcon } from './components/ChefIcon.jsx'
import UpdateBanner from './components/UpdateBanner.jsx'
import { agendarChecagemDiaria } from './core/notifications.js'
import Dashboard from './pages/Dashboard.jsx'
import Lancamentos from './pages/Lancamentos.jsx'
import QuickAdd from './pages/QuickAdd.jsx'
import Cartoes from './pages/Cartoes.jsx'
import Bancos from './pages/Bancos.jsx'
import Metas from './pages/Metas.jsx'
import Recorrentes from './pages/Recorrentes.jsx'
import HorasCalc from './pages/HorasCalc.jsx'
import Relatorios from './pages/Relatorios.jsx'
import Config from './pages/Config.jsx'
import Onboarding from './pages/Onboarding.jsx'

const NAV = [
  { to: '/', label: 'Início', icon: LayoutDashboard },
  { to: '/lancamentos', label: 'Lançamentos', icon: ListOrdered },
  { to: '/bancos', label: 'Bancos', icon: Building2 },
  { to: '/metas', label: 'Metas', icon: Target },
  { to: '/cartoes', label: 'Cartões', icon: CreditCard },
  { to: '/recorrentes', label: 'Recorrentes', icon: Repeat },
  { to: '/horas', label: 'Horas', icon: Calculator },
  { to: '/relatorios', label: 'Relatórios', icon: ChartPie },
  { to: '/config', label: 'Config', icon: Settings2 },
]

export default function App() {
  const loaded = useSettings((s) => s.loaded)
  const [pronto, setPronto] = useState(false)
  const [escolhaFeita, setEscolhaFeita] = useState(false)
  const location = useLocation()

  const profile = useLiveQuery(() => db.profile.get('me'), [])
  const quickAddAberto = location.state?.quickAdd

  useEffect(() => {
    if (loaded) setPronto(true)
  }, [loaded])

  useEffect(() => {
    if (loaded && pronto) agendarChecagemDiaria()
  }, [loaded, pronto])

  if (!loaded || !pronto) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4">
        <ChefIcon className="h-24 w-24" />
        <p className="text-sm text-slate-500 animate-pulse">Organizando suas finanças…</p>
      </div>
    )
  }

  // Sem profile → Onboarding (a menos que já tenha feito a escolha)
  if (!profile && !escolhaFeita && !quickAddAberto) {
    return <Onboarding onConcluir={() => setEscolhaFeita(true)} />
  }

  const hideNav = quickAddAberto
  return (
    <div className="min-h-dvh">
      <BadgeOffline />
      <UpdateBanner />

      {/* Sidebar desktop */}
      {!hideNav && (
        <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-white/10 bg-slate-950/60 backdrop-blur-2xl px-3 py-4 z-30">
          <div className="px-2 mb-6 flex items-center gap-2.5">
            <ChefIcon className="h-9 w-9 shrink-0" animado={false} />
            <div>
              <p className="font-extrabold text-lg tracking-tight leading-tight">Minhas Finanças</p>
              <p className="text-xs text-slate-500">offline-first</p>
            </div>
          </div>
          <nav className="flex-1 space-y-0.5">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'}
                className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'glass-highlight text-[#f6d353]' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
                <Icon className="h-[18px] w-[18px]" /> {label}
              </NavLink>
            ))}
          </nav>
          <p className="px-3 text-[10px] text-slate-600">Dados 100% locais · IndexedDB</p>
        </aside>
      )}

      <main className={`max-w-3xl mx-auto px-4 pt-safe ${hideNav ? 'py-6' : 'md:pl-64 md:pr-6'} pb-nav md:pb-10`}>
        <div key={location.pathname} className="anim-fade">
          <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/lancamentos" element={<Lancamentos />} />
          <Route path="/bancos" element={<Bancos />} />
          <Route path="/metas" element={<Metas />} />
          <Route path="/cartoes" element={<Cartoes />} />
          <Route path="/recorrentes" element={<Recorrentes />} />
          <Route path="/horas" element={<HorasCalc />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/config" element={<Config />} />
          <Route path="/quickadd" element={<QuickAdd />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>

      {/* QuickAdd flutuante (desktop) */}
      {!hideNav && <QuickAddFAB />}

      {/* Bottom nav mobile — pill flutuante liquid glass (iOS 26) */}
      {!hideNav && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 pt-2 pb-safe" aria-label="Navegação principal">
          <div className="glass mx-auto max-w-md rounded-[1.75rem] px-2 pt-1.5 pb-1.5 anim-rise">
            <div className="grid grid-cols-6 items-end">
              {[NAV[0], NAV[1], NAV[2]].map(({ to, label, icon: Icon }) => (
                <NavBtn key={to} to={to} label={label} icon={Icon} />
              ))}
              <div className="flex items-center justify-center">
                <NavLink to="/quickadd" state={{ quickAdd: true }}
                  className="h-12 w-12 -translate-y-2.5 rounded-full bg-[#f6d353] text-slate-950 shadow-lg shadow-[#f6d353]/30 ring-4 ring-slate-950/60 flex items-center justify-center active:scale-90 transition-transform"
                  aria-label="Adicionar rápido">
                  <Plus className="h-6 w-6" />
                </NavLink>
              </div>
              {[NAV[3], NAV[6]].map(({ to, label, icon: Icon }) => (
                <NavBtn key={to} to={to} label={label} icon={Icon} />
              ))}
            </div>
          </div>
        </nav>
      )}
    </div>
  )
}

function NavBtn({ to, label, icon: Icon }) {
  return (
    <NavLink to={to} end={to === '/'}
      className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-2xl text-[10px] font-medium transition-colors ${isActive ? 'glass-highlight text-[#f6d353]' : 'text-slate-400 hover:text-slate-200'}`}>
      <Icon className="h-5 w-5" />
      <span className="truncate max-w-full px-1 leading-none">{label}</span>
    </NavLink>
  )
}

function QuickAddFAB() {
  const location = useLocation()
  if (location.pathname === '/quickadd') return null
  return (
    <NavLink to="/quickadd" state={{ quickAdd: true }}
      className="hidden md:flex fixed bottom-6 right-6 z-40 h-14 px-5 rounded-full bg-[#f6d353] text-slate-950 shadow-xl shadow-[#f6d353]/20 items-center gap-2 font-bold hover:bg-[#f2c62e] transition-colors">
      <ChefIcon className="h-7 w-7 shrink-0" cor="#0a0a0c" corOlhos="#f6d353" animado={false} /> Adicionar
    </NavLink>
  )
}
