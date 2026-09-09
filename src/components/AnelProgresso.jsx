import { useEffect, useState } from 'react'
import { ChefIcon } from './ChefIcon.jsx'

const CIRCUNFERENCIA = 2 * Math.PI * 50

/**
 * Anel de progresso (base fornecida pelo usuário, cores do app).
 * percent: 0–1 · cor: stroke do anel · mostra % e rótulo abaixo (opcional)
 */
export function AnelProgresso({ percent = 0, cor = '#f6d353', tamanho = 140, rotulo, sub }) {
  const [animado, setAnimado] = useState(0)

  useEffect(() => {
    // anima da posição atual até o alvo (transition do CSS faz o resto)
    const t = requestAnimationFrame(() => setAnimado(percent))
    return () => cancelAnimationFrame(t)
  }, [percent])

  const offset = CIRCUNFERENCIA - Math.min(Math.max(animado, 0), 1) * CIRCUNFERENCIA

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <div className="relative" style={{ width: tamanho, height: tamanho }}>
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="50" fill="none" stroke="#232329" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke={cor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUNFERENCIA}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 0.9s ease-in-out, stroke 0.5s ease',
              filter: percent >= 1 ? 'drop-shadow(0 0 8px rgb(246 211 83 / 0.5))' : 'none',
            }}
          />
        </svg>
        {/* Chef no centro (sem rotação herdada) */}
        <div className="absolute inset-0 grid place-items-center">
          <div className="h-[62%] w-[62%] rounded-full bg-slate-800 grid place-items-center shadow-lg shadow-black/40">
            <ChefIcon className="h-[70%] w-[70%]" animado={percent >= 1} />
          </div>
        </div>
      </div>
      {(rotulo || sub) && (
        <div className="text-center">
          {rotulo && <p className="text-sm font-bold">{rotulo}</p>}
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
      )}
    </div>
  )
}
