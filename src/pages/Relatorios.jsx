import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema.js'
import { Card, PageHeader, Spinner, CardResumo, Badge } from '../components/ui.jsx'
import { GraficoEvolucao, GraficoCategoria } from '../components/GraficoCategoria.jsx'
import { evolucaoMensal } from '../core/balance.js'
import { resumoSemanal } from '../ai/weeklySummary.js'
import { sugerirEconomia } from '../ai/savingTips.js'
import { useSettings } from '../store/useSettings.js'
import { fmtMoney } from '../utils/money.js'
import { monthKey, hoje, fmtMonthLabel } from '../utils/date.js'
import { Sparkles, Lightbulb, FileText, RefreshCw, WifiOff, TrendingUp, TrendingDown, Clock, Receipt, CalendarDays } from 'lucide-react'

/** Mensagem amigável para falha de IA (offline ou provedores fora). */
function msgErroIA(e) {
  const off = !navigator.onLine || e?.name === 'OfflineError'
  return off
    ? 'Você está sem internet. Conecte-se e toque em Gerar de novo — o relatório é escrito por IA.'
    : 'A IA não respondeu agora (os dois provedores falharam). Tente novamente em instantes.'
}

export default function Relatorios() {
  const settings = useSettings()
  const txs = useLiveQuery(() => db.transactions.toArray(), []) ?? []
  const recs = useLiveQuery(() => db.recurrences.toArray(), []) ?? []
  const profile = useLiveQuery(() => db.profile.get('me'), [])
  const cats = useLiveQuery(() => db.categories.toArray(), []) ?? []

  const [offset, setOffset] = useState(0)
  const [resumo, setResumo] = useState(null)
  const [gerandoResumo, setGerandoResumo] = useState(false)
  const [erroResumo, setErroResumo] = useState(null)
  const [sugestoes, setSugestoes] = useState(null)
  const [gerandoSugestoes, setGerandoSugestoes] = useState(false)
  const [erroSugestoes, setErroSugestoes] = useState(null)

  const meses = evolucaoMensal(txs, 6)
  const mk = monthKey(hoje())
  const catDe = new Map(cats.map((c) => [c.id, c]))

  async function gerarResumo(novoOffset) {
    const off = novoOffset ?? offset
    setOffset(off)
    setErroResumo(null)
    setGerandoResumo(true)
    try {
      setResumo(await resumoSemanal(txs, profile, settings, off))
    } catch (e) {
      setErroResumo(msgErroIA(e))
    } finally {
      setGerandoResumo(false)
    }
  }

  async function gerarSugestoes() {
    setErroSugestoes(null)
    setGerandoSugestoes(true)
    try {
      setSugestoes(await sugerirEconomia(txs, recs, profile, settings))
    } catch (e) {
      setErroSugestoes(msgErroIA(e))
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
  })()].map(([id, valor]) => ({ nome: catDe.get(id)?.nome || 'Sem categoria', valor, cor: catDe.get(id)?.cor || '#8f8f9e' }))

  // dados do relatório semanal para o radial
  const semanaDonut = resumo?.porCategoria?.map((c) => ({
    nome: c.categoria,
    valor: c.valor,
    cor: catDe.get(c.catId)?.cor || '#8f8f9e',
    delta: c.deltaSemanaAnterior,
  })) ?? []

  return (
    <div>
      <PageHeader title="Relatórios" subtitle={fmtMonthLabel(mk)} />

      <div className="grid grid-cols-2 gap-3 mb-3">
        <CardResumo titulo="Receitas do mês" valor={meses[meses.length - 1]?.receitas} cor="text-[#f6d353]" />
        <CardResumo titulo="Despesas do mês" valor={meses[meses.length - 1]?.despesas} cor="text-rose-400" />
      </div>

      {/* ── Relatório semanal detalhado (IA) ─────────────────── */}
      <Card className="p-4 mb-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-bold flex items-center gap-1.5"><FileText className="h-4 w-4 text-[#f6d353]" /> Relatório da semana</p>
          <button onClick={() => gerarResumo()} disabled={gerandoResumo}
            className="text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 hover:bg-slate-800 inline-flex items-center gap-1 disabled:opacity-50">
            {gerandoResumo ? <Spinner className="h-3 w-3" /> : <RefreshCw className="h-3.5 w-3.5" />} {resumo ? 'Regenerar' : 'Gerar'}
          </button>
        </div>
        <p className="text-[11px] text-slate-500 mb-3">Gerado por IA com base nos números da semana — requer internet.</p>

        {/* seletor de semana */}
        <div className="flex gap-1.5 mb-3">
          {[0, -1, -2].map((o) => (
            <button key={o} onClick={() => gerarResumo(o)}
              className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${offset === o && resumo ? 'border-[#f6d353] bg-[#f6d353]/10 text-[#f6d353] font-semibold' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
              {o === 0 ? 'Esta semana' : o === -1 ? 'Semana passada' : 'Há 2 semanas'}
            </button>
          ))}
        </div>

        {gerandoResumo && (
          <div className="rounded-xl bg-slate-800/60 p-4 text-sm text-slate-400 flex items-center gap-2">
            <Spinner className="h-4 w-4" /> A IA está analisando sua semana…
          </div>
        )}

        {!gerandoResumo && erroResumo && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-2.5">
            <WifiOff className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-300">Sem conexão com a IA</p>
              <p className="text-xs text-amber-200/70 mt-0.5">{erroResumo}</p>
            </div>
          </div>
        )}

        {!gerandoResumo && !erroResumo && !resumo && (
          <p className="text-sm text-slate-500">
            Toque em <strong className="text-slate-300">Gerar</strong> para a IA criar um relatório detalhado da semana: gráfico por categoria, totais, comparação com a semana anterior e o maior gasto em horas de trabalho.
          </p>
        )}

        {!gerandoResumo && resumo && <RelatorioSemanal resumo={resumo} semanaDonut={semanaDonut} />}
      </Card>

      {/* ── Evolução 6 meses ─────────────────────────────────── */}
      <Card className="p-4 mb-3">
        <p className="text-sm font-bold mb-3">Evolução (6 meses)</p>
        <GraficoEvolucao meses={meses} />
      </Card>

      {/* ── Gastos por categoria (mês) ───────────────────────── */}
      <Card className="p-4 mb-3">
        <p className="text-sm font-bold mb-2">Gastos por categoria (mês)</p>
        <GraficoCategoria dados={donut} />
      </Card>

      {/* ── Sugestões de economia (IA) ───────────────────────── */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-bold flex items-center gap-1.5"><Lightbulb className="h-4 w-4 text-[#f6d353]" /> Sugestões de economia</p>
          <button onClick={gerarSugestoes} disabled={gerandoSugestoes}
            className="text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 hover:bg-slate-800 inline-flex items-center gap-1 disabled:opacity-50">
            {gerandoSugestoes ? <Spinner className="h-3 w-3" /> : <Sparkles className="h-3.5 w-3.5" />} {sugestoes ? 'Regenerar' : 'Gerar'}
          </button>
        </div>
        <p className="text-[11px] text-slate-500 mb-3">A IA analisa os últimos 90 dias e suas recorrentes — requer internet.</p>

        {gerandoSugestoes && (
          <div className="rounded-xl bg-slate-800/60 p-4 text-sm text-slate-400 flex items-center gap-2">
            <Spinner className="h-4 w-4" /> A IA está buscando oportunidades…
          </div>
        )}

        {!gerandoSugestoes && erroSugestoes && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-2.5">
            <WifiOff className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-300">Sem conexão com a IA</p>
              <p className="text-xs text-amber-200/70 mt-0.5">{erroSugestoes}</p>
            </div>
          </div>
        )}

        {!gerandoSugestoes && !erroSugestoes && !sugestoes && (
          <p className="text-sm text-slate-500">Sugestões realistas de corte, cada uma com a economia mensal estimada e o equivalente em horas de trabalho.</p>
        )}

        {!gerandoSugestoes && sugestoes && (
          <div className="space-y-2.5">
            {sugestoes.sugestoes.map((s, i) => (
              <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{s.titulo}</p>
                  <span className="text-xs font-bold text-[#f6d353] whitespace-nowrap tabular-nums">
                    {fmtMoney(s.economiaMensal)}/mês
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{s.acao}</p>
                {s.horasEquivalentes > 0 && (
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1"><Clock className="h-3 w-3" /> equivale a {Number(s.horasEquivalentes).toFixed(1)}h de trabalho</p>
                )}
              </div>
            ))}
            <Badge className="bg-[#f6d353]/15 text-[#f6d353]">✦ gerado por IA</Badge>
          </div>
        )}
      </Card>
    </div>
  )
}

