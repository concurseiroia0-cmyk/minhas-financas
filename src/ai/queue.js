/**
 * Fila offline de IA: processa pendências quando a conexão volta.
 * Cada item: { tipo: 'parse', payload: { texto } }
 */
let processando = false

export async function enfileirar({ tipo, payload }) {
  const { enfileirarIA } = await import('../db/repo.js')
  await enfileirarIA({ tipo, payload })
  tentarProcessar()
}

export async function tentarProcessar() {
  if (processando || !navigator.onLine) return
  processando = true
  try {
    const { listarFilaIA, removerFilaIA } = await import('../db/repo.js')
    const itens = await listarFilaIA()
    const mod = await import('./parseText.js')
    for (const item of itens) {
      try {
        await mod.executarFila(item)
        await removerFilaIA(item.id)
      } catch (e) {
        if (e?.name === 'OfflineError') break // ainda sem net, tenta depois
        console.warn('Fila IA: item falhou', item?.tipo, e)
        await removerFilaIA(item.id) // não trava a fila com item inválido
      }
    }
  } finally {
    processando = false
  }
}

export const tamanhoFila = async () => {
  const { listarFilaIA } = await import('../db/repo.js')
  return (await listarFilaIA()).length
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', tentarProcessar)
  setTimeout(tentarProcessar, 3000)
}
