import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema.js'
import { salvarRecorrencia, excluirRecorrencia, salvarTransacoes, salvarTransacao } from '../db/repo.js'
import { gerarLancamentosRecorrencia } from '../core/recurrence.js'
import { Modal, Field, inputCls, Card, PageHeader, EmptyState, ConfirmDialog, Badge } from '../components/ui.jsx'
import { fmtMoney, parseMoney } from '../utils/money.js'
import { fmtLabel, diasAte, hoje, addDays, addMonths, parseDate, toISO } from '../utils/date.js'
import { Repeat, Plus, Zap } from 'lucide-react'

export default function Recorrentes() {
  const recs = useLiveQuery(() => db.recurrences.toArray(), []) ?? []
  const txs = useLiveQuery(() => db.transactions.toArray(), []) ?? []
  const cats = useLiveQuery(() => db.categories.toArray(), []) ?? []
  const cards = useLiveQuery(() => db.cards.toArray(), []) ?? []

  const [formAberto, setFormAberto] = useState(false)
  const [paraExcluir, setParaExcluir] = useState(null)
  const [processando, setProcessando] = useState(false)

  async function gerarPendentes() {
    setProcessando(true)
    try {
      const novas = recs.flatMap((r) => gerarLancamentosRecorrencia(r, txs))
      if (novas.length) await salvarTransacoes(novas)
      // avança proximaData para depois de hoje
      for (const r of recs) {
        if (!r.ativo) continue
        let data = r.proximaData
        while (data && data <= hoje()) {
          data = r.frequencia === 'semanal' ? addDays(data, 7) : addMonths(data, 1)
        }
        if (data && data !== r.proximaData) await db.recurrences.update(r.id, { proximaData: data })
      }
    } finally {
      setProcessando(false)
    }
  }

  const ativas = recs.filter((r) => r.ativo)
  const totalMensal = ativas.filter((r) => r.tipo !== 'receita').reduce((a, r) => a + (Number(r.valor) || 0), 0)
  const pendentes = recs.reduce((a, r) => a + gerarLancamentosRecorrencia(r, txs).length, 0)

  return (
    <div>
      <PageHeader title="Recorrentes" subtitle={`Fixas do mês: ${fmtMoney(totalMensal)} · receitas somam ${fmtMoney(ativas.filter((r) => r.tipo === 'receita').reduce((a, r) => a + (Number(r.valor) || 0), 0))}`}>
        <div className="flex gap-2">
          {pendentes > 0 && (
            <button onClick={gerarPendentes} disabled={processando}
              className="rounded-xl px-3 py-2 text-sm font-semibold border border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 inline-flex items-center gap-1">
              <Zap className="h-4 w-4" /> Gerar {pendentes}
            </button>
          )}
          <button onClick={() => setFormAberto(true)} className="rounded-xl px-3.5 py-2 text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500 inline-flex items-center gap-1">
            <Plus className="h-4 w-4" /> Nova
          </button>
        </div>
      </PageHeader>

      {recs.length === 0 ? (
        <EmptyState icon={Repeat} titulo="Nenhuma recorrente" sub="Cadastre aluguel, assinaturas, academia… o app gera os lançamentos automaticamente." />
      ) : (
        <div className="space-y-3">
          {ativas.map((r) => {
            const dias = r.proximaData ? diasAte(r.proximaData) : null
            return (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{r.descricao}</p>
                      <Badge className={r.tipo === 'receita' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'}>
                        {r.tipo === 'receita' ? 'receita' : 'despesa'}
                      </Badge>
                      {r.metodo === 'credito' && r.cardId && <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">cartão</Badge>}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {r.frequencia === 'semanal' ? 'Semanal' : 'Mensal'} · dia {r.dia} · {r.metodo}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold tabular-nums ${r.tipo === 'receita' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>{fmtMoney(r.valor)}</p>
                    {dias != null && (
                      <p className={`text-xs ${dias <= 3 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-slate-400'}`}>
                        {dias <= 0 ? 'vence hoje' : `em ${dias} dia${dias > 1 ? 's' : ''}`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setParaExcluir(r)} className="text-xs rounded-lg px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30">Excluir</button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <RecorrenciaForm open={formAberto} onClose={() => setFormAberto(false)} categorias={cats} cartoes={cards} />
      <ConfirmDialog open={!!paraExcluir} onClose={() => setParaExcluir(null)} onConfirm={() => paraExcluir && excluirRecorrencia(paraExcluir.id)}
        titulo="Excluir recorrente" mensagem={`Excluir "${paraExcluir?.descricao}"? Os lançamentos já criados permanecem.`} />
    </div>
  )
}

function RecorrenciaForm({ open, onClose, categorias, cartoes }) {
  const [form, setForm] = useState({
    descricao: '', valor: '', tipo: 'despesa', categoriaId: '', metodo: 'pix',
    frequencia: 'mensal', dia: 5,
  })
  const [erro, setErro] = useState(null)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function salvar() {
    const valor = parseMoney(form.valor)
    if (!form.descricao.trim() || !valor) { setErro('Preencha descrição e valor'); return }
    const dia = Math.min(28, Math.max(1, Number(form.dia) || 1))
    const hojeISO = hoje()
    let proxData
    if (form.frequencia === 'semanal') {
      const dowAlvo = dia === 7 ? 0 : dia // 1=seg … 7=dom → JS 0=dom
      let d = parseDate(hojeISO)
      do { d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12) } while (d.getDay() !== dowAlvo)
      proxData = toISO(d)
    } else {
      const [y, m] = hojeISO.split('-').map(Number)
      proxData = `${y}-${String(m).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
      if (proxData <= hojeISO) {
        let nm = Number(hojeISO.slice(5, 7)) + 1, ny = Number(hojeISO.slice(0, 4))
        if (nm > 12) { nm = 1; ny++ }
        proxData = `${ny}-${String(nm).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
      }
    }
    await salvarRecorrencia({
      descricao: form.descricao.trim(), valor, tipo: form.tipo,
      categoriaId: form.categoriaId || null,
      metodo: form.metodo,
      cardId: null,
      frequencia: form.frequencia, dia,
      ativo: true, proximaData: proxData,
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova recorrente"
      footer={<button onClick={salvar} className="w-full rounded-xl py-2.5 text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500">Salvar</button>}>
      <Field label="Descrição"><input className={inputCls} value={form.descricao} onChange={(e) => set('descricao', e.target.value)} placeholder="Ex.: Netflix, Aluguel" autoFocus /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor (R$)"><input className={inputCls} inputMode="decimal" value={form.valor} onChange={(e) => set('valor', e.target.value)} placeholder="39,90" /></Field>
        <Field label="Tipo">
          <select className={inputCls} value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </select>
        </Field>
        <Field label="Frequência">
          <select className={inputCls} value={form.frequencia} onChange={(e) => set('frequencia', e.target.value)}>
            <option value="mensal">Mensal</option>
            <option value="semanal">Semanal</option>
          </select>
        </Field>
        <Field label={form.frequencia === 'semanal' ? 'Dia da semana (1=seg)' : 'Dia do mês'}>
          <input type="number" min={1} max={form.frequencia === 'semanal' ? 7 : 28} className={inputCls} value={form.dia} onChange={(e) => set('dia', e.target.value)} />
        </Field>
        <Field label="Método">
          <select className={inputCls} value={form.metodo} onChange={(e) => set('metodo', e.target.value)}>
            {['pix', 'debito', 'credito', 'dinheiro'].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Categoria">
          <select className={inputCls} value={form.categoriaId} onChange={(e) => set('categoriaId', e.target.value)}>
            <option value="">Sem categoria</option>
            {[...categorias].sort((a, b) => a.nome.localeCompare(b.nome)).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Field>
      </div>
      {erro && <p className="text-sm text-rose-600">{erro}</p>}
    </Modal>
  )
}
