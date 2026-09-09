import { monthKey } from '../utils/date.js'

/**
 * Saldo atual de uma conta/banco:
 *   saldoInicial + receitas + transferências recebidas − despesas − transferências enviadas
 * Despesas no crédito NÃO saem da conta (saem quando a fatura é paga via transferência).
 */
export function saldoConta(conta, transacoes) {
  let saldo = Number(conta.saldoInicial) || 0
  for (const t of transacoes) {
    if (t.tipo === 'receita' && t.contaId === conta.id) saldo += Number(t.valor) || 0
    else if (t.tipo === 'despesa' && t.contaId === conta.id && t.metodo !== 'credito') saldo -= Number(t.valor) || 0
    else if (t.tipo === 'transferencia') {
      if (t.contaOrigemId === conta.id) saldo -= Number(t.valor) || 0
      if (t.contaDestinoId === conta.id) saldo += Number(t.valor) || 0
    }
  }
  return Math.round(saldo * 100) / 100
}

/** Gasto do mês pago a partir desta conta (pix/débito/dinheiro). */
export function gastoDoMesConta(conta, transacoes, mk) {
  return Math.round(
    transacoes
      .filter((t) => t.tipo === 'despesa' && t.contaId === conta.id && t.metodo !== 'credito' && !t.contaPaga && monthKey(t.data) === mk)
      .reduce((a, t) => a + (Number(t.valor) || 0), 0) * 100,
  ) / 100
}

/** Faturas abertas dos cartões vinculados a esta conta. */
export function faturasDaConta(conta, cartoes, transacoes) {
  return cartoes
    .filter((c) => c.contaId === conta.id)
    .map((c) => ({ card: c }))
  // o cálculo da fatura em si usa calcularFatura (core/invoice.js) na página
}

/** Saldo consolidado de todos os bancos. */
export function totalNosBancos(contas, transacoes) {
  return Math.round(contas.reduce((a, c) => a + saldoConta(c, transacoes), 0) * 100) / 100
}

/**
 * Cria uma transferência entre contas (ex.: BB → Nubank).
 * Tipo 'transferencia' — nunca entra nos totais de gasto.
 */
export function criarTransferencia({ valor, contaOrigemId, contaDestinoId, descricao, data }) {
  if (!valor || valor <= 0) throw new Error('Valor inválido')
  if (!contaOrigemId && !contaDestinoId) throw new Error('Escolha pelo menos uma conta')
  return {
    id: crypto.randomUUID(),
    data: data || new Date().toISOString().slice(0, 10),
    valor: Math.round(valor * 100) / 100,
    tipo: 'transferencia',
    descricao: descricao || 'Transferência entre contas',
    categoriaId: null,
    metodo: 'pix',
    cardId: null,
    contaOrigemId: contaOrigemId || null,
    contaDestinoId: contaDestinoId || null,
    parcelaAtual: null,
    parcelasTotal: null,
    recurrenceId: null,
    origem: 'manual',
    iaConfianca: null,
    revisado: true,
    contaPaga: false,
  }
}
