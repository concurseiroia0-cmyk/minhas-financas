import { db } from '../db/schema.js'
import { PROMPT_PARSE, PROMPT_CATEGORIZE } from './prompts.js'
import { askAI, OfflineError } from './client.js'
import { categorizarLocal, inferirMetodo } from './localRules.js'
import { buscarCategoriasAprendidas } from './categorize.js'
import { setCacheIA, getCacheIA, enfileirarIA } from '../db/repo.js'
import { hoje, addDays } from '../utils/date.js'
import { parseMoney } from '../utils/money.js'
import { temChaveIA } from '../config/ai.js'

/** Hash estável (djb2) do texto normalizado — chave do cache de IA. */
export function hashTexto(texto) {
  const t = String(texto || '').toLowerCase().trim().replace(/\s+/g, ' ')
  let h = 5381
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0
  return String(h)
}

async function categoriasDoUsuario() {
  const cats = await db.categories.toArray()
  return cats.map((c) => c.nome)
}

/**
 * Nível 1 — regras locais: "uber 25" vira transação sem IA, offline.
 * Retorna lista de itens no mesmo formato da IA, ou null se não resolveu.
 */
function tentarRegrasLocais(texto) {
  const itens = []
  // 1 valor na frase inteira → transação única ("comprei café e pão 12 reais")
  // ≥2 valores → divide por vírgula/" e " ("café 12 e uber 20")
  const valores = [...texto.matchAll(/(?:r\$\s*)?(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?(?:\.\d{1,2})?)\s*(?:reais|rs|r\$)?/gi)]
  const partes = valores.length >= 2
    ? texto.split(/,(?=\s)| e (?=\S*\s*[\dR\$])/i)
    : [texto]
  for (const parte of partes) {
    const mValor = parte.match(/(?:r\$\s*)?(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?(?:\.\d{1,2})?)\s*(?:reais|rs|r\$)?/i)
    if (!mValor) continue
    const valor = parseMoney(mValor[1])
    if (!valor) continue
    const descricao = parte.replace(mValor[0], '').replace(/\b(comprei|paguei|gastei|no|na|do|da|de|ontem|anteontem|hoje)\b/gi, ' ').replace(/\s+/g, ' ').trim() || parte.trim()
    const catNome = categorizarLocal(descricao)
    const data = /anteontem/i.test(parte) ? addDays(hoje(), -2) : /ontem/i.test(parte) ? addDays(hoje(), -1) : hoje()
    itens.push({
      descricao,
      valor,
      data,
      tipo: /recebi|salário|salario|recebimento|freela/i.test(parte) ? 'receita' : 'despesa',
      categoria: catNome, // pode ser null → tenta histórico/IA depois
      metodo: inferirMetodo(parte),
      confianca: catNome ? 0.85 : 0.6,
      origemNivel: 'regra-local',
    })
  }
  return itens.length ? itens : null
}

/** Completa categoria por aprendizado do histórico (Nível 2). */
async function completarComHistorico(itens) {
  const cats = await db.categories.toArray()
  const porNome = new Map(cats.map((c) => [c.nome.toLowerCase(), c.id]))
  for (const item of itens) {
    if (item.categoria) {
      item.categoriaId = porNome.get(item.categoria.toLowerCase()) ?? null
      if (!item.categoriaId) item.categoria = null
    }
    if (!item.categoriaId) {
      const aprendido = await buscarCategoriasAprendidas(item.descricao)
      if (aprendido) {
        item.categoriaId = aprendido.categoriaId
        item.categoria = cats.find((c) => c.id === aprendido.categoriaId)?.nome
        item.confianca = Math.min(0.95, 0.8 + aprendido.ocorrencias * 0.03)
        item.origemNivel = 'historico'
      }
    }
  }

  // [3] IA — só para o que sobrou sem categoria (não falha o parse se a IA cair)
  const faltando = itens.filter((i) => !i.categoriaId)
  if (faltando.length && temChaveIA() && navigator.onLine) {
    for (const item of faltando) {
      try {
        const r = await categorizarComIA(item.descricao, settings)
        if (r) {
          item.categoriaId = r.categoriaId
          item.categoria = null
          item.confianca = Math.max(item.confianca ?? 0, r.confianca ?? 0.6)
          item.origemNivel = 'ia'
        }
      } catch { /* segue sem categoria — usuário escolhe na confirmação */ }
    }
  }
  return itens
}

