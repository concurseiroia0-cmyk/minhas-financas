import Dexie from 'dexie'

export const db = new Dexie('financas-pwa')

db.version(1).stores({
  profile: 'id',
  accounts: 'id, nome',
  cards: 'id, nome',
  categories: 'id, nome',
  transactions: 'id, data, categoriaId, cardId, tipo, origem, recurrenceId, valor, contaPaga',
  recurrences: 'id, proximaData, ativo',
  aiCache: 'id, hashTexto',
  aiQueue: 'id, criadoEm',
  settings: 'id',
})

// v2: contaId (banco de origem) nas transações
db.version(2).stores({
  profile: 'id',
  accounts: 'id, nome',
  cards: 'id, nome',
  categories: 'id, nome',
  transactions: 'id, data, categoriaId, cardId, tipo, origem, recurrenceId, valor, contaPaga, contaId',
  recurrences: 'id, proximaData, ativo',
  aiCache: 'id, hashTexto',
  aiQueue: 'id, criadoEm',
  settings: 'id',
})

// ---------- Seeding ----------

const CATEGORIAS_PADRAO = [
  'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer',
  'Compras', 'Assinaturas', 'Educação', 'Salário', 'Outros',
]

const CORES = ['#34d399', '#38bdf8', '#a78bfa', '#f472b6', '#fbbf24',
  '#fb923c', '#f87171', '#2dd4bf', '#e879f9', '#94a3b8']

db.on('populate', async () => {
  // Apenas categorias: contas/bancos são criados no Onboarding ou nos dados demo
  await db.categories.bulkAdd(CATEGORIAS_PADRAO.map((nome, i) => ({ id: crypto.randomUUID(), nome, cor: CORES[i % CORES.length] })))
})

// ---------- Migrações ----------

db.on('ready', async () => {
  // campos novos em registros antigos
  await db.transactions.toCollection().modify((t) => {
    if (t.contaPaga === undefined) t.contaPaga = false
    if (t.parcelaAtual === undefined) t.parcelaAtual = null
    if (t.parcelasTotal === undefined) t.parcelasTotal = null
    if (t.iaConfianca === undefined) t.iaConfianca = null
    if (t.revisado === undefined) t.revisado = t.origem !== 'ia'
    if (t.data === undefined) t.data = hojeISO()
  })
  await db.cards.toCollection().modify((c) => {
    if (c.diaFechamento === undefined) c.diaFechamento = 1
    if (c.diaVencimento === undefined) c.diaVencimento = 10
    if (c.limite === undefined) c.limite = 0
  })
  await db.recurrences.toCollection().modify((r) => {
    if (r.frequencia === undefined) r.frequencia = 'mensal'
    if (r.dia === undefined) r.dia = r.proximaData ? Number(r.proximaData.slice(8, 10)) : 1
    if (r.metodo === undefined) r.metodo = 'pix'
  })
})

function hojeISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
