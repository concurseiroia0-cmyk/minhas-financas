import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema.js'
import { salvarMeta, excluirMeta } from '../db/repo.js'
import { progressoMeta, aplicarDeposito } from '../core/goals.js'
import { Card, PageHeader, Modal, Field, inputCls, ConfirmDialog, btnPrimary, btnGhost, EmptyState } from '../components/ui.jsx'
import { AnelProgresso } from '../components/AnelProgresso.jsx'
import { fmtMoney } from '../utils/money.js'
import { Plus, Target, Pencil, Trash2, Trophy, ArrowDownCircle, ArrowUpCircle, Sparkles } from 'lucide-react'

const fmtInput = (v) => (v ? String(v).replace('.', ',') : '')

export default function Metas() {
  const metas = useLiveQuery(() => db.goals.toArray(), []) ?? []

  const [formAberto, setFormAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [titulo, setTitulo] = useState('')
  const [alvo, setAlvo] = useState('')
  const [guardadoInicial, setGuardadoInicial] = useState('')
  const [depositoAberto, setDepositoAberto] = useState(null) // { meta, modo }
  const [valor, setValor] = useState('')
  const [confirmar, setConfirmar] = useState(null)

  function novaMeta() {
    setEditando(null)
    setTitulo('')
    setAlvo('')
    setGuardadoInicial('')
    setFormAberto(true)
  }

  function editar(g) {
    setEditando(g)
    setTitulo(g.titulo)
    setAlvo(fmtInput(g.alvo))
    setGuardadoInicial(fmtInput(g.guardado))
    setFormAberto(true)
  }

  async function salvar() {
    const alvoNum = Number(alvo.replace(/\./g, '').replace(',', '.'))
    if (!titulo.trim() || !(alvoNum > 0)) return
    const base = editando ?? { guardado: 0 }
    const guardadoNum = Number(guardadoInicial.replace(/\./g, '').replace(',', '.')) || 0
    const g = aplicarDeposito(
      { ...base, titulo: titulo.trim(), alvo: alvoNum, guardado: guardadoNum },
      0,
    )
    await salvarMeta(g)
    setFormAberto(false)
  }

  function abrirDeposito(meta, modo) {
    setDepositoAberto({ meta, modo }) // modo: 'add' | 'retirar'
    setValor('')
  }

  async function confirmarDeposito() {
    const { meta, modo } = depositoAberto
    const num = Number(valor.replace(/\./g, '').replace(',', '.'))
    if (!(num > 0)) return
    const aplicado = aplicarDeposito(meta, modo === 'add' ? num : -num)
    await salvarMeta(aplicado)
    setDepositoAberto(null)
  }

  const ordenadas = [...metas].sort((a, b) => {
    const pa = progressoMeta(a)
    const pb = progressoMeta(b)
    if (pa.conquistada !== pb.conquistada) return pa.conquistada ? 1 : -1 // não conquistadas primeiro
    return pb.pctExibicao - pa.pctExibicao
  })

  return (
    <div>
      <PageHeader title="Metas" subtitle="Junte dinheiro e veja o progresso evoluir">
        <button onClick={novaMeta} className="rounded-xl px-3.5 py-2 text-sm font-bold bg-[#f6d353] text-slate-950 hover:bg-[#f2c62e] inline-flex items-center gap-1">
          <Plus className="h-4 w-4" /> Meta
        </button>
      </PageHeader>

      {ordenadas.length === 0 ? (
        <Card className="p-8 text-center">
          <Target className="mx-auto h-10 w-10 text-slate-600 mb-3" />
          <p className="font-medium">Nenhuma meta ainda</p>
          <p className="text-sm text-slate-400 mt-1">Ex.: "Juntar R$ 10.000". Crie sua meta e deposite aos poucos — o anel evolui de cor até conquistar.</p>
          <div className="mt-4 flex justify-center">
            <button onClick={novaMeta} className={btnPrimary}>Criar primeira meta</button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {ordenadas.map((g) => {
            const p = progressoMeta(g)
            return (
              <Card key={g.id} className={`p-4 ${p.conquistada ? 'border-[#f6d353]/40' : ''}`}>
                <div className="flex items-start gap-4">
                  <AnelProgresso percent={p.pct} cor={p.cor} tamanho={116} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold truncate flex items-center gap-1.5">
                          {p.conquistada && <Trophy className="h-4 w-4 text-[#f6d353] shrink-0" />}
                          {g.titulo}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: p.cor }}>
                          {p.conquistada ? '🏆 ' : ''}{p.rotulo} · nível {p.nivel}/4
                        </p>
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        <button onClick={() => editar(g)} className="p-1.5 rounded-lg text-slate-500 hover:text-[#f6d353] hover:bg-slate-800" aria-label="Editar"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setConfirmar(g)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800" aria-label="Excluir"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>

                    <div className="mt-2">
                      <p className="text-2xl font-extrabold tabular-nums">
                        {fmtMoney(g.guardado)}
                        <span className="text-sm font-medium text-slate-500"> / {fmtMoney(g.alvo)}</span>
                      </p>
                      {!p.conquistada ? (
                        <p className="text-xs text-slate-400 mt-0.5">
                          faltam <strong className="text-slate-200">{fmtMoney(p.restante)}</strong> · {p.pctExibicao}%
                          {p.transbordou && ' (supera o alvo!)'}
                        </p>
                      ) : (
                        <p className="text-xs text-[#f6d353] mt-0.5 flex items-center gap-1">
                          <Sparkles className="h-3.5 w-3.5" /> Meta conquistada — parabéns!
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button onClick={() => abrirDeposito(g, 'add')}
                        className="flex-1 rounded-xl py-2 text-xs font-bold bg-[#f6d353] text-slate-950 hover:bg-[#f2c62e] inline-flex items-center justify-center gap-1.5">
                        <ArrowUpCircle className="h-4 w-4" /> Depositar
                      </button>
                      <button onClick={() => abrirDeposito(g, 'retirar')}
                        className="flex-1 rounded-xl py-2 text-xs font-semibold border border-slate-700 text-slate-300 hover:bg-slate-800 inline-flex items-center justify-center gap-1.5">
                        <ArrowDownCircle className="h-4 w-4" /> Retirar
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal nova/editar meta */}
      <Modal open={formAberto} onClose={() => setFormAberto(false)} title={editando ? 'Editar meta' : 'Nova meta'}
        footer={
          <div className="flex gap-2">
            <button onClick={() => setFormAberto(false)} className={`flex-1 ${btnGhost}`}>Cancelar</button>
            <button onClick={salvar} className={`flex-1 ${btnPrimary}`}>Salvar</button>
          </div>
        }>
        <Field label="Nome da meta" hint="Ex.: Reserva de emergência, Viagem, PS5…">
          <input className={inputCls} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Juntar 10 mil" />
        </Field>
        <Field label="Valor alvo (R$)">
          <input className={inputCls} inputMode="decimal" value={alvo} onChange={(e) => setAlvo(e.target.value)} placeholder="10.000,00" />
        </Field>
        <Field label="Já tenho guardado (R$)" hint="Opcional — comece o anel de onde você está.">
          <input className={inputCls} inputMode="decimal" value={guardadoInicial} onChange={(e) => setGuardadoInicial(e.target.value)} placeholder="0,00" />
        </Field>
        <div className="rounded-xl bg-slate-800/50 p-3 text-xs text-slate-400">
          O anel evolui de cor conforme o progresso: <span className="text-violet-400 font-semibold">violeta</span> → <span className="text-green-400 font-semibold">verde</span> → <span className="text-orange-400 font-semibold">laranja</span> → <span className="text-[#f6d353] font-semibold">amarelo brilhando</span> quando conquista.
        </div>
      </Modal>

      {/* Modal depositar/retirar */}
      <Modal open={!!depositoAberto} onClose={() => setDepositoAberto(null)}
        title={depositoAberto?.modo === 'add' ? `Depositar em "${depositoAberto?.meta?.titulo}"` : `Retirar de "${depositoAberto?.meta?.titulo}"`}
        footer={
          <button onClick={confirmarDeposito} className={`w-full ${btnPrimary}`}>
            {depositoAberto?.modo === 'add' ? 'Depositar' : 'Retirar'}
          </button>
        }>
        <Field label="Valor (R$)">
          <input className={inputCls} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" autoFocus />
        </Field>
        {depositoAberto && (
          <p className="text-xs text-slate-500">
            Guardado hoje: <strong className="text-slate-300">{fmtMoney(depositoAberto.meta.guardado)}</strong>
          </p>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmar}
        onClose={() => setConfirmar(null)}
        onConfirm={() => excluirMeta(confirmar.id)}
        titulo="Excluir meta"
        mensagem={`Excluir "${confirmar?.titulo}"? O valor guardado registrado nela será perdido do progresso.`}
      />
    </div>
  )
}
