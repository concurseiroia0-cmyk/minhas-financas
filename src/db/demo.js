import { db } from './schema.js'
import { salvarTransacao, salvarTransacoes } from './repo.js'
import { addDays, hoje, parseDate } from '../utils/date.js'

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const rnd = (min, max) => Math.round((Math.random() * (max - min) + min) * 100) / 100

const T = (data, tipo, valor, descricao, categoriaId, metodo, extra = {}) => ({
  id: crypto.randomUUID(),
  data, tipo, valor, descricao, categoriaId, metodo,
  cardId: null, parcelaAtual: null, parcelasTotal: null, recurrenceId: null,
  origem: 'manual', iaConfianca: null, revisado: true, contaPaga: false,
  ...extra,
})

export async function seedDemo() {
  if ((await db.transactions.count()) > 0) return
  const cats = await db.categories.toArray()
  const cat = (nome) => cats.find((c) => c.nome === nome)?.id ?? null
  const txs = []
  const hj = hoje()

  // Bancos demo: Nubank (guardado 400) e Banco do Brasil (guardado 300)
  const nubankId = crypto.randomUUID()
  const bbId = crypto.randomUUID()
  await db.accounts.bulkAdd([
    { id: nubankId, nome: 'Nubank', tipo: 'conta', saldoInicial: 1200 },
    { id: bbId, nome: 'Banco do Brasil', tipo: 'conta', saldoInicial: 800 },
    { id: crypto.randomUUID(), nome: 'Carteira', tipo: 'dinheiro', saldoInicial: 80 },
  ])
  const banco = () => (Math.random() < 0.5 ? nubankId : bbId)

  for (let atras = 100; atras >= 0; atras--) {
    const data = addDays(hj, -atras)
    const dow = parseDate(data).getDay()

    if (parseDate(data).getDate() === 5) {
      txs.push(T(data, 'receita', 3200, 'Salário', cat('Salário'), 'pix', { contaId: bbId }))
    }
    if (dow === 6) {
      txs.push(T(data, 'despesa', rnd(80, 220), 'Mercado', cat('Alimentação'), 'debito', { contaId: bbId }))
    }
    if (Math.random() < 0.6) {
      const r = Math.random()
      if (r < 0.35) txs.push(T(data, 'despesa', rnd(12, 60), pick(['iFood', 'Padaria', 'Almoço', 'Pizza']), cat('Alimentação'), 'pix', { contaId: banco() }))
      else if (r < 0.55) txs.push(T(data, 'despesa', rnd(9, 45), pick(['Uber', 'Ônibus', 'Gasolina', '99']), cat('Transporte'), 'pix', { contaId: banco() }))
      else if (r < 0.7) txs.push(T(data, 'despesa', rnd(25, 90), pick(['Bar', 'Cinema', 'Show', 'Lanche']), cat('Lazer'), 'credito'))
      else if (r < 0.8) txs.push(T(data, 'despesa', rnd(15, 130), pick(['Farmácia', 'Remédio', 'Academia']), cat('Saúde'), 'pix', { contaId: banco() }))
      else if (r < 0.9) txs.push(T(data, 'despesa', rnd(30, 180), pick(['Shein', 'Roupa', 'Tênis', 'Shopping']), cat('Compras'), 'credito'))
      else txs.push(T(data, 'despesa', rnd(20, 70), pick(['Papelaria', 'Presente', 'Outros']), cat('Outros'), 'pix', { contaId: banco() }))
    }
  }

  // Recorrentes
  const recorrentes = [
    { descricao: 'Netflix', valor: 39.9, categoriaId: cat('Assinaturas'), metodo: 'credito', dia: 12 },
    { descricao: 'Spotify', valor: 21.9, categoriaId: cat('Assinaturas'), metodo: 'credito', dia: 20 },
    { descricao: 'Aluguel', valor: 900, categoriaId: cat('Moradia'), metodo: 'pix', dia: 10 },
    { descricao: 'Academia', valor: 99, categoriaId: cat('Saúde'), metodo: 'debito', dia: 8 },
  ]
  for (const r of recorrentes) {
    const recId = crypto.randomUUID()
    const d0 = parseDate(hj)
    let proxMes = d0.getMonth() + 2
    let proxAno = d0.getFullYear()
    if (proxMes > 12) { proxMes = 1; proxAno++ }
    await db.recurrences.add({
      id: recId,
      descricao: r.descricao,
      valor: r.valor,
      tipo: 'despesa',
      categoriaId: r.categoriaId,
      metodo: r.metodo,
      cardId: null,
      frequencia: 'mensal',
      dia: r.dia,
      ativo: true,
      proximaData: `${proxAno}-${String(proxMes).padStart(2, '0')}-${String(Math.min(r.dia, 28)).padStart(2, '0')}`,
    })
    for (let i = 3; i >= 1; i--) {
      let mes = d0.getMonth() - i + 1
      let ano = d0.getFullYear()
      while (mes <= 0) { mes += 12; ano-- }
      const data = `${ano}-${String(mes).padStart(2, '0')}-${String(Math.min(r.dia, 28)).padStart(2, '0')}`
      if (data <= hj) {
        txs.push(T(data, 'despesa', r.valor, r.descricao, r.categoriaId, r.metodo, { recurrenceId: recId }))
      }
    }
  }

  // Cartão de crédito demo (vinculado ao Nubank)
  const cardId = crypto.randomUUID()
  await db.cards.add({ id: cardId, nome: 'Cartão Nubank', limite: 3000, diaFechamento: 5, diaVencimento: 12, contaId: nubankId })
  const comprasCartao = txs.filter((t) => t.metodo === 'credito').slice(-12)
  for (const t of comprasCartao) await db.transactions.update(t.id, { cardId })
  // Uma compra parcelada
  const parcelaValor = 83.33
  const parcelas = 6
  const dParc = parseDate(hj)
  for (let i = 0; i < parcelas; i++) {
    let mes = dParc.getMonth() + i
    let ano = dParc.getFullYear()
    while (mes > 11) { mes -= 12; ano++ }
    const data = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(Math.min(dParc.getDate(), 28)).padStart(2, '0')}`
    txs.push(T(data, 'despesa', parcelaValor, `Notebook (${i + 1}/${parcelas})`, cat('Compras'), 'credito', {
      cardId,
      parcelaAtual: i + 1,
      parcelasTotal: parcelas,
    }))
  }

  await salvarTransacoes(txs)
}
