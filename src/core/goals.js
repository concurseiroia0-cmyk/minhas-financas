/**
 * Metas de economia — regras de negócio (sem IA, sem rede).
 *
 * goal: { id, titulo, alvo, guardado, criadoEm, conquistadaEm? }
 *
 * Níveis de cor (evoluem conforme o progresso, estilo Duolingo,
 * mas na paleta do app):
 *  1. violeta  (#a78bfa) — começando
 *  2. verde    (#4ade80) — no caminho
 *  3. laranja  (#fb923c) — quase lá
 *  4. amarelo  (#f6d353) — brilho de conquista (>= 100%)
 */

const NIVEIS = [
  { min: 0, cor: '#a78bfa', nivel: 1, rotulo: 'Começando' },
  { min: 0.34, cor: '#4ade80', nivel: 2, rotulo: 'No caminho' },
  { min: 0.67, cor: '#fb923c', nivel: 3, rotulo: 'Quase lá' },
  { min: 1, cor: '#f6d353', nivel: 4, rotulo: 'Conquistada!' },
]

export function progressoMeta(goal) {
  const alvo = Number(goal?.alvo) || 0
  const guardado = Number(goal?.guardado) || 0
  const pct = alvo > 0 ? guardado / alvo : 0
  const nivel = [...NIVEIS].reverse().find((n) => pct >= n.min) || NIVEIS[0]
  const restante = Math.max(0, alvo - guardado)
  return {
    pct: Math.min(pct, 1),
    pctExibicao: Math.round(Math.min(pct, 1) * 100),
    cor: nivel.cor,
    nivel: nivel.nivel,
    rotulo: nivel.rotulo,
    restante,
    conquistada: pct >= 1,
    transbordou: pct > 1, // guardou mais que o alvo
  }
}

/** Deposita (valor > 0) ou retira (valor < 0) de uma meta, com piso em 0. */
export function aplicarDeposito(goal, valor) {
  const guardado = Math.max(0, (Number(goal.guardado) || 0) + (Number(valor) || 0))
  const conquistadaEm = goal.conquistadaEm ?? (guardado >= (Number(goal.alvo) || Infinity) ? Date.now() : null)
  return { ...goal, guardado, conquistadaEm }
}

/** Curva de projeção: com o ritmo médio mensal, quando alcança o alvo? */
export function projetarConclusao(goal, historicoDepositos = []) {
  const { restante, conquistada } = progressoMeta(goal)
  if (conquistada || restante <= 0) return null
  const total = historicoDepositos.reduce((a, d) => a + Math.max(0, d.valor), 0)
  if (!historicoDepositos.length || total <= 0) return null
  const primeiro = Math.min(...historicoDepositos.map((d) => d.data))
  const meses = Math.max((Date.now() - primeiro) / (1000 * 60 * 60 * 24 * 30), 0.5)
  const ritmoMensal = total / meses
  if (ritmoMensal <= 0) return null
  const mesesRestantes = Math.ceil(restante / ritmoMensal)
  const alvoDate = new Date()
  alvoDate.setMonth(alvoDate.getMonth() + mesesRestantes)
  return {
    ritmoMensal: Math.round(ritmoMensal * 100) / 100,
    mesesRestantes,
    dataEstimada: `${String(alvoDate.getMonth() + 1).padStart(2, '0')}/${alvoDate.getFullYear()}`,
  }
}

export { NIVEIS }
