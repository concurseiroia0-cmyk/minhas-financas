import { useState } from 'react'
import { Modal, Field, inputCls } from './ui.jsx'
import { fmtMoney, parseMoney } from '../utils/money.js'
import { hoje } from '../utils/date.js'
import { salvarTransacao, salvarTransacoes, excluirTransacao } from '../db/repo.js'
import { gerarParcelas } from '../core/recurrence.js'

const METODOS = ['dinheiro', 'pix', 'debito', 'credito']
const TIPOS = [
  { v: 'despesa', label: 'Despesa', cls: 'bg-rose-500' },
  { v: 'receita', label: 'Receita', cls: 'bg-emerald-500' },
  { v: 'transferencia', label: 'Transferência', cls: 'bg-slate-500' },
]

export function TransacaoForm({ open, onClose, transacao, categorias, cartoes, contas = [], onSalvo }) {
  const [form, setForm] = useState(inicial(transacao))
  const [erro, setErro] = useState(null)

  function inicial(t) {
    return {
      id: t?.id ?? null,
      data: t?.data ?? hoje(),
      descricao: t?.descricao ?? '',
      valorInput: t ? String(t.valor).replace('.', ',') : '',
      tipo: t?.tipo ?? 'despesa',
      categoriaId: t?.categoriaId ?? null,
      metodo: t?.metodo ?? 'pix',
      cardId: t?.cardId ?? null,
      contaId: t?.contaId ?? null,
      parcelas: 1,
    }
  }
  // Reinicia quando abre com outra transação
  const [lastKey, setLastKey] = useState(null)
  if (open && lastKey !== (transacao?.id || 'nova')) {
    setForm(inicial(transacao))
    setLastKey(transacao?.id || 'nova')
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const valor = parseMoney(form.valorInput)

  async function salvar() {
    if (!form.descricao.trim()) return setErro('Informe uma descrição')
    if (!valor) return setErro('Informe um valor válido')
    setErro(null)

    const base = {
      id: form.id,
      data: form.data,
      descricao: form.descricao.trim(),
      valor,
      tipo: form.tipo,
      categoriaId: form.categoriaId,
      metodo: form.tipo === 'transferencia' ? 'debito' : form.metodo,
      cardId: form.metodo === 'credito' ? form.cardId : null,
      contaId: form.metodo === 'credito' ? null : form.contaId,
      parcelaAtual: null,
      parcelasTotal: null,
      recurrenceId: transacao?.recurrenceId ?? null,
      origem: transacao?.origem ?? 'manual',
      iaConfianca: transacao?.iaConfianca ?? null,
      revisado: true,
      contaPaga: transacao?.contaPaga ?? false,
    }

    try {
      if (!form.id && form.tipo === 'despesa' && form.metodo === 'credito' && form.parcelas > 1) {
        const itens = gerarParcelas({ descricao: base.descricao, valorTotal: valor, parcelas: form.parcelas, dataCompra: form.data, categoriaId: base.categoriaId, metodo: 'credito', cardId: base.cardId })
        await salvarTransacoes(itens)
      } else {
        await salvarTransacao(base)
      }
      onSalvo?.()
      onClose()
    } catch (e) {
      setErro('Erro ao salvar: ' + e.message)
    }
  }

  const cats = [...categorias].sort((a, b) => a.nome.localeCompare(b.nome))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={form.id ? 'Editar lançamento' : 'Novo lançamento'}
      footer={
        <div className="flex gap-2">
          {form.id && (
            <button
              onClick={async () => { await excluirTransacao(form.id); onSalvo?.(); onClose() }}
              className="rounded-xl px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
            >
              Excluir
              </button>
          )}
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium border border-slate-300 dark:border-slate-700">Cancelar</button>
          <button onClick={salvar} className="flex-1 rounded-xl px-4 py-2 text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500">Salvar</button>
        </div>
      }
    >
      {/* Tipo */}
      <div className="grid grid-cols-3 gap-1.5 mb-4">
        {TIPOS.map((t) => (
          <button key={t.v} onClick={() => set('tipo', t.v)}
            className={`rounded-xl py-2 text-xs font-semibold transition-colors ${form.tipo === t.v ? `${t.cls} text-white` : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Valor */}
      <div className="mb-3">
        <input
          autoFocus
          inputMode="decimal"
          placeholder="R$ 0,00"
          value={form.valorInput}
          onChange={(e) => set('valorInput', e.target.value)}
          className={`${inputCls} text-2xl font-bold text-center`}
        />
      </div>

      <Field label="Descrição">
        <input className={inputCls} value={form.descricao} onChange={(e) => set('descricao', e.target.value)} placeholder="Ex.: Mercado, Uber..." />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Data">
          <input type="date" className={inputCls} value={form.data} onChange={(e) => set('data', e.target.value)} />
        </Field>
        <Field label="Método">
          <select className={inputCls} value={form.metodo} onChange={(e) => set('metodo', e.target.value)} disabled={form.tipo === 'transferencia'}>
            {METODOS.map((m) => <option key={m} value={m}>{m[0].toUpperCase() + m.slice(1)}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Categoria">
        <select className={inputCls} value={form.categoriaId ?? ''} onChange={(e) => set('categoriaId', e.target.value || null)}>
          <option value="">Sem categoria</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </Field>

      {form.tipo !== 'transferencia' && form.metodo !== 'credito' && (
        <Field label="Banco/Conta" hint="De onde saiu o dinheiro (ou onde entrou, se receita).">
          <select className={inputCls} value={form.contaId ?? ''} onChange={(e) => set('contaId', e.target.value || null)}>
            <option value="">Sem banco</option>
            {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Field>
      )}

      {form.metodo === 'credito' && !form.id && (
        <>
          <Field label="Cartão">
            <select className={inputCls} value={form.cardId ?? ''} onChange={(e) => set('cardId', e.target.value || null)}>
              <option value="">Nenhum cartão</option>
              {cartoes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Field>
          <Field label="Parcelas" hint="Acima de 1, gera um lançamento por mês com o valor dividido.">
            <input type="number" min={1} max={24} className={inputCls} value={form.parcelas} onChange={(e) => set('parcelas', Math.max(1, Number(e.target.value) || 1))} />
          </Field>
        </>
      )}

      {erro && <p className="text-sm text-rose-600 mb-2">{erro}</p>}
    </Modal>
  )
}
