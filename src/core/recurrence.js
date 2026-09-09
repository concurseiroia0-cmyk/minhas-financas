import { addDays, addMonths, hoje, parseDate, toISO } from '../utils/date.js'

/**
 * Gera os lançamentos de uma recorrência: das transações já criadas
 * até a proximaData (inclusive), sem duplicar (chave recurrenceId+data).
 *
 * rec: { id, descricao, valor, tipo, categoriaId, metodo, cardId,
 *        frequencia: 'mensal'|'semanal', dia, proximaData, ativo }
 */
export function gerarLancamentosRecorrencia(rec, transacoesExistentes) {
  if (!rec.ativo || !rec.proximaData) return []
  const novas = []
  const chaves = new Set(
    transacoesExistentes.filter((t) => t.recurrenceId === rec.id).map((t) => t.data),
  )
  let data = rec.proximaData
  let guard = 0
  while (data <= hoje() && guard++ < 120) {
    if (!chaves.has(data)) {
      novas.push({
        id: crypto.randomUUID(),
        data,
        valor: Number(rec.valor) || 0,
        tipo: rec.tipo || 'despesa',
        descricao: rec.descricao,
        categoriaId: rec.categoriaId ?? null,
        metodo: rec.metodo || 'pix',
        cardId: rec.cardId ?? null,
        parcelaAtual: null,
        parcelasTotal: null,
        recurrenceId: rec.id,
        origem: 'regra',
        iaConfianca: null,
        revisado: true,
        contaPaga: false,
      })
    }
    data = rec.frequencia === 'semanal' ? addDays(data, 7) : addMonths(data, 1)
  }
  return novas
}

/** Próxima ocorrência de uma recorrência (para "Netflix vence em 5 dias"). */
export function proximaOcorrencia(rec) {
  return rec.ativo && rec.proximaData > hoje() ? rec.proximaData : null
}

/**
 * Parcelamento: gera N lançamentos mensais a partir da data da compra.
 * Regra: cada parcela é uma despesa futura (valor/parcelas) com parcelaAtual/N.
 */
export function gerarParcelas({ descricao, valorTotal, parcelas, dataCompra, categoriaId = null, metodo = 'credito', cardId = null, origem = 'manual' }) {
  const n = Math.max(1, Math.round(parcelas))
  const valor = Math.round(((Number(valorTotal) || 0) / n) * 100) / 100
  const itens = []
  for (let i = 0; i < n; i++) {
    const d = parseDate(dataCompra)
    d.setMonth(d.getMonth() + i)
    itens.push({
      id: crypto.randomUUID(),
      data: toISO(d),
      valor,
      tipo: 'despesa',
      descricao: n > 1 ? `${descricao} (${i + 1}/${n})` : descricao,
      categoriaId,
      metodo,
      cardId,
      parcelaAtual: n > 1 ? i + 1 : null,
      parcelasTotal: n > 1 ? n : null,
      recurrenceId: null,
      origem,
      iaConfianca: null,
      revisado: origem !== 'ia',
      contaPaga: false,
    })
  }
  // ajusta centavos na primeira parcela
  const soma = itens.reduce((a, p) => a + p.valor, 0)
  if (itens.length && soma !== Math.round((Number(valorTotal) || 0) * 100) / 100) {
    itens[0].valor = Math.round(((Number(valorTotal) || 0) - (soma - itens[0].valor)) * 100) / 100
  }
  return itens
}
