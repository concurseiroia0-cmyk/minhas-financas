import { useEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { RefreshCw } from 'lucide-react'

const ESPERA_ATIVAR_MS = 3000 // deixa o app assentar antes de recarregar
const REDE_SEGURANCA_MS = 30000 // se o reload não acontecer, vira banner manual

function digitando() {
  const el = document.activeElement
  return !!el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

/**
 * Atualização automática do app (registerType: 'autoUpdate'):
 * 1. Procura nova versão: ao abrir, ao voltar online, ao voltar para o
 *    primeiro plano e a cada 60 min — publicou o build, o app pega sozinho.
 * 2. Achou? A nova versão instala e ativa em background (sem fechar nada).
 * 3. O reload acontece sozinho em ~3s — adiado se o usuário estiver digitando.
 * 4. Se o reload não completar, aparece o banner "atualizar agora".
 */
export default function UpdateBanner() {
  const [estado, setEstado] = useState('oculto') // oculto | trocando | fallback
  const timer = useRef(null)
  const seguranca = useRef(null)
  const agendado = useRef(false)
  const intervalo = useRef(null)

  useEffect(() => {
    registerSW({
      immediate: true,
      // Modo autoUpdate: a nova versão ativou → decidimos quando recarregar
      onNeedReload() {
        if (agendado.current) return
        agendado.current = true
        setEstado('trocando')
        agendarReload(timer)
        checarFallback()
      },
      onOfflineReady() {},
      onRegisteredSW(_url, registration) {
        if (!registration) return
        const checar = () => {
          if (navigator.onLine && document.visibilityState === 'visible') {
            registration.update().catch(() => {})
          }
        }
        checar()
        window.addEventListener('online', checar)
        document.addEventListener('visibilitychange', checar)
        intervalo.current = setInterval(checar, 60 * 60 * 1000)
      },
    })
    return () => {
      clearTimeout(timer.current)
      clearTimeout(seguranca.current)
      if (intervalo.current) clearInterval(intervalo.current)
    }
  }, [])

  /** Se o reload automático não aconteceu, vira banner clicável. */
  function checarFallback() {
    clearTimeout(seguranca.current)
    seguranca.current = setTimeout(() => {
      if (digitando()) return checarFallback() // deixa o usuário terminar de digitar
      setEstado('fallback')
    }, REDE_SEGURANCA_MS)
  }

  /** Recarrega em ~3s; se o usuário estiver digitando, adia e tenta de novo. */
  function agendarReload(timerRef) {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (digitando()) return agendarReload(timerRef)
      window.location.reload()
    }, ESPERA_ATIVAR_MS)
  }

  if (estado === 'oculto') return null

  if (estado === 'trocando') {
    return (
      <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 glass-strong rounded-full px-4 py-2 flex items-center gap-2 text-xs font-semibold text-slate-200 anim-rise">
        <RefreshCw className="h-4 w-4 text-[#f6d353] animate-spin" />
        Atualizando…
      </div>
    )
  }

  // fallback: o reload automático não completou
  return (
    <button
      onClick={() => window.location.reload()}
      className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 glass-strong rounded-full pl-3 pr-4 py-2 flex items-center gap-2 text-xs font-semibold text-slate-200 hover:text-white active:scale-95 transition anim-rise"
    >
      <RefreshCw className="h-4 w-4 text-[#f6d353]" />
      Nova versão — atualizar agora
    </button>
  )
}
