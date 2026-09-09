import { db } from '../db/schema.js'
import { calcularFatura } from './invoice.js'
import { diasAte, hoje } from '../utils/date.js'

const CHAVE_ULTIMA_CHECAGEM = 'notifUltimaChecagem'

/** Suporte do navegador a Notification API. */
export function suportaNotificacao() {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

/** Estado atual da permissão: 'default' | 'granted' | 'denied' | 'sem-suporte'. */
export function estadoPermissao() {
  if (!suportaNotificacao()) return 'sem-suporte'
  return Notification.permission
}

/** Pede permissão ao usuário (deve ser chamado por interação/toque). */
export async function pedirPermissao() {
  if (!suportaNotificacao()) return 'sem-suporte'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

/** Dispara uma notificação local (via service worker quando possível). */
export async function notificar(titulo, corpo, tag) {
  if (estadoPermissao() !== 'granted') return false
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    if (reg) {
      await reg.showNotification(titulo, {
        body: corpo,
        tag,
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        vibrate: [80, 40, 80],
        data: { url: location.pathname + '#/cartoes' },
        actions: [{ action: 'abrir', title: 'Ver faturas' }],
      })
    } else {
      new Notification(titulo, { body: corpo, tag, icon: 'icons/icon-192.png' })
    }
    return true
  } catch {
    return false
  }
}

/**
 * Verifica o que vence hoje/amanhã (faturas e recorrentes) e notifica.
 * Idempotente por dia: só dispara 1x por dia (guardado em localStorage).
 * Retorna resumo do que foi encontrado.
 */
export async function verificarVencimentos({ forcar = false } = {}) {
  const ultima = localStorage.getItem(CHAVE_ULTIMA_CHECAGEM)
  if (!forcar && ultima === hoje()) return { pulou: true, avisos: [] }

  const txs = await db.transactions.toArray()
  const cards = await db.cards.toArray()
  const recs = await db.recurrences.toArray()

  const avisos = []

  for (const card of cards) {
    const f = calcularFatura(card, txs)
    const dias = diasAte(f.vencimento)
    if (f.aberta > 0 && dias >= 0 && dias <= 2) {
      avisos.push({
        tipo: 'fatura',
        titulo: `Fatura ${card.nome} — R$ ${f.aberta.toFixed(2).replace('.', ',')}`,
        corpo: dias === 0 ? 'Vence HOJE! Não esqueça de pagar.' : dias === 1 ? 'Vence amanhã.' : `Vence em ${dias} dias.`,
        tag: `fatura-${card.id}-${f.vencimento}`,
      })
    }
  }

  for (const r of recs) {
    if (!r.ativo || !r.proximaData) continue
    const dias = diasAte(r.proximaData)
    if (dias >= 0 && dias <= 1) {
      avisos.push({
        tipo: 'recorrente',
        titulo: `${r.descricao} — R$ ${Number(r.valor).toFixed(2).replace('.', ',')}`,
        corpo: dias === 0 ? 'Vence HOJE!' : 'Vence amanhã.',
        tag: `rec-${r.id}-${r.proximaData}`,
      })
    }
  }

  localStorage.setItem(CHAVE_ULTIMA_CHECAGEM, hoje())

  if (avisos.length && estadoPermissao() === 'granted') {
    // Agrupa tudo em uma notificação única (menos invasivo)
    const titulo = avisos.length === 1 ? avisos[0].titulo : `⏰ ${avisos.length} vencimentos chegando`
    const corpo = avisos.map((a) => a.titulo).join('\n').slice(0, 220)
    await notificar(titulo, corpo, 'vencimentos-' + hoje())
  }

  return { pulou: false, avisos }
}

/** Agenda a checagem diária enquanto o app estiver aberto. */
export function agendarChecagemDiaria() {
  verificarVencimentos().catch(() => {})
  setInterval(() => verificarVencimentos().catch(() => {}), 60 * 60 * 1000) // 1h
}
