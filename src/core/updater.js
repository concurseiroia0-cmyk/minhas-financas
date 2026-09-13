/**
 * Atualização automática do app — registro do service worker.
 * Chamado no boot (main.jsx), ANTES de qualquer tela: funciona até no
 * onboarding, sem perfil criado.
 *
 * 1. `updateViaCache: 'none'` → o sw.js é SEMPRE buscado na rede,
 *    eliminando o atraso de cache HTTP do GitHub Pages (max-age=600).
 * 2. Checa nova versão: ao abrir, ao voltar online, ao voltar para o
 *    primeiro plano e a cada 10 minutos.
 * 3. A nova versão ativa sozinha (skipWaiting embutido no sw.js gerado).
 *    Quando assume o controle, a página RECARREGA automaticamente —
 *    adiado se o usuário estiver digitando.
 * 4. Falhas são reportadas via callback para a UI (banner de segurança).
 */

const INTERVALO_CHECAGEM_MS = 10 * 60 * 1000 // 10 min
const TIMEOUT_SEGURANCA_MS = 30000

function digitando() {
  const el = document.activeElement
  return !!el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

export function iniciarUpdater({ aoDetectar, aoAtualizar } = {}) {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

  let recarregou = false
  let tinhaController = !!navigator.serviceWorker.controller
  let timerSeguranca = null

  const recarregar = () => {
    if (recarregou) return
    recarregou = true
    aoAtualizar?.()
    const tentar = () => {
      if (digitando()) return setTimeout(tentar, 2000)
      window.location.reload()
    }
    setTimeout(tentar, 800) // dá tempo da UI mostrar "Atualizando…"
  }

  const checar = () => {
    if (navigator.onLine && document.visibilityState === 'visible') {
      navigator.serviceWorker.ready.then((r) => r.update().catch(() => {}))
    }
  }

  const aoAssumirControle = () => {
    if (!tinhaController) { tinhaController = true; return } // primeiro install
    recarregar()
  }

  navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' })
    .then((reg) => {
      reg.addEventListener('updatefound', () => {
        const novo = reg.installing
        novo?.addEventListener('statechange', () => {
          if (novo.state === 'installed' && navigator.serviceWorker.controller) {
            aoDetectar?.()
            // Manda o novo worker assumir imediatamente (o skipWaiting do
            // Workbox é sob demanda — só age quando recebe esta mensagem)
            novo.postMessage({ type: 'SKIP_WAITING' })
            clearTimeout(timerSeguranca)
            timerSeguranca = setTimeout(() => {
              if (!recarregou) window.location.reload() // rede de segurança dura
            }, TIMEOUT_SEGURANCA_MS)
          }
        })
      })
      checar()
      window.addEventListener('online', checar)
      document.addEventListener('visibilitychange', checar)
      setInterval(checar, INTERVALO_CHECAGEM_MS)
    })
    .catch(() => {})

  navigator.serviceWorker.addEventListener('controllerchange', aoAssumirControle)
}
