import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../db/schema.js'
import { Card, PageHeader, CardResumo } from '../components/ui.jsx'
import { GraficoCategoria } from '../components/GraficoCategoria.jsx'
import { gastoDoMes, mediaDiaria } from '../core/balance.js'
import { saldoConta, totalNosBancos } from '../core/accounts.js'
import { valorHora, horasPara } from '../core/hourlyRate.js'
import { calcularFatura } from '../core/invoice.js'
import { fmtMoney } from '../utils/money.js'
import { fmtMonthLabel, diasAte, fmtDateShort, monthKey, hoje } from '../utils/date.js'
import { Sparkles, CreditCard, Repeat, ArrowRight, Building2, Calculator, ChartPie } from 'lucide-react'

export default function Dashboard() {
  const profile = useLiveQuery(() => db.profile.get('me'), [])
  const txs = useLiveQuery(() => db.transactions.toArray(), []) ?? []
  const cats = useLiveQuery(() => db.categories.toArray(), []) ?? []
  const cards = useLiveQuery(() => db.cards.toArray(), []) ?? []
  const recs = useLiveQuery(() => db.recurrences.toArray(), []) ?? []
  const contas = useLiveQuery(() => db.accounts.toArray(), []) ?? []

  if (!profile) return null
  const mk = monthKey(hoje())
  const gasto = gastoDoMes(txs, mk)
  const vh = valorHora(profile)
  const emHoras = horasPara(gasto, profile)
  const catDe = new Map(cats.map((c) => [c.id, c]))

  const donut = [...gastosPorCategoriaMap(txs, mk).entries()]
    .map(([id, valor]) => ({
      nome: catDe.get(id)?.nome || 'Sem categoria',
      valor,
      cor: catDe.get(id)?.cor || '#94a3b8',
    }))

  const faturas = cards.map((c) => ({ card: c, f: calcularFatura(c, txs) }))
  const proximasRecs = recs
    .filter((r) => r.ativo && r.proximaData)
    .sort((a, b) => a.proximaData.localeCompare(b.proximaData))
    .slice(0, 4)

  return (
    <>
      <PageHeader title="Olá 👋" subtitle={fmtMonthLabel(mk)} />

      {/* Atalhos rápidos (mobile) */}
      <div className="flex gap-2 mb-3 overflow-x-auto md:hidden">
        {[{ to: '/bancos', label: 'Bancos', icon: Building2 }, { to: '/horas', label: 'Horas', icon: Calculator }, { to: '/recorrentes', label: 'Recorrentes', icon: Repeat }, { to: '/relatorios', label: 'Relatórios', icon: ChartPie }].map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <Icon className="h-3.5 w-3.5 text-emerald-500" /> {label}
          </Link>
        ))}
      </div>

      {contas.length > 0 ? (
        <Card className="p-4 mb-3">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-sm font-semibold flex items-center gap-1.5"><Building2 className="h-4 w-4 text-emerald-500" /> Nos seus bancos</p>
            <span className="text-xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">{fmtMoney(totalNosBancos(contas, txs))}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {contas.map((c) => (
              <Link key={c.id} to="/bancos" className="rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{c.nome}</span>
                <span className="text-sm font-semibold tabular-nums">{fmtMoney(saldoConta(c, txs))}</span>
              </Link>
            ))}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-3">
          <CardResumo titulo="Guardado" valor={profile.guardado} cor="text-emerald-600 dark:text-emerald-400" />
          <CardResumo titulo="Disponível" valor={profile.disponivel} cor="text-sky-600 dark:text-sky-400" />
        </div>
      )}

      <Card className="p-4 mb-3">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Gasto do mês</p>
            <p className="text-2xl font-extrabold tabular-nums">{fmtMoney(gasto)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400">Média/dia</p>
            <p className="text-sm font-semibold tabular-nums">{fmtMoney(mediaDiaria(txs, mk))}</p>
          </div>
        </div>
        {emHoras && (
          <p className="text-xs text-slate-400 mt-2">
            🕐 Equivale a <strong className="text-slate-600 dark:text-slate-300">{emHoras.horas.toFixed(1)}h</strong> do seu trabalho
            ({fmtMoney(vh)}/hora)
          </p>
        )}
      </Card>

      <Link to="/quickadd" state={{ quickAdd: true }}
        className="flex items-center gap-3 rounded-2xl p-4 mb-3 bg-emerald-600/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600/15 transition-colors">
        <Sparkles className="h-5 w-5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Registrar gasto por texto</p>
          <p className="text-xs opacity-80">“ifood 45,90” — funciona offline com regras locais</p>
        </div>
        <ArrowRight className="h-4 w-4" />
      </Link>

      <Card className="p-4 mb-3">
        <p className="text-sm font-semibold mb-2">Gastos por categoria</p>
        <GraficoCategoria dados={donut} />
      </Card>

      {faturas.length > 0 && (
        <Card className="p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold flex items-center gap-1.5"><CreditCard className="h-4 w-4" /> Faturas</p>
            <Link to="/cartoes" className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">ver todas</Link>
          </div>
          <ul className="space-y-2">
            {faturas.map(({ card, f }) => (
              <li key={card.id} className="flex items-center justify-between text-sm">
                <span>
                  {card.nome}
                  <span className="text-xs text-slate-400 ml-2">vence {fmtDateShort(f.vencimento)}</span>
                </span>
                <span className="font-semibold tabular-nums">{fmtMoney(f.aberta)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {proximasRecs.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold flex items-center gap-1.5"><Repeat className="h-4 w-4" /> Próximos lançamentos</p>
            <Link to="/recorrentes" className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">ver todas</Link>
          </div>
          <ul className="space-y-2">
            {proximasRecs.map((r) => {
              const dias = diasAte(r.proximaData)
              return (
                <li key={r.id} className="flex items-center justify-between text-sm">
                  <span>
                    {r.descricao}
                    <span className="text-xs text-slate-400 ml-2">
                      {dias <= 0 ? 'hoje' : `em ${dias} dia${dias > 1 ? 's' : ''}`}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">{fmtMoney(r.valor)}</span>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </>
  )
}

function gastosPorCategoriaMap(txs, mk) {
  const mapa = new Map()
  for (const t of txs) {
    if (t.tipo !== 'despesa' || t.contaPaga || monthKey(t.data) !== mk) continue
    const k = t.categoriaId || 'sem'
    mapa.set(k, (mapa.get(k) || 0) + (Number(t.valor) || 0))
  }
  return mapa
}
