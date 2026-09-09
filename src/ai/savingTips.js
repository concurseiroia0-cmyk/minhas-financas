import { PROMPT_SUGESTOES } from './prompts.js'
import { askAI } from './client.js'
import { agregar90Dias } from '../core/insights.js'
import { db } from '../db/schema.js'
import { getCacheIA, setCacheIA } from '../db/repo.js'
import { hashTexto } from './parseText.js'
import { fmtMoney, fmtHours } from '../utils/money.js'

/** Gera até 3 sugestões de economia (IA redige, números vêm do código). */
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

  if (settings?.chavesAPI && Object.values(settings.chavesAPI).some(Boolean)) {
    try {
      const resp = await askAI({ system: PROMPT_SUGESTOES(JSON.stringify(payload)), user: 'Gere as sugestões.', json: true, settings })
      const sugestoes = (Array.isArray(resp) ? resp : resp?.sugestoes ?? []).slice(0, 3).map((s) => ({
        titulo: String(s.titulo ?? 'Sugestão'),
        acao: String(s.acao ?? ''),
        economiaMensal: Number(s.economiaMensal) || 0,
        horasEquivalentes: Number(s.horasEquivalentes) || (profile ? (Number(s.economiaMensal) || 0) / (valorHoraSafe(profile) || 1) : 0),
      }))
      if (sugestoes.length) {
        await setCacheIA(hash, { sugestoes, fonte: 'ia' })
        return { sugestoes, fonte: 'ia' }
      }
    } catch {
      // fallback local abaixo
    }
  }

  const sugestoes = sugestoesLocais(payload, profile)
  await setCacheIA(hash, { sugestoes, fonte: 'local' })
  return { sugestoes, fonte: 'local' }
}

function valorHoraSafe(profile) {
  if (!profile?.rendaLiquida) return 0
  const h = (profile.diasTrabalhados || 22) * (profile.horasPorDia || 8)
  return h > 0 ? profile.rendaLiquida / h : 0
}

/** Sugestões determinísticas: TOP categorias e recorrentes — sem IA. */
function sugestoesLocais(d, profile) {
  const vh = valorHoraSafe(profile)
  const horas = (v) => (vh > 0 ? v / vh : 0)
  const out = []

  for (const cat of d.topCategorias) {
    if (['Saúde', 'Moradia'].includes(cat.categoria)) continue // nunca sugerir cortar
    if (cat.mediaMensal >= 50) {
      const economia = Math.round(cat.mediaMensal * 0.2 * 100) / 100
      out.push({
        titulo: `Reduzir ${cat.categoria} em 20%`,
        acao: `Você gastou ${fmtMoney(cat.total90d)} em ${cat.categoria} nos últimos 90 dias. Definir um limite mensal pode economizar cerca de ${fmtMoney(economia)}/mês.`,
        economiaMensal: economia,
        horasEquivalentes: Math.round(horas(economia) * 10) / 10,
      })
      break
    }
  }

  const recorrente = d.recorrentesAtivas.sort((a, b) => b.valorMensal - a.valorMensal)[0]
  if (recorrente) {
    out.push({
      titulo: `Revisar "${recorrente.descricao}"`,
      acao: `Assinatura/serviço recorrente de ${fmtMoney(recorrente.valorMensal)}/mês. Ainda faz sentido? Cancelar ou trocar de plano libera esse valor.`,
      economiaMensal: recorrente.valorMensal,
      horasEquivalentes: Math.round(horas(recorrente.valorMensal) * 10) / 10,
    })
  }

  if (out.length < 3) {
    const alvo = Math.round((d.totalGasto90d / 3) * 0.05 * 100) / 100
    out.push({
      titulo: 'Meta de 5%',
      acao: `Cortar apenas 5% dos seus gastos do mês rende ${fmtMoney(alvo)}. Pequeno no cartão, grande no ano: ${fmtMoney(alvo * 12)}.`,
      economiaMensal: alvo,
      horasEquivalentes: Math.round(horas(alvo) * 10) / 10,
    })
  }
  return out.slice(0, 3)
}

export { fmtHours }
