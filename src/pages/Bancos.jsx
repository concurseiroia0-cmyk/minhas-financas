import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema.js'
import { salvarConta, excluirConta, salvarTransacao } from '../db/repo.js'
import { saldoConta, gastoDoMesConta, totalNosBancos, criarTransferencia } from '../core/accounts.js'
import { calcularFatura } from '../core/invoice.js'
import { Card, PageHeader, Modal, Field, inputCls, EmptyState, ConfirmDialog, CardResumo } from '../components/ui.jsx'
import { fmtMoney, parseMoney } from '../utils/money.js'
import { monthKey, hoje, fmtDateShort } from '../utils/date.js'
import { Building2, Plus, ArrowLeftRight, Pencil, Trash2, CreditCard } from 'lucide-react'

export default function Bancos() {
  const contas = useLiveQuery(() => db.accounts.toArray(), []) ?? []
  const txs = useLiveQuery(() => db.transactions.toArray(), []) ?? []
  const cards = useLiveQuery(() => db.cards.toArray(), []) ?? []

  const [formAberto, setFormAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [transfAberta, setTransfAberta] = useState(false)
  const [paraExcluir, setParaExcluir] = useState(null)

  const mk = monthKey(hoje())
  const total = totalNosBancos(contas, txs)

  return (
    <div>
      <PageHeader title="Bancos" subtitle="Quanto tem guardado e gasto em cada banco">
        <div className="flex gap-2">
          <button onClick={() => setTransfAberta(true)} disabled={contas.length < 2}
            className="rounded-xl px-3 py-2 text-sm font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 inline-flex items-center gap-1">
            <ArrowLeftRight className="h-4 w-4" /> Transferir
          </button>
          <button onClick={() => { setEditando(null); setFormAberto(true) }}
            className="rounded-xl px-3.5 py-2 text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500 inline-flex items-center gap-1">
            <Plus className="h-4 w-4" /> Banco
          </button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <CardResumo titulo="Total nos bancos" valor={total} cor="text-emerald-600 dark:text-emerald-400" />
        <CardResumo titulo="Gasto no mês" valor={contas.reduce((a, c) => a + gastoDoMesConta(c, txs, mk), 0)} cor="text-rose-600 dark:text-rose-400" />
      </div>

      {contas.length === 0 ? (
        <EmptyState icon={Building2} titulo="Nenhum banco cadastrado" sub="Ex.: Nubank com R$ 400 guardados, Banco do Brasil com R$ 300." />
      ) : (
        <div className="space-y-3">
          {contas.map((conta) => {
            const saldo = saldoConta(conta, txs)
            const gasto = gastoDoMesConta(conta, txs, mk)
            const cartoes = cards.filter((c) => c.contaId === conta.id)
            const faturas = cartoes.map((c) => ({ card: c, f: calcularFatura(c, txs) }))
            return (
              <Card key={conta.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Building2 className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <p className="font-semibold">{conta.nome}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {conta.tipo === 'dinheiro' ? 'Dinheiro/carteira' : 'Conta bancária'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-extrabold tabular-nums ${saldo < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{fmtMoney(saldo)}</p>
                    <p className="text-[11px] text-slate-400">saldo atual</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Gasto no mês</p>
                    <p className="font-semibold tabular-nums">{fmtMoney(gasto)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Faturas vinculadas</p>
                    {faturas.length ? faturas.map(({ card, f }) => (
                      <p key={card.id} className="font-semibold tabular-nums flex items-center gap-1">
                        <CreditCard className="h-3 w-3 text-slate-400" /> {fmtMoney(f.aberta)}
                        <span className="text-[10px] font-normal text-slate-400">vence {fmtDateShort(f.vencimento)}</span>
                      </p>
                    )) : <p className="text-slate-400 text-xs">—</p>}
                  </div>
                </div>
                <div className="flex gap-1 mt-2 justify-end">
                  <button onClick={() => { setEditando(conta); setFormAberto(true) }} className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30" aria-label="Editar"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setParaExcluir(conta)} className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30" aria-label="Excluir"><Trash2 className="h-4 w-4" /></button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <BancoForm open={formAberto} onClose={() => setFormAberto(false)} conta={editando} />
      <TransferenciaForm open={transfAberta} onClose={() => setTransfAberta(false)} contas={contas} />

      <ConfirmDialog open={!!paraExcluir} onClose={() => setParaExcluir(null)}
        onConfirm={() => paraExcluir && excluirConta(paraExcluir.id)}
        titulo="Excluir banco" mensagem={`Excluir "${paraExcluir?.nome}"? O histórico de transações permanece, mas elas ficam sem banco.`} />
    </div>
  )
}

function BancoForm({ open, onClose, conta }) {
  const [nome, setNome] = useState('')
  const [saldo, setSaldo] = useState('')
  const [tipo, setTipo] = useState('conta')
  const chaveRef = conta?.id ?? 'novo'
  const [lastKey, setLastKey] = useState(null)

  if (open && lastKey !== chaveRef) {
    setNome(conta?.nome ?? '')
    setSaldo(conta ? String(conta.saldoInicial ?? 0).replace('.', ',') : '')
    setTipo(conta?.tipo ?? 'conta')
    setLastKey(chaveRef)
  }

  return (
    <Modal open={open} onClose={onClose} title={conta ? 'Editar banco' : 'Novo banco'}
      footer={
        <button onClick={async () => {
          if (!nome.trim()) return
          await salvarConta({ id: conta?.id, nome: nome.trim(), tipo, saldoInicial: parseMoney(saldo) })
          onClose()
        }} className="w-full rounded-xl py-2.5 text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500">
          Salvar
        </button>
      }>
      <Field label="Nome do banco">
        <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Nubank, Banco do Brasil…" autoFocus />
      </Field>
      <Field label={conta ? 'Ajustar saldo atual (R$)' : 'Quanto tem guardado (R$)'} hint={conta ? 'Substitui o saldo calculado até agora.' : 'Esse valor vira o saldo inicial da conta.'}>
        <input className={inputCls} inputMode="decimal" value={saldo} onChange={(e) => setSaldo(e.target.value)} placeholder="400" />
      </Field>
      <Field label="Tipo">
        <select className={inputCls} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="conta">Conta bancária</option>
          <option value="dinheiro">Dinheiro/carteira</option>
        </select>
      </Field>
    </Modal>
  )
}

function TransferenciaForm({ open, onClose, contas }) {
  const [origem, setOrigem] = useState('')
  const [destino, setDestino] = useState('')
  const [valor, setValor] = useState('')
  const [erro, setErro] = useState(null)

  async function transferir() {
    const v = parseMoney(valor)
    if (!origem || !destino) return setErro('Escolha origem e destino')
    if (origem === destino) return setErro('Origem e destino devem ser diferentes')
    if (!v) return setErro('Informe um valor')
    await salvarTransacao(criarTransferencia({ valor: v, contaOrigemId: origem, contaDestinoId: destino }))
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Transferir entre bancos"
      footer={<button onClick={transferir} className="w-full rounded-xl py-2.5 text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500">Transferir</button>}>
      <Field label="De (origem)">
        <select className={inputCls} value={origem} onChange={(e) => setOrigem(e.target.value)}>
          <option value="">Escolher…</option>
          {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </Field>
      <Field label="Para (destino)">
        <select className={inputCls} value={destino} onChange={(e) => setDestino(e.target.value)}>
          <option value="">Escolher…</option>
          {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </Field>
      <Field label="Valor (R$)">
        <input className={inputCls} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="100" />
      </Field>
      <p className="text-xs text-slate-400">A transferência não conta como gasto — só move dinheiro entre bancos.</p>
      {erro && <p className="text-sm text-rose-600 mt-2">{erro}</p>}
    </Modal>
  )
}
