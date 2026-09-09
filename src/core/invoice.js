import { parseDate, toISO } from '../utils/date.js'

/**
 * Fatura de cartão.
 * REGRA: a compra no crédito é a despesa (na data da compra).
 * O pagamento da fatura é transferência entre contas — não despesa nova.
 *
 * card: { id, nome, limite, diaFechamento, diaVencimento }
 */
export function calcularFatura(card, transacoes, ref = new Date()) {
  const doCartao = transacoes.filter(
    (t) => t.cardId === card.id && t.metodo === 'credito' && !t.contaPaga,
  )

  const hoje_ = toISO(ref)
  const fechDia = card.diaFechamento ?? 1
  const vencDia = card.diaVencimento ?? 10

  // Ciclo atual: fechamento anterior → próximo fechamento
  const refDate = parseDate(hoje_)
  const proxFech = new Date(refDate.getFullYear(), refDate.getMonth(), Math.min(fechDia, 28), 12)
  if (proxFech <= refDate) proxFech.setMonth(proxFech.getMonth() + 1)
  const fechAnterior = new Date(proxFech)
  fechAnterior.setMonth(fechAnterior.getMonth() - 1)

  const inicio = toISO(fechAnterior)
  const fim = toISO(proxFech)

  const noCiclo = doCartao.filter((t) => t.data >= inicio && t.data < fim)
  const aberta = noCiclo.reduce((a, t) => a + (Number(t.valor) || 0), 0)

  // Próximas parcelas ainda não inclusas no ciclo atual
  const futuras = doCartao
    .filter((t) => t.parcelaAtual != null && t.data >= fim)
    .reduce((a, t) => a + (Number(t.valor) || 0), 0)

  // Vencimento do ciclo atual: mesmo mês do fechamento (ex.: fecha 05/set → vence 12/set)
  const vencimento = new Date(proxFech.getFullYear(), proxFech.getMonth(), Math.min(vencDia, 28), 12)
  if (vencimento < proxFech) vencimento.setMonth(vencimento.getMonth() + 1)

  return {
    aberta: Math.round(aberta * 100) / 100,
    futuras: Math.round(futuras * 100) / 100,
    totalNoCartao: Math.round((aberta + futuras) * 100) / 100,
    disponivel: Math.max(0, (Number(card.limite) || 0) - aberta - futuras),
    fechamento: fim,
    vencimento: toISO(vencimento),
    compras: noCiclo.sort((a, b) => b.data.localeCompare(a.data)),
  }
}

/**
 * Marca a fatura de um cartão como paga: transfere da conta para o cartão.
 * Cria uma transação "transferência" (tipo 'transferencia') que NÃO entra
 * nos totais de despesa, e marca as compras do ciclo como contaPaga.
 */
export function pagarFatura({ card, valor, contaOrigemId, transacoes }) {
  const fatura = calcularFatura(card, transacoes)
  const aPagar = Math.min(valor ?? fatura.aberta, fatura.aberta)
  if (aPagar <= 0) return { transferencia: null, idsPagos: [] }

  const idsPagos = fatura.compras.map((t) => t.id)
  const transferencia = {
    id: crypto.randomUUID(),
    data: toISO(new Date()),
    valor: aPagar,
    tipo: 'transferencia',
    descricao: `Pagamento fatura ${card.nome}`,
    categoriaId: null,
    metodo: 'debito',
    cardId: card.id,
    contaOrigemId,
    parcelaAtual: null,
    parcelasTotal: null,
    recurrenceId: null,
    origem: 'manual',
    iaConfianca: null,
    revisado: true,
    contaPaga: false,
  }
  return { transferencia, idsPagos }
}