/** Relatório detalhado da semana (estilo do dashboard: radial + legenda + stats). */
function RelatorioSemanal({ resumo, semanaDonut }) {
  const emHoras = resumo.valorHora > 0 ? resumo.totalGasto / resumo.valorHora : null

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {resumo.periodo}</span>
        <Badge className="bg-[#f6d353]/15 text-[#f6d353]">✦ IA</Badge>
      </div>

      {/* radial por categoria da semana */}
      <GraficoCategoria dados={semanaDonut} labelTotal="Total da semana" />

      {/* estatísticas */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <Stat icon={Receipt} label="Total gasto" valor={fmtMoney(resumo.totalGasto)} destaque />
        <Stat icon={CalendarDays} label="Média por dia" valor={fmtMoney(resumo.mediaDiaria)} />
        <Stat icon={FileText} label="Lançamentos" valor={String(resumo.qtdTransacoes)} />
        <Stat icon={Clock} label="Em horas de trabalho" valor={emHoras ? `${emHoras.toFixed(1)}h` : '—'} />
      </div>

      {/* texto da IA */}
      <div className="rounded-xl bg-slate-800/50 border border-slate-800 p-3.5 mt-3">
        <p className="text-sm leading-relaxed text-slate-200">{resumo.texto}</p>
      </div>

      {/* comparativo por categoria */}
      {resumo.porCategoria.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Comparado à semana anterior</p>
          <ul className="space-y-1.5">
            {resumo.porCategoria.map((c, i) => {
              const d = c.deltaSemanaAnterior
              const subiu = d != null && d > 0
              const desceu = d != null && d < 0
              return (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: semanaDonut[i]?.cor || '#8f8f9e' }} />
                  <span className="flex-1 min-w-0 truncate text-slate-200">{c.categoria}</span>
                  {d != null && (
                    <span className={`text-[11px] font-semibold inline-flex items-center gap-0.5 ${subiu ? 'text-rose-400' : desceu ? 'text-green-400' : 'text-slate-500'}`}>
                      {subiu ? <TrendingUp className="h-3 w-3" /> : desceu ? <TrendingDown className="h-3 w-3" /> : null}
                      {subiu ? '+' : ''}{fmtMoney(d)}
                    </span>
                  )}
                  <span className="text-[11px] text-slate-500 w-9 text-right">{c.pct}%</span>
                  <span className="font-semibold tabular-nums w-[5.5rem] text-right">{fmtMoney(c.valor)}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* maior gasto */}
      {resumo.maiorGasto && (
        <div className="rounded-xl border border-[#f6d353]/25 bg-[#f6d353]/5 p-3.5 mt-3 flex items-center gap-3">
          <span className="h-9 w-9 rounded-full bg-[#f6d353]/15 grid place-items-center shrink-0 text-[#f6d353]">🏆</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-400">Maior gasto da semana</p>
            <p className="text-sm font-semibold truncate">{resumo.maiorGasto.desc}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold tabular-nums">{fmtMoney(resumo.maiorGasto.valor)}</p>
            {emHoras && resumo.valorHora > 0 && (
              <p className="text-[11px] text-slate-500">{(resumo.maiorGasto.valor / resumo.valorHora).toFixed(1)}h de trabalho</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ icon: Icon, label, valor, destaque }) {
  return (
    <div className={`rounded-xl p-3 border ${destaque ? 'border-[#f6d353]/30 bg-[#f6d353]/5' : 'border-slate-800 bg-slate-900/60'}`}>
      <p className="text-[11px] text-slate-400 flex items-center gap-1"><Icon className="h-3.5 w-3.5" /> {label}</p>
      <p className={`text-lg font-extrabold tabular-nums mt-0.5 ${destaque ? 'text-[#f6d353]' : ''}`}>{valor}</p>
    </div>
  )
}
