import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema.js'
import { salvarCartao, salvarTransacao, salvarTransacoes } from '../db/repo.js'
import { calcularFatura, pagarFatura } from '../core/invoice.js'
import { Modal, Field, inputCls, Card, PageHeader, EmptyState, ConfirmDialog, Badge } from '../components/ui.jsx'
import { fmtMoney, parseMoney } from '../utils/money.js'
import { fmtDate, diasAte } from '../utils/date.js'
import { CreditCard, Plus, ListOrdered } from 'lucide-react'
import { ListaTransacoes } from '../components/ListaTransacoes.jsx'

export default function Cartoes() {
  const cards = useLiveQuery(() => db.cards.toArray(), []) ?? []
  const txs = useLiveQuery(() => db.transactions.toArray(), []) ?? []
  const cats = useLiveQuery(() => db.categories.toArray(), []) ?? []
  const contas = useLiveQuery(() => db.accounts.toArray(), []) ?? []

  const [cadastroAberto, setCadastroAberto] = useState(false)
  const [compraAberta, setCompraAberta] = useState(null) // card
  const [pagamentoAberto, setPagamentoAberto] = useState(null) // { card, f }
  const [faturaAberta, setFaturaAberta] = useState(null) // { card, f }
  const [paraExcluir, setParaExcluir] = useState(null)

  return (
    <div>
      <PageHeader title="Cartões" subtitle="Compra no crédito é despesa; pagamento de fatura é transferência">
        <button onClick={() => setCadastroAberto(true)} className="rounded-xl px-3.5 py-2 text-sm font-semibold bg-[#f6d353] text-slate-950 hover:bg-[#f2c62e] inline-flex items-center gap-1"><Plus className="h-4 w-4" /> Cartão</button>
      </PageHeader>

      {cards.length === 0 && (
        <EmptyState icon={CreditCard} titulo="Nenhum cartão" sub="Cadastre um cartão para acompanhar faturas e limite." />
      )}

      <div className="space-y-3">
        {cards.map((card) => {
          const f = calcularFatura(card, txs)
          const usoPct = card.limite > 0 ? Math.min(100, Math.round(((f.aberta + f.futuras) / card.limite) * 100)) : 0
          const diasVenc = diasAte(f.vencimento)
          return (
            <Card key={card.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold">{card.nome}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Fecha dia {card.diaFechamento} · vence dia {card.diaVencimento}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setFaturaAberta({ card, f })} className="text-xs rounded-lg px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1">
                    <ListOrdered className="h-3.5 w-3.5" /> Fatura
                  </button>
                  <button onClick={() => setParaExcluir(card)} className="text-xs rounded-lg px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30">Excluir</button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Fatura aberta</p>
                  <p className="font-bold tabular-nums text-rose-600 dark:text-rose-400">{fmtMoney(f.aberta)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Parcelas futuras</p>
                  <p className="font-bold tabular-nums">{fmtMoney(f.futuras)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Vencimento</p>
                  <p className={`font-bold ${diasVenc <= 5 ? 'text-amber-600 dark:text-amber-400' : ''}`}>{fmtDate(f.vencimento).slice(0, 6)}</p>
                </div>
              </div>

              {card.limite > 0 && (
                <div className="mb-3">
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className={`h-full rounded-full ${usoPct > 80 ? 'bg-rose-500' : usoPct > 50 ? 'bg-amber-500' : 'bg-[#f6d353]'}`} style={{ width: `${usoPct}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{usoPct}% do limite usado · disponível {fmtMoney(f.disponivel)}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setPagamentoAberto({ card, f })} disabled={f.aberta <= 0}
                  className="flex-1 rounded-xl py-2 text-sm font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 disabled:opacity-30">
                  Pagar fatura
                </button>
                <button onClick={() => setCompraAberta(card)}
                  className="flex-1 rounded-xl py-2 text-sm font-semibold border border-[#f6d353]/40 text-[#f6d353] hover:bg-[#f2c62e]/10">
                  Comprar
                </button>
              </div>
            </Card>
          )
        })}
      </div>

      <CadastroCartao open={cadastroAberto} onClose={() => setCadastroAberto(false)} cartao={null} contas={contas} />
      <CompraCredito open={!!compraAberta} onClose={() => setCompraAberta(null)} card={compraAberta} categorias={cats} />
      <PagamentoFatura open={!!pagamentoAberto} onClose={() => setPagamentoAberto(null)} dados={pagamentoAberto} contas={contas} />
      <FaturaDetalhe open={!!faturaAberta} onClose={() => setFaturaAberta(null)} dados={faturaAberta} categorias={cats} />

      <ConfirmDialog open={!!paraExcluir} onClose={() => setParaExcluir(null)} onConfirm={() => paraExcluir && db.cards.delete(paraExcluir.id)}
        titulo="Excluir cartão" mensagem={`Excluir "${paraExcluir?.nome}"? As compras lançadas nele continuam existindo.`} />
    </div>
  )
}

function CadastroCartao({ open, onClose, cartao, contas = [] }) {
  const [form, setForm] = useState({ nome: '', limite: '', diaFechamento: 5, diaVencimento: 12, contaId: '' })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  return (
    <Modal open={open} onClose={onClose} title="Novo cartão"
      footer={<button onClick={async () => { if (!form.nome.trim()) return; await salvarCartao({ nome: form.nome.trim(), limite: parseMoney(form.limite), diaFechamento: Number(form.diaFechamento) || 1, diaVencimento: Number(form.diaVencimento) || 1, contaId: form.contaId || null }); onClose() }}
        className="w-full rounded-xl py-2.5 text-sm font-semibold bg-[#f6d353] text-slate-950 hover:bg-[#f2c62e]">Salvar</button>}>
      <Field label="Nome"><input className={inputCls} value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Ex.: Nubank" autoFocus /></Field>
      {contas.length > 0 && (
        <Field label="Vincular ao banco" hint="A fatura aparece na página do banco vinculado.">
          <select className={inputCls} value={form.contaId} onChange={(e) => set('contaId', e.target.value)}>
            <option value="">Sem vínculo</option>
            {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Field>
      )}
      <Field label="Limite (R$)"><input className={inputCls} inputMode="decimal" value={form.limite} onChange={(e) => set('limite', e.target.value)} placeholder="3000" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Dia fechamento"><input type="number" min={1} max={28} className={inputCls} value={form.diaFechamento} onChange={(e) => set('diaFechamento', e.target.value)} /></Field>
        <Field label="Dia vencimento"><input type="number" min={1} max={28} className={inputCls} value={form.diaVencimento} onChange={(e) => set('diaVencimento', e.target.value)} /></Field>
      </div>
    </Modal>
  )
}

function CompraCredito({ open, onClose, card, categorias }) {
  const [form, setForm] = useState({ descricao: '', valor: '', parcelas: 1, categoriaId: '' })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const [erro, setErro] = useState(null)

  async function salvar() {
    const valor = parseMoney(form.valor)
    if (!form.descricao.trim() || !valor) { setErro('Preencha descrição e valor'); return }
    const { gerarParcelas } = await import('../core/recurrence.js')
    const itens = gerarParcelas({ descricao: form.descricao.trim(), valorTotal: valor, parcelas: Number(form.parcelas) || 1, dataCompra: new Date().toISOString().slice(0, 10), categoriaId: form.categoriaId || null, metodo: 'credito', cardId: card.id })
    await salvarTransacoes(itens)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={`Compra no ${card?.nome ?? 'cartão'}`}
      footer={<button onClick={salvar} className="w-full rounded-xl py-2.5 text-sm font-semibold bg-[#f6d353] text-slate-950 hover:bg-[#f2c62e]">Lançar compra</button>}>
      <Field label="Descrição"><input className={inputCls} value={form.descricao} onChange={(e) => set('descricao', e.target.value)} placeholder="Ex.: Notebook" autoFocus /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor total (R$)"><input className={inputCls} inputMode="decimal" value={form.valor} onChange={(e) => set('valor', e.target.value)} placeholder="500" /></Field>
        <Field label="Parcelas"><input type="number" min={1} max={24} className={inputCls} value={form.parcelas} onChange={(e) => set('parcelas', e.target.value)} /></Field>
      </div>
      <Field label="Categoria">
        <select className={inputCls} value={form.categoriaId} onChange={(e) => set('categoriaId', e.target.value)}>
          <option value="">Sem categoria</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </Field>
      {Number(form.parcelas) > 1 && (
        <p className="text-xs text-slate-400">Gera {form.parcelas} lançamentos de ~{fmtMoney(parseMoney(form.valor) / (Number(form.parcelas) || 1))} nos próximos meses.</p>
      )}
      {erro && <p className="text-sm text-rose-600">{erro}</p>}
    </Modal>
  )
}

function PagamentoFatura({ open, onClose, dados, contas }) {
  const [contaId, setContaId] = useState('')
  const [valor, setValor] = useState('')
  const card = dados?.card
  const f = dados?.f

  async function pagar() {
    const txsAtuais = await db.transactions.toArray()
    const cicloAtual = calcularFatura(card, txsAtuais)
    const v = parseMoney(valor) || cicloAtual.aberta
    const { transferencia } = pagarFatura({ card, valor: v, contaOrigemId: contaId || null, transacoes: txsAtuais })
    if (transferencia) await salvarTransacao(transferencia)
    // quitação total marca as compras como pagas (a transferência NÃO é despesa nova)
    if (v >= cicloAtual.aberta - 0.005) {
      await Promise.all(cicloAtual.compras.map((t) => db.transactions.update(t.id, { contaPaga: true })))
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Pagar fatura"
      footer={<button onClick={pagar} className="w-full rounded-xl py-2.5 text-sm font-semibold bg-[#f6d353] text-slate-950 hover:bg-[#f2c62e]">Confirmar pagamento</button>}>
      {f && (
        <>
          <p className="text-sm mb-3">
            Fatura aberta: <strong className="tabular-nums">{fmtMoney(f.aberta)}</strong>
          </p>
          <Field label="Valor a pagar (vazio = total)"><input className={inputCls} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder={String(f.aberta).replace('.', ',')} /></Field>
          <Field label="Conta de origem" hint="O pagamento é uma transferência — não gera despesa nova.">
            <select className={inputCls} value={contaId} onChange={(e) => setContaId(e.target.value)}>
              <option value="">Nenhuma</option>
              {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Field>
        </>
      )}
    </Modal>
  )
}

function FaturaDetalhe({ open, onClose, dados, categorias }) {
  if (!dados) return null
  const { card, f } = dados
  return (
    <Modal open={open} onClose={onClose} title={`Fatura · ${card.nome}`}>
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div><p className="text-[10px] uppercase text-slate-400">Aberta</p><p className="font-bold tabular-nums">{fmtMoney(f.aberta)}</p></div>
        <div><p className="text-[10px] uppercase text-slate-400">Fechamento</p><p className="font-bold">{fmtDate(f.fechamento).slice(0, 6)}</p></div>
        <div><p className="text-[10px] uppercase text-slate-400">Vencimento</p><p className="font-bold">{fmtDate(f.vencimento).slice(0, 6)}</p></div>
      </div>
      {f.compras.length ? (
        <ListaTransacoes transacoes={f.compras} categorias={categorias} agrupar={false} />
      ) : (
        <p className="text-sm text-slate-500 text-center py-4">Nenhuma compra neste ciclo.</p>
      )}
    </Modal>
  )
}
