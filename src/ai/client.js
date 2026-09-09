const TIMEOUT_MS = 30000

// Provedores — chaves e modelos vêm do build (src/config/ai.js)
import { CHAVES, MODELOS } from '../config/ai.js'

const PROVIDERS = {
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    modelo: () => MODELOS.openrouter,
    chave: () => CHAVES.openrouter,
  },
  nvidia: {
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    modelo: () => MODELOS.nvidia,
    chave: () => CHAVES.nvidia,
  },
}

export class AIUnavailableError extends Error {
  constructor(msg = 'IA indisponível (sem internet ou provedores falharam)') {
    super(msg)
    this.name = 'AIUnavailableError'
  }
}
export class OfflineError extends AIUnavailableError {
  constructor() {
    super('Você está offline. A sugestão entrou na fila.')
    this.name = 'OfflineError'
  }
}
export class NoAPIKeyError extends AIUnavailableError {
  constructor() {
    super('Nenhuma chave de IA configurada no build')
    this.name = 'NoAPIKeyError'
  }
}

function fetchComTimeout(url, options, ms = TIMEOUT_MS) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(t))
}

/** Extrai o primeiro objeto/array JSON válido de um texto (tolerante a ```json fences). */
export function parseJSONSeguro(texto) {
  if (!texto) throw new Error('Resposta vazia da IA')
  let s = String(texto).trim()
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) s = fence[1].trim()
  try {
    return JSON.parse(s)
  } catch {
    for (const [abre, fecha] of [['{', '}'], ['[', ']']]) {
      const i = s.indexOf(abre)
      const j = s.lastIndexOf(fecha)
      if (i !== -1 && j > i) {
        try {
          return JSON.parse(s.slice(i, j + 1))
        } catch { /* continua */ }
      }
    }
    throw new Error('IA não retornou JSON válido')
  }
}

/**
 * askAI({ system, user, json }) → string | objeto
 * Tenta o provedor preferido (settings.provedorIA) e faz fallback para o outro.
 * Modelos free: nemotron-3-super-120b (OpenRouter :free e NVIDIA NIM).
 */
export async function askAI({ system, user, json = true, settings }) {
  if (!navigator.onLine) throw new OfflineError()

  const ordem = settings?.provedorIA === 'nvidia'
    ? ['nvidia', 'openrouter']
    : ['openrouter', 'nvidia']

  let ultimoErro = null
  for (const nome of ordem) {
    const p = PROVIDERS[nome]
    const chave = p.chave()
    if (!chave) { ultimoErro = new NoAPIKeyError(); continue }
    try {
      const r = await fetchComTimeout(p.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${chave}`,
          ...(nome === 'openrouter' ? { 'HTTP-Referer': location.origin, 'X-Title': 'Minhas Financas' } : {}),
        },
        body: JSON.stringify({
          model: p.modelo(),
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          temperature: 0.2,
          ...(json && nome === 'openrouter' ? { response_format: { type: 'json_object' } } : {}),
        }),
      })
      if (!r.ok) throw new Error(`${nome} HTTP ${r.status}`)
      const data = await r.json()
      const msg = data?.choices?.[0]?.message
      // modelos de raciocínio às vezes deixam content vazio e respondem em reasoning
      const conteudo = msg?.content || msg?.reasoning || ''
      if (!conteudo) throw new Error(`${nome}: resposta sem conteúdo`)
      return json ? parseJSONSeguro(conteudo) : conteudo
    } catch (e) {
      ultimoErro = e
      continue // tenta o próximo provedor
    }
  }
  if (ultimoErro instanceof NoAPIKeyError && !Object.values(PROVIDERS).some((p) => p.chave())) throw ultimoErro
  throw new AIUnavailableError(ultimoErro?.message || 'Provedores de IA falharam')
}
