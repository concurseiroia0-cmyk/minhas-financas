import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../db/schema.js'
import { Card, CardResumo } from '../components/ui.jsx'
import { GraficoCategoria } from '../components/GraficoCategoria.jsx'
import { Calendario } from '../components/Calendario.jsx'
import { gastoDoMes, mediaDiaria } from '../core/balance.js'
import { saldoConta, totalNosBancos } from '../core/accounts.js'
import { valorHora, horasPara } from '../core/hourlyRate.js'
import { calcularFatura } from '../core/invoice.js'
import { estadoPermissao, pedirPermissao, verificarVencimentos } from '../core/notifications.js'
import { fmtMoney } from '../utils/money.js'
import { fmtMonthLabel, diasAte, fmtDateShort, monthKey, hoje } from '../utils/date.js'
import { CreditCard, Repeat, ArrowUpRight, Building2, Plus, ArrowLeftRight, Bell } from 'lucide-react'

export default function Dashboard() {
  const profile = useLiveQuery(() => db.profile.get('me'), [])
  const txs = useLiveQuery(() => db.transactions.toArray(), []) ?? []
  const cats = useLiveQuery(() => db.categories.toArray(), []) ?? []
  const cards = useLiveQuery(() => db.cards.toArray(), []) ?? []
  const recs = useLiveQuery(() => db.recurrences.toArray(), []) ?? []
  const contas = useLiveQuery(() => db.accounts.toArray(), []) ?? []

  const [permissao, setPermissao] = useState(estadoPermissao())

  // Mapa dia → gasto, para os pontinhos do calendário
  const porDia = useMemo(() => {
    const m = new Map()
    for (const t of txs) {
      if (t.tipo !== 'despesa' || t.contaPaga) continue
      const cur = m.get(t.data) || { total: 0, qtd: 0 }
      cur.total += Number(t.valor) || 0
      cur.qtd += 1
      m.set(t.data, cur)
    }
    return m
  }, [txs])

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
      cor: catDe.get(id)?.cor || '#8f8f9e',
    }))

  const faturas = cards.map((c) => ({ card: c, f: calcularFatura(c, txs) }))
  const proximasRecs = recs
    .filter((r) => r.ativo && r.proximaData)
    .sort((a, b) => a.proximaData.localeCompare(b.proximaData))
    .slice(0, 4)

  const totalBancos = totalNosBancos(contas, txs)

  async function ativarNotificacoes() {
    const r = await pedirPermissao()
    setPermissao(r)
    if (r === 'granted') verificarVencimentos({ forcar: true })
  }

  return (
    <div className="-mt-2">
      {/* ── Hero violeta (foto 1) ─────────────────────────────── */}
      <div className="hero-violeta rounded-b-[2rem] -mx-4 px-4 pt-6 pb-16">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs text-violet-200/80">Disponível nos bancos</p>
          <p className="text-[2.6rem] leading-tight font-extrabold tracking-tight tabular-nums">
            {fmtMoney(totalBancos || profile.guardado)}
          </p>
          <p className="text-xs text-violet-200/80 mt-1">
            Gasto em {fmtMonthLabel(mk)}: <strong className="text-white">{fmtMoney(gasto)}</strong>
            {emHoras && <> · 🕐 {emHoras.horas.toFixed(1)}h de trabalho</>}
          </p>
        </div>
      </div>

      {/* Card de ações sobreposto ao hero */}
      <div className="-mt-11 max-w-3xl mx-auto">
        <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl shadow-black/40 p-3 flex justify-around">
          {[
            { to: '/quickadd', state: { quickAdd: true }, label: 'Registrar', icon: Plus, destaque: true },
            { to: '/bancos', label: 'Bancos', icon: Building2 },
            { to: '/cartoes', label: 'Faturas', icon: CreditCard },
            { to: '/lancamentos', label: 'Extrato', icon: ArrowLeftRight },
          ].map(({ to, state, label, icon: Icon, destaque }) => (
            <Link key={to} to={to} state={state} className="flex flex-col items-center gap-1.5 px-2 py-1">
              <span className={`h-10 w-10 rounded-2xl grid place-items-center ${destaque ? 'bg-[#f6d353] text-slate-950' : 'bg-slate-800 text-[#f6d353]'}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-medium text-slate-300">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {/* ── Bancos ──────────────────────────────────────────── */}
        {contas.length > 0 ? (
          <section>
            <div className="flex items-baseline justify-between px-1 mb-2">
              <h2 className="text-sm font-bold">Nos seus bancos</h2>
              <Link to="/bancos" className="text-xs text-[#f6d353] font-semibold inline-flex items-center">gerenciar <ArrowUpRight className="h-3.5 w-3.5" /></Link>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {contas.map((c) => (
                <Link key={c.id} to="/bancos" className="rounded-2xl bg-slate-900 border border-slate-800 px-4 py-3 flex flex-col gap-0.5 hover:border-[#f6d353]/40 transition-colors">
                  <span className="text-xs text-slate-400 truncate">{c.nome}</span>
                  <span className="text-lg font-bold tabular-nums">{fmtMoney(saldoConta(c, txs))}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <CardResumo titulo="Guardado" valor={profile.guardado} cor="text-[#f6d353]" />
            <CardResumo titulo="Disponível" valor={profile.disponivel} />
          </div>
        )}

        {/* ── Calendário ──────────────────────────────────────── */}
        <Card className="p-4">
          <Calendario transacoesPorDia={porDia} />
        </Card>

        {/* ── Notificações (pedido de permissão) ─────────────── */}
        {permissao === 'default' && (
          <button onClick={ativarNotificacoes} className="w-full text-left rounded-2xl bg-slate-900 border border-[#f6d353]/30 p-4 flex items-center gap-3 hover:border-[#f6d353]/60 transition-colors">
            <span className="h-10 w-10 rounded-full bg-[#f6d353]/15 grid place-items-center shrink-0">
              <Bell className="h-5 w-5 text-[#f6d353]" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold">Avisar quando a fatura vencer</span>
              <span className="block text-xs text-slate-400 mt-0.5">Toque para permitir notificações no seu celular — funciona mesmo com o app fechado.</span>
            </span>
            <ArrowUpRight className="h-4 w-4 text-[#f6d353] shrink-0" />
          </button>
        )}

        {/* ── Média/dia ───────────────────────────────────────── */}
        <Card className="p-4">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs text-slate-400">Média por dia</p>
              <p className="text-xl font-extrabold tabular-nums">{fmtMoney(mediaDiaria(txs, mk))}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Valor da hora</p>
              <p className="text-xl font-extrabold tabular-nums text-[#f6d353]">{fmtMoney(vh)}</p>
            </div>
          </div>
        </Card>

        {/* ── Gastos por categoria (radial glow) ──────────────── */}
        <Card className="p-4">
          <p className="text-sm font-bold mb-2">Gastos por categoria</p>
          <GraficoCategoria dados={donut} />
        </Card>

        {/* ── Faturas ─────────────────────────────────────────── */}
        {faturas.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold flex items-center gap-1.5"><CreditCard className="h-4 w-4 text-[#f6d353]" /> Faturas</p>
              <Link to="/cartoes" className="text-xs text-[#f6d353] font-semibold">ver todas</Link>
            </div>
            <ul className="space-y-2">
              {faturas.map(({ card, f }) => (
                <li key={card.id} className="flex items-center justify-between text-sm">
                  <span>
                    {card.nome}
                    <span className="text-xs text-slate-500 ml-2">vence {fmtDateShort(f.vencimento)}</span>
                  </span>
                  <span className="font-bold tabular-nums">{fmtMoney(f.aberta)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* ── Próximos lançamentos ────────────────────────────── */}
        {proximasRecs.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold flex items-center gap-1.5"><Repeat className="h-4 w-4 text-violet-400" /> Próximos lançamentos</p>
              <Link to="/recorrentes" className="text-xs text-[#f6d353] font-semibold">ver todas</Link>
            </div>
            <ul className="space-y-2">
              {proximasRecs.map((r) => {
                const dias = diasAte(r.proximaData)
                return (
                  <li key={r.id} className="flex items-center justify-between text-sm">
                    <span>
                      {r.descricao}
                      <span className="text-xs text-slate-500 ml-2">
                        {dias <= 0 ? 'hoje' : `em ${dias} dia${dias > 1 ? 's' : ''}`}
                      </span>
                    </span>
                    <span className="font-bold tabular-nums">{fmtMoney(r.valor)}</span>
                  </li>
                )
              })}
            </ul>
          </Card>
        )}
      </div>
    </div>
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
