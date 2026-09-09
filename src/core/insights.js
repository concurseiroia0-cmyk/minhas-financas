import { valorHora } from './hourlyRate.js'
import { addDays, parseDate, toISO } from '../utils/date.js'

const semanaISO = (offset = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offset * 7)
  return toISO(d)
}

const intervaloSemana = (iso) => {
  const d = parseDate(iso)
  const dow = (d.getDay() + 6) % 7 // segunda = 0
  const ini = new Date(d)
  ini.setDate(d.getDate() - dow)
  const fim = new Date(ini)
  fim.setDate(fim.getDate() + 7)
  return { ini: toISO(ini), fim: toISO(fim) }
}

/**
 * Agregado SEMANAL para a IA escrever o resumo.
 * Números calculados 100% no código — só o texto vem da IA.
 */
export function agregarSemana(transacoes, offset = 0) {
  const { ini, fim } = intervaloSemana(semanaISO(offset))
  const noPeriodo = transacoes.filter((t) => t.data >= ini && t.data < fim)
  const despesas = noPeriodo.filter((t) => t.tipo === 'despesa' && !t.contaPaga)
  const totalGasto = despesas.reduce((a, t) => a + (Number(t.valor) || 0), 0)

  const semanaAnterior = offset === 0 ? agregarSemana(transacoes, -1) : null

  const porCat = new Map()
  for (const t of despesas) {
    const k = t.categoriaId || 'sem'
    porCat.set(k, (porCat.get(k) || 0) + (Number(t.valor) || 0))
  }

  const maior = despesas.reduce(
    (best, t) => (!best || (Number(t.valor) || 0) > best.valor ? { desc: t.descricao, valor: Number(t.valor) || 0 } : best),
    null,
  )

  const dias = 7
  const mk = ini.slice(0, 7)
  const dados = {
    periodo: `${ini.slice(8, 10)}/${ini.slice(5, 7)} a ${addDays(fim, -1).slice(8, 10)}/${fim.slice(5, 7)}`,
    totalGasto: Math.round(totalGasto * 100) / 100,
    porCategoria: [...porCat.entries()]
      .map(([catId, valor]) => ({
        catId,
        valor: Math.round(valor * 100) / 100,
        pct: totalGasto > 0 ? Math.round((valor / totalGasto) * 100) : 0,
        deltaSemanaAnterior: semanaAnterior
          ? Math.round((valor - (semanaAnterior.porCategoria.find((c) => c.catId === catId)?.valor || 0)) * 100) / 100
          : null,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5),
    maiorGasto: maior,
    qtdTransacoes: noPeriodo.length,
    mediaDiaria: Math.round((totalGasto / dias) * 100) / 100,
  }
  return dados
}

/** Mês de referência "2026-02" a partir do intervalo [ini, fim). */
agregarSemana.mesDe = (ini) => ini.slice(0, 7)

/**
 * Agregado de 90 dias + recorrentes, para sugestões de economia.
 */
export function agregar90Dias(transacoes, recorrencias, profile) {
  const fim = toISO(new Date())
  const ini = addDays(fim, -90)
  const noPeriodo = transacoes.filter((t) => t.data >= ini && t.data <= fim && t.tipo === 'despesa' && !t.contaPaga)

  const porCat = new Map()
  const porDescricao = new Map()
  for (const t of noPeriodo) {
    const k = t.categoriaId || 'sem'
    porCat.set(k, (porCat.get(k) || 0) + (Number(t.valor) || 0))
    const kd = (t.descricao || '').toLowerCase().trim()
    porDescricao.set(kd, (porDescricao.get(kd) || 0) + (Number(t.valor) || 0))
  }

  const topCategorias = [...porCat.entries()]
    .map(([catId, total]) => ({ catId, total90d: Math.round(total * 100) / 100, mediaMensal: Math.round((total / 3) * 100) / 100 }))
    .sort((a, b) => b.total90d - a.total90d)
    .slice(0, 8)

  const topDescricoes = [...porDescricao.entries()]
    .map(([descricao, total]) => ({ descricao, total90d: Math.round(total * 100) / 100, mediaMensal: Math.round((total / 3) * 100) / 100 }))
    .sort((a, b) => b.total90d - a.total90d)
    .slice(0, 10)

  const recorrentesAtivas = (recorrencias || [])
    .filter((r) => r.ativo && r.tipo !== 'receita')
    .map((r) => ({ descricao: r.descricao, valorMensal: Number(r.valor) || 0, frequencia: r.frequencia }))

  return {
    periodo: `${ini} a ${fim}`,
    totalGasto90d: Math.round(noPeriodo.reduce((a, t) => a + (Number(t.valor) || 0), 0) * 100) / 100,
    qtdTransacoes: noPeriodo.length,
    topCategorias,
    topDescricoes,
    recorrentesAtivas,
    valorHora: Math.round(valorHora(profile) * 100) / 100,
  }
}
