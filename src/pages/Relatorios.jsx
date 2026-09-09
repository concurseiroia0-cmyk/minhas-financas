import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema.js'
import { Card, PageHeader, Spinner, CardResumo } from '../components/ui.jsx'
import { GraficoEvolucao, GraficoCategoria } from '../components/GraficoCategoria.jsx'
import { evolucaoMensal, gastoDoMes } from '../core/balance.js'
import { resumoSemanal } from '../ai/weeklySummary.js'
import { sugerirEconomia } from '../ai/savingTips.js'
import { useSettings } from '../store/useSettings.js'
import { fmtMoney } from '../utils/money.js'
import { monthKey, hoje, fmtMonthLabel } from '../utils/date.js'
import { Sparkles, Lightbulb, FileText, RefreshCw } from 'lucide-react'

export default function Relatorios() {
  const settings = useSettings()
  const txs = useLiveQuery(() => db.transactions.toArray(), []) ?? []
  const recs = useLiveQuery(() => db.recurrences.toArray(), []) ?? []
  const profile = useLiveQuery(() => db.profile.get('me'), [])
  const cats = useLiveQuery(() => db.categories.toArray(), []) ?? []

  const [offset, setOffset] = useState(0)
  const [resumo, setResumo] = useState(null)
  const [gerandoResumo, setGerandoResumo] = useState(false)
  const [sugestoes, setSugestoes] = useState(null)
  const [gerandoSugestoes, setGerandoSugestoes] = useState(false)

  const meses = evolucaoMensal(txs, 6)
  const mk = monthKey(hoje())
  const catDe = new Map(cats.map((c) => [c.id, c]))

  async function gerarResumo() {
    setGerandoResumo(true)
    try {
      const r = await resumoSemanal(txs, profile, settings, offset)
      setResumo(r)
    } finally {
      setGerandoResumo(false)
    }
  }

  async function gerarSugestoes() {
    setGerandoSugestoes(true)
    try {
      const r = await sugerirEconomia(txs, recs, profile, settings)
      setSugestoes(r)
    } finally {
      setGerandoSugestoes(false)
    }
  }

  const donut = [...(() => {
    const mapa = new Map()
    for (const t of txs) {
      if (t.tipo !== 'despesa' || t.contaPaga || monthKey(t.data) !== mk) continue
      const k = t.categoriaId || 'sem'
      mapa.set(k, (mapa.get(k) || 0) + (Number(t.valor) || 0))
    }
    return mapa.entries()
  })()].map(([id, valor]) => ({ nome: catDe.get(id)?.nome || 'Sem categoria', valor, cor: catDe.get(id)?.cor || '#94a3b8' }))

  return (
    <div>
      <PageHeader title="Relatórios" subtitle={fmtMonthLabel(mk)} />

      <div className="grid grid-cols-2 gap-3 mb-3">
        <CardResumo titulo="Receitas do mês" valor={meses[meses.length - 1]?.receitas} cor="text-emerald-600 dark:text-emerald-400" />
        <CardResumo titulo="Despesas do mês" valor={meses[meses.length - 1]?.despesas} cor="text-rose-600 dark:text-rose-400" />
      </div>

      <Card className="p-4 mb-3">
        <p className="text-sm font-semibold mb-3">Evolução (6 meses)</p>
        <GraficoEvolucao meses={meses} />
      </Card>

      <Card className="p-4 mb-3">
        <p className="text-sm font-semibold mb-2">Gastos por categoria (mês)</p>
        <GraficoCategoria dados={donut} />
      </Card>

      {/* Resumo semanal */}
      <Card className="p-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold flex items-center gap-1.5"><FileText className="h-4 w-4 text-emerald-500" /> Resumo da semana</p>
          <button onClick={gerarResumo} disabled={gerandoResumo}
            className="text-xs rounded-lg px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 disabled:opacity-50">
            {gerandoResumo ? <Spinner className="h-3 w-3" /> : <RefreshCw className="h-3.5 w-3.5" />} Gerar
          </button>
        </div>
        {!resumo ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gera um resumo com os números da semana. Usa IA se houver chave configurada — senão, escreve localmente.
          </p>
        ) : (
          <div>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{resumo.texto}</p>
            <p className="text-[11px] text-slate-400 mt-2">
              fonte: {resumo.fonte === 'ia' ? 'IA' : 'cálculo local'} · {resumo.periodo} · {resumo.qtdTransacoes} lançamentos
            </p>
          </div>
        )}
      </Card>

      {/* Sugestões de economia */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold flex items-center gap-1.5"><Lightbulb className="h-4 w-4 text-amber-500" /> Sugestões de economia</p>
          <button onClick={gerarSugestoes} disabled={gerandoSugestoes}
            className="text-xs rounded-lg px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 disabled:opacity-50">
            {gerandoSugestoes ? <Spinner className="h-3 w-3" /> : <Sparkles className="h-3.5 w-3.5" />} Gerar
          </button>
        </div>
        {!sugestoes ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Analisa os últimos 90 dias e suas recorrentes para sugerir cortes realistas.
          </p>
        ) : (
          <div className="space-y-2.5">
            {sugestoes.sugestoes.map((s, i) => (
              <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{s.titulo}</p>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap tabular-nums">
                    {fmtMoney(s.economiaMensal)}/mês
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{s.acao}</p>
                {s.horasEquivalentes > 0 && (
                  <p className="text-[11px] text-slate-400 mt-1">🕐 equivale a {Number(s.horasEquivalentes).toFixed(1)}h de trabalho</p>
                )}
              </div>
            ))}
            <p className="text-[11px] text-slate-400">fonte: {sugestoes.fonte === 'ia' ? 'IA' : 'cálculo local'}</p>
          </div>
        )}
      </Card>
    </div>
  )
}
