import { monthKey } from '../utils/date.js'

export const somaValores = (lista) => lista.reduce((acc, t) => acc + (Number(t.valor) || 0), 0)

export const isDespesa = (t) => t.tipo === 'despesa'

/** Gastos do mês (despesas). Pagamento de fatura marcado contaPaga NÃO conta. */
export function gastoDoMes(transacoes, mk = monthKey(new Date().toISOString().slice(0, 10))) {
  return transacoes
    .filter((t) => t.tipo === 'despesa' && !t.contaPaga && monthKey(t.data) === mk)
    .reduce((acc, t) => acc + (Number(t.valor) || 0), 0)
}

/** Receitas do mês. */
export function receitaDoMes(transacoes, mk) {
  return transacoes
    .filter((t) => t.tipo === 'receita' && monthKey(t.data) === mk)
    .reduce((acc, t) => acc + (Number(t.valor) || 0), 0)
}

/** Agrupado por categoriaId → valor. */
export function gastosPorCategoria(transacoes, mk) {
  const mapa = new Map()
  for (const t of transacoes) {
    if (t.tipo !== 'despesa' || t.contaPaga) continue
    if (mk && monthKey(t.data) !== mk) continue
    const chave = t.categoriaId || 'sem'
    mapa.set(chave, (mapa.get(chave) || 0) + (Number(t.valor) || 0))
  }
  return mapa
}

/** Série mensal (últimos N meses): { mes, receitas, despesas, saldo }. */
export function evolucaoMensal(transacoes, n = 6) {
  const meses = []
  const agora = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
    const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    meses.push({ mes: mk, receitas: 0, despesas: 0, saldo: 0 })
  }
  const idx = new Map(meses.map((m, i) => [m.mes, i]))
  for (const t of transacoes) {
    const i = idx.get(monthKey(t.data))
    if (i == null) continue
    const v = Number(t.valor) || 0
    if (t.tipo === 'receita') meses[i].receitas += v
    else if (!t.contaPaga) meses[i].despesas += v
  }
  for (const m of meses) m.saldo = m.receitas - m.despesas
  return meses
}

/** Média diária de gasto no mês corrente. */
export function mediaDiaria(transacoes, mk) {
  const doMes = transacoes.filter((t) => t.tipo === 'despesa' && !t.contaPaga && monthKey(t.data) === mk)
  const total = somaValores(doMes)
  const agora = new Date()
  const mkAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
  const diaRef = mk === mkAtual ? agora.getDate() : new Date(Number(mk.slice(0, 4)), Number(mk.slice(5, 7)), 0).getDate()
  return diaRef > 0 ? total / diaRef : total
}
