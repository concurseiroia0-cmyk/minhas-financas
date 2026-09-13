import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

/**
 * UI do atualizador (a lógica vive em src/core/updater.js, que roda no boot).
 * Mostra "Atualizando…" quando uma nova versão é detectada e um botão de
 * segurança caso o reload automático não aconteça.
 */
let emitir = null

export default function UpdateBanner() {
  const [estado, setEstado] = useState('oculto') // oculto | atualizando | fallback

  useEffect(() => {
    emitir = setEstado
    return () => { emitir = null }
  }, [])

  if (estado === 'oculto') return null

  if (estado === 'atualizando') {
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

/** Pontes chamadas pelo updater. */
export function uiDetectouUpdate() {
  emitir?.('atualizando')
  // Rede de segurança da UI: se em 30s nada aconteceu, botão manual
  setTimeout(() => emitir?.((e) => (e === 'atualizando' ? 'fallback' : e)), 30000)
}
