import { create } from 'zustand'
import { db } from '../db/schema.js'
import { saveProfile } from '../db/repo.js'
import { seedDemo } from '../db/demo.js'

const SETTING_KEY = 'geral'

export const useSettings = create((set, get) => ({
  // provedorIA: 'openrouter' | 'nvidia' (ordem de tentativa; o outro vira fallback)
  provedorIA: 'openrouter',
  tema: 'dark',
  online: navigator.onLine,
  loaded: false,

  async load() {
    try {
      const s = (await db.settings.get(SETTING_KEY)) || {}
      set({
        provedorIA: s.provedorIA || 'openrouter',
        tema: s.tema || 'dark',
        loaded: true,
      })
    } catch {
      set({ loaded: true })
    }
    aplicarTema(get().tema)
  },

  async update(patch) {
    const atual = (await db.settings.get(SETTING_KEY)) || {}
    const novo = { ...atual, ...patch }
    await db.settings.put({ id: SETTING_KEY, ...novo })
    set(novo)
    if (patch.tema) aplicarTema(patch.tema)
  },
}))

function aplicarTema(tema) {
  document.documentElement.classList.toggle('dark', tema === 'dark')
}

// ---------- Dados demo (só se o banco estiver vazio) ----------

export async function carregarDadosDemo() {
  const count = await db.transactions.count()
  const temProfile = await db.profile.get('me')
  if (count > 0 || temProfile) return false
  await saveProfile({
    regime: 'mensal', rendaLiquida: 3200, diasTrabalhados: 22, horasPorDia: 8,
    guardado: 6500, disponivel: 850, moeda: 'BRL',
  })
  await seedDemo()
  return true
}

// ---------- Status de conexão ----------

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useSettings.setState({ online: true }))
  window.addEventListener('offline', () => useSettings.setState({ online: false }))
}
