import { fmtMoney } from '../utils/money.js'
import { fmtLabel, fmtWeekday } from '../utils/date.js'
import { Badge } from './ui.jsx'
import { Pencil, Trash2 } from 'lucide-react'

const METODO_ICON = { dinheiro: '💵', pix: '⚡', debito: '💳', credito: '🏷️' }

export function ListaTransacoes({ transacoes, categorias = [], onEdit, onDelete, agrupar = true }) {
  const catNome = new Map(categorias.map((c) => [c.id, c]))
  const corDe = (id) => catNome.get(id)?.cor || '#8f8f9e'
  const nomeDe = (id) => catNome.get(id)?.nome || 'Outros'

  if (!agrupar) {
    return <div className="space-y-2">{transacoes.map((t) => <Linha key={t.id} t={t} nomeDe={nomeDe} corDe={corDe} onEdit={onEdit} onDelete={onDelete} />)}</div>
  }

  // Agrupa por dia
  const grupos = new Map()
  for (const t of transacoes) {
    if (!grupos.has(t.data)) grupos.set(t.data, [])
    grupos.get(t.data).push(t)
  }
  const dias = [...grupos.entries()].sort((a, b) => b[0].localeCompare(a[0]))

  return (
    <div className="space-y-5">
      {dias.map(([data, itens]) => {
        const liquido = itens.reduce((a, t) => a + (t.tipo === 'receita' ? t.valor : -t.valor), 0)
        return (
          <div key={data}>
            <div className="flex items-baseline justify-between px-1 mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-[0.14em]">
                {fmtLabel(data)} <span className="font-normal normal-case">· {fmtWeekday(data)}</span>
              </span>
              <span className={`text-xs font-bold tabular-nums ${liquido >= 0 ? 'text-[#f6d353]' : 'text-slate-400'}`}>
                {liquido >= 0 ? '+' : '−'}{fmtMoney(Math.abs(liquido))}
              </span>
            </div>
            <div className="space-y-2">
              {itens.sort((a, b) => b.criadoEm - a.criadoEm).map((t) => (
                <Linha key={t.id} t={t} nomeDe={nomeDe} corDe={corDe} onEdit={onEdit} onDelete={onDelete} />
              ))}
            </div>
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
  const cor = transferencia ? '#8f8f9e' : corDe(t.categoriaId)

  return (
    <div className="group flex items-center gap-3 rounded-2xl bg-slate-900 border border-slate-800 pl-2.5 pr-2 py-2 hover:border-slate-700 transition-colors">
      {/* Avatar da categoria */}
      <span
        className="h-9 w-9 rounded-full grid place-items-center text-[15px] shrink-0"
        style={{ background: `${cor}26`, color: cor }}
      >
        {transferencia ? '⇄' : METODO_ICON[t.metodo] || cat.charAt(0).toUpperCase()}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold truncate">{t.descricao}</p>
          {t.parcelasTotal && <Badge className="bg-slate-800 text-slate-300">{t.parcelaAtual}/{t.parcelasTotal}</Badge>}
          {t.origem === 'ia' && <Badge className={t.revisado ? 'bg-[#f6d353]/15 text-[#f6d353]' : 'bg-amber-400/15 text-amber-300'}>IA{t.revisado ? ' ✓' : ' ?'}</Badge>}
          {t.origem === 'regra' && <Badge className="bg-violet-500/15 text-violet-300">auto</Badge>}
        </div>
        <p className="text-xs text-slate-500 truncate">
          {cat}{t.contaPaga ? ' · pago' : ''}
        </p>
      </div>

      <span className={`text-sm font-bold tabular-nums shrink-0 ${receita ? 'text-[#f6d353]' : transferencia ? 'text-slate-400' : 'text-slate-100'}`}>
        {receita ? '+' : transferencia ? '⇄' : '−'}{fmtMoney(t.valor)}
      </span>

      {(onEdit || onDelete) && (
        <div className="flex shrink-0 gap-0.5">
          {onEdit && <button onClick={() => onEdit(t)} className="p-1.5 rounded-lg text-slate-500 hover:text-[#f6d353] hover:bg-slate-800" aria-label="Editar"><Pencil className="h-4 w-4" /></button>}
          {onDelete && <button onClick={() => onDelete(t)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800" aria-label="Excluir"><Trash2 className="h-4 w-4" /></button>}
        </div>
      )}
    </div>
  )
}
