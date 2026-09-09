import { PROMPT_SUGESTOES } from './prompts.js'
import { askAI } from './client.js'
import { agregar90Dias } from '../core/insights.js'
import { db } from '../db/schema.js'
import { getCacheIA, setCacheIA } from '../db/repo.js'
import { hashTexto } from './parseText.js'

/**
 * Gera até 3 sugestões de economia — SEMPRE por IA.
 * Sem internet ou IA indisponível → lança erro (a tela mostra o aviso).
 */
export async function sugerirEconomia(transacoes, recorrencias, profile, settings) {
  const dados = agregar90Dias(transacoes, recorrencias, profile)
  const cats = await db.categories.toArray()
  const nomeCat = new Map(cats.map((c) => [c.id, c.nome]))
  const payload = {
    ...dados,
    topCategorias: dados.topCategorias.map((c) => ({ ...c, categoria: nomeCat.get(c.catId) || 'Outros' })),
  }

  const hash = hashTexto(`sugestoes-${payload.totalGasto90d}-${payload.qtdTransacoes}-${payload.recorrentesAtivas.length}`)
  const cached = await getCacheIA(hash)
  if (cached?.resposta?.sugestoes) return { sugestoes: cached.resposta.sugestoes, fonte: cached.resposta.fonte }

  // IA obrigatória — sem fallback local
  const resp = await askAI({ system: PROMPT_SUGESTOES(JSON.stringify(payload)), user: 'Gere as sugestões.', json: true, settings })
  // Tolerante: array, {sugestoes:[...]} ou objeto único {titulo,...}
  const bruto = Array.isArray(resp)
    ? resp
    : Array.isArray(resp?.sugestoes)
      ? resp.sugestoes
      : resp?.titulo ? [resp] : []
  const sugestoes = bruto.slice(0, 3).map((s) => ({
    titulo: String(s.titulo ?? 'Sugestão'),
    acao: String(s.acao ?? ''),
    economiaMensal: Number(s.economiaMensal) || 0,
    horasEquivalentes: Number(s.horasEquivalentes) || 0,
  }))
  if (!sugestoes.length) throw new Error('IA não retornou sugestões válidas')
  await setCacheIA(hash, { sugestoes, fonte: 'ia' })
  return { sugestoes, fonte: 'ia' }
}
