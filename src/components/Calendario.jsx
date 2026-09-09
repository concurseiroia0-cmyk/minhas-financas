import { useState } from 'react'
import { fmtMoney } from '../utils/money.js'
import { hoje, parseDate, toISO } from '../utils/date.js'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

/**
 * Calendário dark (referência foto 2): hoje em círculo amarelo,
 * pontinhos nos dias com lançamentos, setas para trocar o mês.
 * transacoesPorDia: Map 'YYYY-MM-DD' → { total, qtd }
 */
export function Calendario({ transacoesPorDia }) {
  const hojeIso = hoje()
  const [ref, setRef] = useState(() => {
    const d = parseDate(hojeIso)
    return { ano: d.getFullYear(), mes: d.getMonth() }
  })

  const label = new Date(ref.ano, ref.mes, 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    .replace('.', '')
    .replace(/^./, (c) => c.toUpperCase())

  // grade: começa no domingo
  const primeiro = new Date(ref.ano, ref.mes, 1, 12)
  const inicio = new Date(primeiro)
  inicio.setDate(1 - primeiro.getDay())

  const semanas = []
  const cursor = new Date(inicio)
  for (let s = 0; s < 6; s++) {
    const linha = []
    for (let d = 0; d < 7; d++) {
      linha.push(toISO(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    semanas.push(linha)
    const proxima = new Date(cursor)
    if (proxima.getMonth() !== ref.mes && proxima > new Date(ref.ano, ref.mes + 1, 0, 12)) break
  }

  const navegar = (delta) => {
    setRef((r) => {
      const m = r.mes + delta
      return { ano: r.ano + Math.floor(m / 12), mes: ((m % 12) + 12) % 12 }
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => navegar(-1)} className="h-9 w-9 rounded-full bg-slate-800 grid place-items-center text-slate-300 hover:bg-slate-700" aria-label="Mês anterior">
          <ChevronLeft className="h-4.5 w-4.5" />
        </button>
        <span className="text-sm font-bold">{label}</span>
        <button onClick={() => navegar(1)} className="h-9 w-9 rounded-full bg-slate-800 grid place-items-center text-slate-300 hover:bg-slate-700" aria-label="Próximo mês">
          <ChevronRight className="h-4.5 w-4.5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {DIAS.map((d, i) => (
          <span key={i} className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 py-1">{d}</span>
        ))}
        {semanas.flat().map((iso) => {
          const dia = Number(iso.slice(8, 10))
          const noMes = iso.slice(0, 7) === `${ref.ano}-${String(ref.mes + 1).padStart(2, '0')}`
          const isHoje = iso === hojeIso
          const info = transacoesPorDia?.get(iso)
          return (
            <div key={iso} className="relative h-9 flex items-center justify-center">
              {isHoje ? (
                <span className="h-8 w-8 rounded-full bg-[#f6d353] text-slate-950 text-sm font-bold grid place-items-center shadow-lg shadow-[#f6d353]/25">
                  {dia}
                </span>
              ) : (
                <span className={`text-sm grid place-items-center h-8 w-8 rounded-full ${noMes ? 'text-slate-200' : 'text-slate-600'}`}>
                  {dia}
                </span>
              )}
              {info && (
                <span
                  className={`absolute bottom-0 h-1 w-1 rounded-full ${isHoje ? 'bg-slate-900' : 'bg-[#f6d353]'}`}
                  title={info.qtd > 0 ? `${info.qtd} lançamento(s) · ${fmtMoney(info.total)}` : undefined}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
