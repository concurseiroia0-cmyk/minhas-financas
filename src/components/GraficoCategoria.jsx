import { fmtMoney } from '../utils/money.js'
import { EmptyState } from './ui.jsx'

/**
 * Gráfico radial analítico (referência: foto 3):
 * arco principal grosso com glow amarelo (maior categoria),
 * arcos finos concêntricos externos + guias escuras, abertura embaixo.
 */
export function GraficoCategoria({ dados, labelTotal = 'Total do mês' }) {
  const comValor = (dados || []).filter((d) => d.valor > 0).sort((a, b) => b.valor - a.valor)
  if (!comValor.length) return <EmptyState titulo="Sem gastos neste período" sub="Registre transações para ver o gráfico" />
  const total = comValor.reduce((a, d) => a + d.valor, 0)

  const arcos = comValor.slice(0, 5).map((d, i) => ({
    nome: d.nome,
    valor: d.valor,
    fill: d.cor,
    pct: (d.valor / total) * 100,
    principal: i === 0,
  }))
  const demais = comValor.slice(5)
  const demaisValor = demais.reduce((a, d) => a + d.valor, 0)
  if (demaisValor > 0) arcos.push({ nome: 'Outros', valor: demaisValor, fill: '#3a3a44', pct: (demaisValor / total) * 100, principal: false })

  return (
    <div>
      <div className="h-60 relative">
        <GaugeSvg arcos={arcos} />
        <div className="absolute inset-x-0 bottom-2 flex flex-col items-center pointer-events-none">
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{labelTotal}</span>
          <span className="text-2xl font-extrabold tracking-tight">{fmtMoney(total)}</span>
        </div>
      </div>

      <ul className="mt-4 space-y-2.5">
        {arcos.map((d, i) => (
          <li key={`${d.nome}-${i}`} className="flex items-center gap-2.5 text-sm">
            <span
              className={`h-2.5 w-2.5 rounded-full shrink-0 ${d.principal ? 'glow-butter' : ''}`}
              style={{ background: d.fill }}
            />
            <span className="flex-1 min-w-0 truncate text-slate-100">{d.nome}</span>
            <span className="text-[11px] text-slate-500 tabular-nums w-9 text-right shrink-0">{Math.round(d.pct)}%</span>
            <span className="font-bold tabular-nums w-[5.5rem] text-right shrink-0">{fmtMoney(d.valor)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const CX = 120
const CY = 118
const SPAN = 260 // graus varridos (abertura de 100° embaixo)
const START = -130

function polar(r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)]
}

/** Arco de círculo de START até START + span*pct, no sentido horário. */
function pathArco(r, pct) {
  const sweep = Math.max((Math.min(pct, 100) / 100) * SPAN, 3)
  const a0 = START
  const a1 = START + sweep
  const [x0, y0] = polar(r, a0)
  const [x1, y1] = polar(r, a1)
  const grande = sweep > 180 ? 1 : 0
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${grande} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
}

function GaugeSvg({ arcos }) {
  const R_PRINCIPAL = 74
  const rsExtras = arcos.slice(1).map((_, i) => 103 + i * 9)
  return (
    <svg viewBox="0 0 240 240" className="w-full h-full" role="img" aria-label="Gastos por categoria">
      {/* guias concêntricas */}
      <path d={pathArco(R_PRINCIPAL, 100)} stroke="#1c1c22" strokeWidth={34} fill="none" strokeLinecap="round" />
      {rsExtras.map((r) => (
        <path key={r} d={pathArco(r, 100)} stroke="#1c1c22" strokeWidth={7} fill="none" strokeLinecap="round" />
      ))}
      {/* arco principal (maior gasto) com glow */}
      {arcos[0] && (
        <path
          d={pathArco(R_PRINCIPAL, arcos[0].pct)}
          stroke={arcos[0].fill}
          strokeWidth={28}
          fill="none"
          strokeLinecap="round"
          className="glow-butter"
        />
      )}
      {/* arcos finos externos */}
      {arcos.slice(1).map((a, i) => (
        <path
          key={`${a.nome}-${i}`}
          d={pathArco(rsExtras[i], a.pct)}
          stroke={a.fill}
          strokeWidth={4.5}
          fill="none"
          strokeLinecap="round"
        />
      ))}
    </svg>
  )
}

/**
 * Evolução mensal em barras arredondadas duplas (receita/despesa),
 * no estilo do dashboard da foto 1 (fundo grafite, barras violeta/amarelo).
 */
export function GraficoEvolucao({ meses }) {
  if (!meses?.length) return null
  const max = Math.max(...meses.flatMap((m) => [m.receitas, m.despesas]), 1)
  const label = (mk) => {
    const [, m] = mk.split('-')
    return ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(m) - 1]
  }
  return (
    <div>
      <div className="flex items-end gap-2.5 h-44 rounded-2xl bg-slate-900/70 border border-slate-800 px-3 pt-3">
        {meses.map((m) => (
          <div key={m.mes} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <div className="w-full flex items-end justify-center gap-1 h-full">
              <div className="w-1/2 max-w-7 rounded-full bg-violet-500/85" style={{ height: `${Math.max((m.receitas / max) * 100, 2)}%` }} title={`Receitas: ${fmtMoney(m.receitas)}`} />
              <div className="w-1/2 max-w-7 rounded-full bg-[#f6d353]" style={{ height: `${Math.max((m.despesas / max) * 100, 2)}%` }} title={`Despesas: ${fmtMoney(m.despesas)}`} />
            </div>
            <span className="text-[10px] text-slate-500 pb-1">{label(m.mes)}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 justify-center mt-2.5 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500/85" /> Receitas</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#f6d353]" /> Despesas</span>
      </div>
    </div>
  )
}