/**
 * Função principal: texto livre → propostas de transações.
 * Pipeline: regras locais → histórico → cache de IA → IA → fila offline.
 * NUNCA grava no banco: só propõe.
 */
export async function interpretarTexto(texto, settings) {
  if (!texto?.trim()) throw new Error('Texto vazio')

  // [1] Regras locais (offline, instantâneo)
  let itens = tentarRegrasLocais(texto)
  if (itens) return await completarComHistorico(itens)

  // [2] Cache de IA (mesma frase já vista?)
  const hash = hashTexto(texto)
  const cached = await getCacheIA(hash)
  if (cached?.resposta) {
    return await completarComHistorico(validarItens(cached.resposta.itens ?? []))
  }

  // [3] IA (OpenRouter/NVIDIA com fallback)
  const categorias = await categoriasDoUsuario()
  try {
    const resp = await askAI({
      system: PROMPT_PARSE(hoje(), categorias),
      user: texto,
      json: true,
      settings,
    })
    itens = validarItens(resp?.itens ?? [])
    await setCacheIA(hash, { itens, ambiguidade: resp?.ambiguidade ?? null })
    return await completarComHistorico(itens)
  } catch (e) {
    if (e instanceof OfflineError) {
      // [4] Fila para processar quando voltar a internet
      await enfileirarIA({ tipo: 'parse', payload: { texto } })
    }
    throw e
  }
}

/** Reexecuta um item da fila (chamado por queue.js). */
export async function executarFila(item) {
  if (item.tipo !== 'parse') return null
  const { useSettings } = await import('../store/useSettings.js')
  const settings = useSettings.getState()
  const resultado = await interpretarTexto(item.payload.texto, settings)
  // Guarda o resultado processado para a UI oferecer ao usuário
  await setCacheIA(hashTexto(item.payload.texto), { itens: resultado, ambiguidade: null, daFila: true })
  return resultado
}

/** Validação leve do output da IA antes de exibir. */
export function validarItens(itens) {
  if (!Array.isArray(itens)) return []
  return itens
    .filter((i) => i && (i.descricao || i.valor != null))
    .map((i) => ({
      descricao: String(i.descricao ?? 'Sem descrição').slice(0, 120),
      valor: i.valor == null ? null : Math.abs(Number(i.valor) || parseMoney(i.valor)),
      data: /^\d{4}-\d{2}-\d{2}$/.test(String(i.data)) ? i.data : hoje(),
      tipo: i.tipo === 'receita' ? 'receita' : 'despesa',
      categoria: i.categoria ?? null,
      categoriaId: null,
      metodo: ['dinheiro', 'pix', 'debito', 'credito'].includes(i.metodo) ? i.metodo : inferirMetodo(i.descricao),
      confianca: Math.max(0, Math.min(1, Number(i.confianca) || 0.5)),
      origemNivel: 'ia',
    }))
}

/** Categorização por IA de um único item (usada ao editar/confirmar). */
export async function categorizarComIA(descricao, settings) {
  const categorias = await categoriasDoUsuario()
  const recentes = await db.transactions.orderBy('data').reverse().limit(50).toArray()
  const contexto = recentes.slice(0, 10).map((t) => `${t.descricao}→${t.categoriaId}`).join('; ')
  const resp = await askAI({ system: PROMPT_CATEGORIZE(descricao, categorias, contexto), user: descricao, json: true, settings })
  const nome = resp?.categoria
  if (!nome) return null
  const cat = (await db.categories.toArray()).find((c) => c.nome.toLowerCase() === String(nome).toLowerCase())
  return cat ? { categoriaId: cat.id, confianca: Number(resp.confianca) || 0.6 } : null
}
