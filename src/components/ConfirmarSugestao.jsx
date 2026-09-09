import { useState } from 'react'
import { Modal, Field, inputCls, Badge } from './ui.jsx'
import { fmtMoney } from '../utils/money.js'
import { hoje } from '../utils/date.js'
import { salvarTransacoes } from '../db/repo.js'
import { Sparkles, Check, X } from 'lucide-react'

const METODOS = ['dinheiro', 'pix', 'debito', 'credito']

/**
 * A IA NUNCA grava direto: propõe aqui e o usuário confirma.
 * itens: [{ descricao, valor, data, tipo, categoria, categoriaId, metodo, confianca }]
 */
export function ConfirmarSugestao({ open, onClose, itens = [], categorias, cartoes = [], contas = [], ambiguidade, onSalvo, textoOrigem }) {
  const [lista, setLista] = useState([])
  const [salvando, setSalvando] = useState(false)

  // Sincroniza quando abre com novas sugestões
  const chave = itens.map((i) => `${i.descricao}|${i.valor}|${i.data}`).join(';')
  const [lastKey, setLastKey] = useState('')
  if (open && chave !== lastKey) {
    setLista(itens.map((i) => ({ ...i, valorInput: i.valor == null ? '' : String(i.valor).replace('.', ','), confirmado: true })))
    setLastKey(chave)
  }

  const upd = (idx, patch) => setLista((l) => l.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  const contaPadrao = contas[0]?.id || ''

  async function salvarTodos() {
    setSalvando(true)
    try {
      const validos = lista
        .filter((i) => i.confirmado && i.descricao?.trim() && Number(i.valor) > 0)
        .map((i) => ({
          id: crypto.randomUUID(),
          data: i.data || hoje(),
          descricao: i.descricao.trim(),
          valor: Number(i.valor),
          tipo: i.tipo || 'despesa',
          categoriaId: i.categoriaId ?? null,
          metodo: i.metodo || 'pix',
          contaId: i.contaId ?? null,
          cardId: null,
          parcelaAtual: null,
          parcelasTotal: null,
          recurrenceId: null,
          origem: 'ia',
          iaConfianca: i.confianca ?? null,
          revisado: true,
          contaPaga: false,
        }))
      if (validos.length) await salvarTransacoes(validos)
      onSalvo?.(validos.length)
      onClose()
    } finally {
      setSalvando(false)
    }
  }

  const pendentes = lista.filter((i) => i.confirmado && Number(i.valor) > 0).length

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirmar sugestão da IA"
      footer={
        <div className="flex gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium border border-slate-300 dark:border-slate-700">Descartar</button>
          <button onClick={salvarTodos} disabled={salvando || !pendentes}
            className="flex-1 rounded-xl px-4 py-2 text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 inline-flex items-center justify-center gap-1.5">
            <Check className="h-4 w-4" /> Salvar {pendentes > 0 ? `${pendentes} lançamento${pendentes > 1 ? 's' : ''}` : ''}
          </button>
        </div>
      }
    >
      {textoOrigem && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex items-start gap-1">
          <Sparkles className="h-3.5 w-3.5 mt-0.5 text-emerald-500 shrink-0" />
          Você escreveu: “{textoOrigem}”
        </p>
      )}
      {ambiguidade && (
        <p className="text-xs rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 px-3 py-2 mb-3">
          ⚠ {ambiguidade}
        </p>
      )}

      <div className="space-y-4">
        {lista.map((item, idx) => <ItemCard key={idx} item={item} idx={idx} upd={upd} categorias={categorias} contas={contas} />)}
        {!lista.length && <p className="text-sm text-slate-500 text-center py-6">Nenhuma transação identificada.</p>}
      </div>
    </Modal>
  )
}

function ItemCard({ item, idx, upd, categorias, contas = [] }) {
  const baixaConfianca = (item.confianca ?? 1) < 0.7
  const semValor = item.valorInput === '' || Number(item.valor) <= 0
  const alerta = baixaConfianca || semValor

  return (
    <div className={`rounded-2xl border p-3 ${alerta ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10' : 'border-slate-200 dark:border-slate-800'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {item.tipo === 'receita'
            ? <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">Receita</Badge>
            : <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300">Despesa</Badge>}
          {item.origemNivel === 'regra-local' && <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300">regra local</Badge>}
          {item.origemNivel === 'historico' && <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300">seu histórico</Badge>}
          {item.origemNivel === 'ia' && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">IA {(item.confianca * 100).toFixed(0)}%</Badge>}
        </div>
        <button onClick={() => upd(idx, { confirmado: !item.confirmado })}
          className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${item.confirmado ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}
          aria-label="Incluir no lançamento">
          {item.confirmado && <Check className="h-3.5 w-3.5" />}
        </button>
      </div>

      {baixaConfianca && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400 mb-2">Confiança baixa — revise os campos abaixo.</p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <input className={inputCls} value={item.descricao} onChange={(e) => upd(idx, { descricao: e.target.value })} placeholder="Descrição" />
        </div>
        <input inputMode="decimal" className={`${inputCls} ${semValor ? 'ring-2 ring-amber-400' : ''} font-semibold`} value={item.valorInput}
          onChange={(e) => upd(idx, { valorInput: e.target.value, valor: Number(e.target.value.replace(',', '.')) || 0 })} placeholder="R$" />
        <input type="date" className={inputCls} value={item.data} onChange={(e) => upd(idx, { data: e.target.value })} />
        <select className={inputCls} value={item.categoriaId ?? ''} onChange={(e) => upd(idx, { categoriaId: e.target.value || null })}>
          <option value="">Sem categoria</option>
          {[...categorias].sort((a, b) => a.nome.localeCompare(b.nome)).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select className={inputCls} value={item.metodo} onChange={(e) => upd(idx, { metodo: e.target.value })}>
          {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        {item.metodo !== 'credito' && contas.length > 0 && (
          <select className={`${inputCls} col-span-2`} value={item.contaId ?? ''} onChange={(e) => upd(idx, { contaId: e.target.value || null })}>
            <option value="">Sem banco</option>
            {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}
      </div>
    </div>
  )
}
