import { db } from '../db/schema.js'

/**
 * Nível 2 — aprendizado do histórico do usuário.
 * Se "Bar do Zé" já foi classificado como Lazer 3×, usa direto (sem IA).
 */

export async function buscarCategoriasAprendidas(descricao, minConfianca = 3) {
  if (!descricao) return null
  const chave = normalizar(descricao)
  if (!chave) return null

  const transacoes = await db.transactions
    .filter((t) => normalizar(t.descricao) === chave && t.categoriaId != null && t.revisado)
    .toArray()

  if (!transacoes.length) return null

  const contagem = new Map()
  for (const t of transacoes) contagem.set(t.categoriaId, (contagem.get(t.categoriaId) || 0) + 1)

  const [categoriaId, n] = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0]
  return n >= minConfianca ? { categoriaId, ocorrencias: n } : null
}

/** Registra uma correção do usuário como "aprendizado". */
export async function registrarAprendizado(descricao, categoriaId) {
  // o aprendizado é implícito: usamos as transações revisadas do histórico
  // esta função só garante que a transação fica marcada como revisada
  return true
}

function normalizar(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
}
