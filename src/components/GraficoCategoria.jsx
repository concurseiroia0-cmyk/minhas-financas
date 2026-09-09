import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { fmtMoney } from '../utils/money.js'
import { EmptyState } from './ui.jsx'

export function GraficoCategoria({ dados }) {
  // dados: [{ nome, valor, cor }]
  const comValor = (dados || []).filter((d) => d.valor > 0)
  if (!comValor.length) return <EmptyState titulo="Sem gastos neste período" sub="Registre transações para ver o gráfico" />
  const total = comValor.reduce((a, d) => a + d.valor, 0)

  return (
    <div>
      <div className="h-56 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={comValor} dataKey="valor" nameKey="nome" innerRadius="62%" outerRadius="88%" paddingAngle={2} strokeWidth={0}>
              {comValor.map((d, i) => <Cell key={`${d.nome}-${i}`} fill={d.cor} />)}
            </Pie>
            <Tooltip
              formatter={(v, nome) => [`${fmtMoney(v)} (${Math.round((v / total) * 100)}%)`, nome]}
              contentStyle={{ background: 'rgb(15 23 42)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] uppercase tracking-wide text-slate-400">Total</span>
          <span className="text-lg font-bold">{fmtMoney(total)}</span>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        {comValor.sort((a, b) => b.valor - a.valor).map((d, i) => (
          <li key={`${d.nome}-${i}`} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.cor }} />
            <span className="flex-1 truncate">{d.nome}</span>
            <span className="text-slate-500 tabular-nums">{Math.round((d.valor / total) * 100)}%</span>
            <span className="font-medium tabular-nums w-24 text-right">{fmtMoney(d.valor)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function GraficoEvolucao({ meses }) {
  // meses: [{ mes: '2026-02', receitas, despesas }]
  if (!meses?.length) return null
  const max = Math.max(...meses.flatMap((m) => [m.receitas, m.despesas]), 1)
  const label = (mk) => {
    const [, m] = mk.split('-')
    return ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(m) - 1]
  }
  return (
    <div>
      <div className="flex items-end gap-2 h-40">
        {meses.map((m) => (
          <div key={m.mes} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <div className="w-full flex items-end justify-center gap-0.5 h-full">
              <div className="w-1/2 max-w-6 rounded-t bg-emerald-500/80" style={{ height: `${(m.receitas / max) * 100}%` }} title={`Receitas: ${fmtMoney(m.receitas)}`} />
              <div className="w-1/2 max-w-6 rounded-t bg-rose-500/80" style={{ height: `${(m.despesas / max) * 100}%` }} title={`Despesas: ${fmtMoney(m.despesas)}`} />
            </div>
            <span className="text-[10px] text-slate-400">{label(m.mes)}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 justify-center mt-2 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500/80" /> Receitas</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500/80" /> Despesas</span>
      </div>
    </div>
  )
}
