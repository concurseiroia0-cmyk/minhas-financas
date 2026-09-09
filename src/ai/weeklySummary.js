import { PROMPT_RESUMO } from './prompts.js'
import { askAI } from './client.js'
import { agregarSemana } from '../core/insights.js'
import { db } from '../db/schema.js'
import { getCacheIA, setCacheIA } from '../db/repo.js'
import { hashTexto } from './parseText.js'

/**
 * Resumo semanal — SEMPRE por IA (números calculados no código).
 * Sem internet ou IA indisponível → lança erro (a tela mostra o aviso).
 * Retorna também os agregados para o relatório detalhado da tela.
 */
export async function resumoSemanal(transacoes, profile, settings, offset = 0) {
  const dados = agregarSemana(transacoes, offset)
  const cats = await db.categories.toArray()
  const nomeCat = new Map(cats.map((c) => [c.id, c.nome]))
  const payload = {
    ...dados,
    porCategoria: dados.porCategoria.map((c) => ({ ...c, categoria: nomeCat.get(c.catId) || 'Outros' })),
    valorHora: profile?.rendaLiquida ? Math.round((profile.rendaLiquida / ((profile.diasTrabalhados || 22) * (profile.horasPorDia || 8))) * 100) / 100 : null,
  }

  const hash = hashTexto(`resumo-${payload.periodo}-${payload.totalGasto}`)
  const cached = await getCacheIA(hash)
  if (cached?.resposta?.texto) return { ...payload, texto: cached.resposta.texto, fonte: cached.resposta.fonte }

  // IA obrigatória — sem fallback local
  const texto = await askAI({
    system: PROMPT_RESUMO(JSON.stringify(payload)),
    user: 'Escreva o resumo.',
    json: false,
    settings,
  })
  await setCacheIA(hash, { texto, fonte: 'ia' })
  return { ...payload, texto, fonte: 'ia' }
}
