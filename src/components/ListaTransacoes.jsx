import { fmtMoney } from '../utils/money.js'
import { fmtLabel, fmtWeekday } from '../utils/date.js'
import { Card, Badge } from './ui.jsx'
import { Pencil, Trash2 } from 'lucide-react'

const METODO_ICON = { dinheiro: '💵', pix: '⚡', debito: '💳', credito: '🏷️' }

export function ListaTransacoes({ transacoes, categorias = [], onEdit, onDelete, agrupar = true }) {
  const catNome = new Map(categorias.map((c) => [c.id, c]))
  const corDe = (id) => catNome.get(id)?.cor || '#94a3b8'
  const nomeDe = (id) => catNome.get(id)?.nome || 'Sem categoria'

  if (!agrupar) {
    return <ul className="divide-y divide-slate-200 dark:divide-slate-800">{transacoes.map((t) => <Linha key={t.id} t={t} nomeDe={nomeDe} corDe={corDe} onEdit={onEdit} onDelete={onDelete} />)}</ul>
  }

  // Agrupa por dia
  const grupos = new Map()
  for (const t of transacoes) {
    if (!grupos.has(t.data)) grupos.set(t.data, [])
    grupos.get(t.data).push(t)
  }
  const dias = [...grupos.entries()].sort((a, b) => b[0].localeCompare(a[0]))

  return (
    <div className="space-y-4">
      {dias.map(([data, itens]) => {
        const liquido = itens.reduce((a, t) => a + (t.tipo === 'receita' ? t.valor : -t.valor), 0)
        return (
          <div key={data}>
            <div className="flex items-baseline justify-between px-1 mb-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {fmtLabel(data)} <span className="font-normal">· {fmtWeekday(data)}</span>
              </span>
              <span className={`text-xs font-semibold ${liquido >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {liquido >= 0 ? '+' : ''}{fmtMoney(liquido)}
              </span>
            </div>
            <Card className="divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden">
              {itens.sort((a, b) => b.criadoEm - a.criadoEm).map((t) => (
                <Linha key={t.id} t={t} nomeDe={nomeDe} corDe={corDe} onEdit={onEdit} onDelete={onDelete} />
              ))}
            </Card>
          </div>
        )
      })}
    </div>
  )
}

function Linha({ t, nomeDe, corDe, onEdit, onDelete }) {
  const receita = t.tipo === 'receita'
  const transferencia = t.tipo === 'transferencia'
  const cat = nomeDe(t.categoriaId)
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span className="h-8 w-1.5 rounded-full shrink-0" style={{ background: transferencia ? '#64748b' : corDe(t.categoriaId) }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate">{t.descricao}</p>
          {t.parcelasTotal && <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{t.parcelaAtual}/{t.parcelasTotal}</Badge>}
          {t.origem === 'ia' && <Badge className={t.revisado ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'}>IA{t.revisado ? ' ✓' : ' ?'}</Badge>}
          {t.origem === 'regra' && <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300">auto</Badge>}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {METODO_ICON[t.metodo] || ''} {cat}{t.contaPaga ? ' · pago' : ''}
        </p>
      </div>
      <span className={`text-sm font-semibold tabular-nums shrink-0 ${receita ? 'text-emerald-600 dark:text-emerald-400' : transferencia ? 'text-slate-500' : ''}`}>
        {receita ? '+' : transferencia ? '⇄ ' : '−'}{fmtMoney(t.valor)}
      </span>
      {(onEdit || onDelete) && (
        <div className="flex shrink-0 gap-0.5">
          {onEdit && <button onClick={() => onEdit(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30" aria-label="Editar"><Pencil className="h-4 w-4" /></button>}
          {onDelete && <button onClick={() => onDelete(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30" aria-label="Excluir"><Trash2 className="h-4 w-4" /></button>}
        </div>
      )}
    </div>
  )
}
