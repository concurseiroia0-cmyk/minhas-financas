import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, LayoutDashboard, ListOrdered, CreditCard, Repeat, Calculator, ChartPie, Settings2, Sparkles, Building2 } from 'lucide-react'
import { db } from './db/schema.js'
import { useSettings, carregarDadosDemo } from './store/useSettings.js'
import { BadgeOffline } from './components/ui.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Lancamentos from './pages/Lancamentos.jsx'
import QuickAdd from './pages/QuickAdd.jsx'
import Cartoes from './pages/Cartoes.jsx'
import Bancos from './pages/Bancos.jsx'
import Recorrentes from './pages/Recorrentes.jsx'
import HorasCalc from './pages/HorasCalc.jsx'
import Relatorios from './pages/Relatorios.jsx'
import Config from './pages/Config.jsx'
import Onboarding from './pages/Onboarding.jsx'

const NAV = [
  { to: '/', label: 'Início', icon: LayoutDashboard },
  { to: '/lancamentos', label: 'Lançamentos', icon: ListOrdered },
  { to: '/bancos', label: 'Bancos', icon: Building2 },
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
    if (loaded && !pronto) {
      carregarDadosDemo().finally(() => setPronto(true))
    }
  }, [loaded, pronto])

  if (!loaded || !pronto) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Carregando…</div>
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

      {/* Sidebar desktop */}
      {!hideNav && (
        <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur px-3 py-4 z-30">
          <div className="px-2 mb-6">
            <p className="font-extrabold text-lg tracking-tight">💰 Minhas Finanças</p>
            <p className="text-xs text-slate-400">offline-first</p>
          </div>
          <nav className="flex-1 space-y-0.5">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'}
                className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                <Icon className="h-[18px] w-[18px]" /> {label}
              </NavLink>
            ))}
          </nav>
          <p className="px-3 text-[10px] text-slate-400">Dados 100% locais · IndexedDB</p>
        </aside>
      )}

      <main className={`max-w-3xl mx-auto px-4 pt-safe ${hideNav ? 'py-6' : 'md:pl-64 md:pr-6'} pb-28 md:pb-10`}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/lancamentos" element={<Lancamentos />} />
          <Route path="/bancos" element={<Bancos />} />
          <Route path="/cartoes" element={<Cartoes />} />
          <Route path="/recorrentes" element={<Recorrentes />} />
          <Route path="/horas" element={<HorasCalc />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/config" element={<Config />} />
          <Route path="/quickadd" element={<QuickAdd />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* QuickAdd flutuante (desktop) */}
      {!hideNav && <QuickAddFAB />}

      {/* Bottom nav mobile */}
      {!hideNav && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur pb-safe">
          <div className="grid grid-cols-6">
            {[NAV[0], NAV[1], NAV[2]].map(({ to, label, icon: Icon }) => (
              <NavBtn key={to} to={to} label={label} icon={Icon} />
            ))}
            <div className="relative flex items-center justify-center">
              <NavLink to="/quickadd" state={{ quickAdd: true }}
                className="absolute -top-5 h-12 w-12 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center active:scale-95 transition-transform"
                aria-label="Adicionar rápido">
                <Plus className="h-6 w-6" />
              </NavLink>
            </div>
            {[NAV[3], NAV[6]].map(({ to, label, icon: Icon }) => (
              <NavBtn key={to} to={to} label={label} icon={Icon} />
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}

function NavBtn({ to, label, icon: Icon }) {
  return (
    <NavLink to={to} end={to === '/'}
      className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
      <Icon className="h-5 w-5" />
      <span className="truncate max-w-full px-1">{label}</span>
    </NavLink>
  )
}

function QuickAddFAB() {
  const location = useLocation()
  if (location.pathname === '/quickadd') return null
  return (
    <NavLink to="/quickadd" state={{ quickAdd: true }}
      className="hidden md:flex fixed bottom-6 right-6 z-40 h-14 px-5 rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-600/30 items-center gap-2 font-semibold hover:bg-emerald-500 transition-colors">
      <Sparkles className="h-5 w-5" /> Adicionar
    </NavLink>
  )
}
