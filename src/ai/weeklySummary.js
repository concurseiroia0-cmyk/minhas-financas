import { PROMPT_RESUMO } from './prompts.js'
import { askAI } from './client.js'
import { agregarSemana } from '../core/insights.js'
import { db } from '../db/schema.js'
import { getCacheIA, setCacheIA } from '../db/repo.js'
import { hashTexto } from './parseText.js'
import { fmtMoney } from '../utils/money.js'

/**
 * Gera o resumo semanal. Números calculados no código; IA só redige.
 * offline → gera resumo local determinístico (sem IA).
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

  if (settings?.chavesAPI && Object.values(settings.chavesAPI).some(Boolean)) {
    try {
      const texto = await askAI({
        system: PROMPT_RESUMO(JSON.stringify(payload)),
        user: 'Escreva o resumo.',
        json: false,
        settings,
      })
      await setCacheIA(hash, { texto, fonte: 'ia' })
      return { ...payload, texto, fonte: 'ia' }
    } catch {
      // cai para o resumo local
    }
  }

  const texto = resumoLocal(payload)
  await setCacheIA(hash, { texto, fonte: 'local' })
  return { ...payload, texto, fonte: 'local' }
}

/** Resumo determinístico sem IA — o app continua útil offline. */
function resumoLocal(d) {
  if (!d.qtdTransacoes || d.totalGasto === 0) {
    return `Sem gastos registrados em ${d.periodo}. Registre pelo QuickAdd para ver seu resumo aqui.`
  }
  const top = d.porCategoria[0]
  const horas = d.valorHora && d.valorHora > 0 ? (d.totalGasto / d.valorHora).toFixed(1) : null
  let t = `Você gastou ${fmtMoney(d.totalGasto)} em ${d.periodo}, média de ${fmtMoney(d.mediaDiaria)} por dia em ${d.qtdTransacoes} lançamentos.`
  if (top) {
    const delta = top.deltaSemanaAnterior
    const dir = delta == null ? '' : delta >= 0 ? ` (alta de ${fmtMoney(delta)} vs semana anterior)` : ` (queda de ${fmtMoney(Math.abs(delta))})`
    t += ` ${top.categoria} lidera com ${top.pct}% do total${dir}.`
  }
  if (d.maiorGasto) t += ` Maior gasto: ${d.maiorGasto.desc} (${fmtMoney(d.maiorGasto.valor)})`
  if (horas) t += ` — cerca de ${horas}h do seu trabalho.`
  return t
}
