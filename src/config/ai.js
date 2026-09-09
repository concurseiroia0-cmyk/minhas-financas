// Chaves e modelos de IA embutidos no build via variáveis de ambiente.
// O app é 100% local (dados no IndexedDB do dispositivo), então a chave
// embarcada substitui a antiga tela de configuração de API.
//
// As chaves podem vir em texto puro (dev) ou base64 (deploy público,
// para não disparar o push protection do GitHub). Decodificação em runtime.
const decod = (v) => {
  if (!v) return ''
  v = String(v).trim()
  if (!/^[A-Za-z0-9+/=]+$/.test(v) || v.length < 24 || v.includes('sk-') || v.includes('nvapi-')) return v
  try {
    const dec = atob(v)
    return dec
  } catch {
    return v
  }
}

const CHAVES = {
  openrouter: decod(import.meta.env.VITE_OPENROUTER_KEY_B64 || import.meta.env.VITE_OPENROUTER_KEY || ''),
  nvidia: decod(import.meta.env.VITE_NVIDIA_KEY_B64 || import.meta.env.VITE_NVIDIA_KEY || ''),
}

// Modelos GRATUITOS validados (Setembro/2026):
//  - OpenRouter :free  → nvidia/nemotron-3-super-120b-a12b:free
//  - NVIDIA NIM direto → nvidia/nemotron-3-super-120b-a12b
const MODELOS = {
  openrouter: import.meta.env.VITE_OPENROUTER_MODEL || 'nvidia/nemotron-3-super-120b-a12b:free',
  nvidia: import.meta.env.VITE_NVIDIA_MODEL || 'nvidia/nemotron-3-super-120b-a12b',
}

export const temChaveIA = () => Boolean(CHAVES.openrouter || CHAVES.nvidia)

export { CHAVES, MODELOS }
