import { db } from './schema.js'

const uid = () => crypto.randomUUID()

// ---------------- Profile ----------------

export const getProfile = async () => (await db.profile.get('me')) ?? null
export const saveProfile = (data) => db.profile.put({ id: 'me', ...data })

// ---------------- Contas / Cartões / Categorias ----------------

export const listarContas = () => db.accounts.toArray()
export const salvarConta = (c) => db.accounts.put({ id: c.id ?? uid(), ...c })
export const excluirConta = (id) => db.accounts.delete(id)

export const listarCartoes = () => db.cards.toArray()
export const salvarCartao = (c) => db.cards.put({ id: c.id ?? uid(), ...c })
export const excluirCartao = (id) => db.cards.delete(id)

export const listarCategorias = () => db.categories.toArray()
export const salvarCategoria = (c) => db.categories.put({ id: c.id ?? uid(), ...c })
export const excluirCategoria = async (id) => {
  await db.transactions.where('categoriaId').equals(id).modify({ categoriaId: null })
  await db.categories.delete(id)
}

// ---------------- Transações ----------------

/** Upsert: se o item traz id existente, atualiza; senão cria novo. */
export async function salvarTransacao(t) {
  const tx = { ...t }
  if (!tx.id) tx.id = uid()
  tx.valor = Number(tx.valor) || 0
  if (t.id) {
    const { id, ...campos } = tx
    await db.transactions.update(id, campos)
    return id
  }
  await db.transactions.put(tx)
  return tx.id
}

export const salvarTransacoes = (lista) => db.transactions.bulkPut(lista)
export const excluirTransacao = (id) => db.transactions.delete(id)
export const getTransacao = (id) => db.transactions.get(id)
export const listarTransacoes = () => db.transactions.orderBy('data').reverse().toArray()

/** Detecta duplicata exata: mesma descrição/valor/data nos últimos dias. */
export async function encontrarDuplicata(t) {
  const desde = new Date()
  desde.setDate(desde.getDate() - 3)
  const iso = desde.toISOString().slice(0, 10)
  const recentes = await db.transactions.where('data').aboveOrEqual(iso).toArray()
  return recentes.find(
    (r) => r.id !== t.id && r.valor === Number(t.valor) && r.descricao === t.descricao && r.data === t.data,
  )
}

// ---------------- Recorrências ----------------

export const listarRecorrencias = () => db.recurrences.toArray()
export const salvarRecorrencia = (r) => db.recurrences.put({ id: r.id ?? uid(), ...r })
export const excluirRecorrencia = (id) => db.recurrences.delete(id)

// ---------------- IA: cache e fila ----------------

export const getCacheIA = (hashTexto) => db.aiCache.where('hashTexto').equals(hashTexto).first()
export const setCacheIA = (hashTexto, resposta) =>
  db.aiCache.put({ id: uid(), hashTexto, resposta, criadoEm: Date.now() })

export const enfileirarIA = (item) => db.aiQueue.put({ id: uid(), criadoEm: Date.now(), ...item })
export const listarFilaIA = () => db.aiQueue.orderBy('criadoEm').toArray()
export const removerFilaIA = (id) => db.aiQueue.delete(id)

// ---------------- Utilidades ----------------

export async function contagemNaoRevisadas() {
  return db.transactions.filter((t) => t.origem === 'ia' && !t.revisado).count()
}

export async function resetarTudo() {
  await Promise.all([
    db.transactions.clear(), db.recurrences.clear(), db.aiCache.clear(), db.aiQueue.clear(),
  ])
}

export async function exportarJSON() {
  const [profile, accounts, cards, categories, transactions, recurrences] = await Promise.all([
    db.profile.toArray(), db.accounts.toArray(), db.cards.toArray(),
    db.categories.toArray(), db.transactions.toArray(), db.recurrences.toArray(),
  ])
  return { app: 'financas-pwa', versao: 1, exportadoEm: new Date().toISOString(), profile, accounts, cards, categories, transactions, recurrences }
}

export async function importarJSON(data) {
  if (data.app !== 'financas-pwa') throw new Error('Arquivo não reconhecido como backup do app')
  await db.transaction('rw', db.profile, db.accounts, db.cards, db.categories, db.transactions, db.recurrences, async () => {
    await Promise.all([db.profile.clear(), db.accounts.clear(), db.cards.clear(), db.categories.clear(), db.transactions.clear(), db.recurrences.clear()])
    if (data.profile?.length) await db.profile.bulkPut(data.profile)
    if (data.accounts?.length) await db.accounts.bulkPut(data.accounts)
    if (data.cards?.length) await db.cards.bulkPut(data.cards)
    if (data.categories?.length) await db.categories.bulkPut(data.categories)
    if (data.transactions?.length) await db.transactions.bulkPut(data.transactions)
    if (data.recurrences?.length) await db.recurrences.bulkPut(data.recurrences)
  })
}
