// Chaves e modelos de IA embutidos no build via variáveis de ambiente.
// O app é 100% local (dados no IndexedDB do dispositivo), então a chave
// embarcada substitui a antiga tela de configuração de API.
const CHAVES = {
  openrouter: import.meta.env.VITE_OPENROUTER_KEY || '',
  nvidia: import.meta.env.VITE_NVIDIA_KEY || '',
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
