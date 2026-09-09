import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema.js'
import { valorHora, horasPara } from '../core/hourlyRate.js'
import { fmtMoney, fmtHours, parseMoney } from '../utils/money.js'
import { Card, PageHeader, inputCls, Field, EmptyState } from '../components/ui.jsx'
import { Clock } from 'lucide-react'

export default function HorasCalc() {
  const profile = useLiveQuery(() => db.profile.get('me'), [])
  const [precoInput, setPrecoInput] = useState('')

  const vh = valorHora(profile ?? null)
  const preco = parseMoney(precoInput)
  const res = useMemo(() => (preco > 0 ? horasPara(preco, profile ?? null) : null), [preco, profile])

  if (!profile) return null

  const atalhos = [20, 50, 100, 500, 1000]

  return (
    <div>
      <PageHeader title="Calculadora de horas" subtitle={`Seu valor: ${fmtMoney(vh)} por hora trabalhada`} />

      {!vh ? (
        <EmptyState icon={Clock} titulo="Configure seu perfil primeiro"
          sub="Informe renda líquida, dias trabalhados e horas por dia para calcular o valor da hora." />
      ) : (
        <>
          <Card className="p-4 mb-3">
            <Field label="Preço (R$)">
              <input autoFocus className={`${inputCls} text-2xl font-bold text-center`} inputMode="decimal" placeholder="0,00"
                value={precoInput} onChange={(e) => setPrecoInput(e.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-1.5">
              {atalhos.map((v) => (
                <button key={v} onClick={() => setPrecoInput(String(v).replace('.', ','))}
                  className="text-xs rounded-full px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
                  R$ {v}
                </button>
              ))}
            </div>
          </Card>

          {res && (
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-5 text-center">
                <p className="text-xs uppercase tracking-wide text-slate-400">Horas de trabalho</p>
                <p className="text-3xl font-extrabold text-amber-500 mt-1">{fmtHours(res.horas)}</p>
              </Card>
              <Card className="p-5 text-center">
                <p className="text-xs uppercase tracking-wide text-slate-400">Dias de trabalho</p>
                <p className="text-3xl font-extrabold text-sky-500 mt-1">{res.dias.toFixed(1)}</p>
              </Card>
              <Card className="p-4 col-span-2">
                <p className="text-sm text-slate-600 dark:text-slate-300 text-center">
                  {fmtMoney(preco)} = <strong>{fmtHours(res.horas)}</strong> do seu trabalho
                  {res.dias >= 1 && <> · cerca de <strong>{res.dias.toFixed(1)} dia(s)</strong> útil(eis)</>}
                </p>
              </Card>
            </div>
          )}

          <Card className="p-4 mt-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Como calculamos</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              valor da hora = renda líquida ÷ (dias trabalhados × horas por dia)<br />
              <span className="tabular-nums text-slate-400">{fmtMoney(profile.rendaLiquida)} ÷ ({profile.diasTrabalhados} × {profile.horasPorDia}h) = {fmtMoney(vh)}/h</span>
            </p>
          </Card>
        </>
      )}
    </div>
  )
}
