import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema.js'
import { excluirTransacao } from '../db/repo.js'
import { ListaTransacoes } from '../components/ListaTransacoes.jsx'
import { TransacaoForm } from '../components/TransacaoForm.jsx'
import { ConfirmDialog, PageHeader, inputCls, EmptyState, Card } from '../components/ui.jsx'
import { fmtMoney } from '../utils/money.js'
import { Search, Receipt } from 'lucide-react'

export default function Lancamentos() {
  const txs = useLiveQuery(() => db.transactions.orderBy('data').reverse().toArray(), []) ?? []
  const cats = useLiveQuery(() => db.categories.toArray(), []) ?? []
  const cards = useLiveQuery(() => db.cards.toArray(), []) ?? []
  const contas = useLiveQuery(() => db.accounts.toArray(), []) ?? []

  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState('todos')
  const [catId, setCatId] = useState('todas')
  const [editando, setEditando] = useState(null)
  const [formAberto, setFormAberto] = useState(false)
  const [paraExcluir, setParaExcluir] = useState(null)

  const filtradas = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return txs.filter((t) => {
      if (q && !t.descricao?.toLowerCase().includes(q)) return false
      if (tipo !== 'todos' && t.tipo !== tipo) return false
      if (catId !== 'todas' && t.categoriaId !== catId) return false
      return true
    })
  }, [txs, busca, tipo, catId])

  const total = filtradas.reduce((a, t) => a + (t.tipo === 'receita' ? t.valor : t.tipo === 'despesa' ? -t.valor : 0), 0)

  function nova() {
    setEditando(null)
    setFormAberto(true)
  }
  function editar(t) {
    setEditando(t)
    setFormAberto(true)
  }
  async function excluir() {
    if (paraExcluir) await excluirTransacao(paraExcluir.id)
  }

  return (
    <div>
      <PageHeader title="Lançamentos" subtitle={`${filtradas.length} registro(s) · líquido ${fmtMoney(total)}`}>
        <button onClick={nova} className="rounded-xl px-3.5 py-2 text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500">+ Manual</button>
      </PageHeader>

      <Card className="p-3 mb-4">
        <div className="relative mb-2">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${inputCls} pl-9`} placeholder="Buscar descrição…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <select className={`${inputCls} flex-1`} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="todos">Todos os tipos</option>
            <option value="despesa">Despesas</option>
            <option value="receita">Receitas</option>
            <option value="transferencia">Transferências</option>
          </select>
          <select className={`${inputCls} flex-1`} value={catId} onChange={(e) => setCatId(e.target.value)}>
            <option value="todas">Todas as categorias</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
      </Card>

      {filtradas.length ? (
        <ListaTransacoes transacoes={filtradas} categorias={cats} onEdit={editar} onDelete={setParaExcluir} />
      ) : (
        <EmptyState icon={Receipt} titulo="Nenhum lançamento" sub="Ajuste os filtros ou registre pelo botão + Manual." />
      )}

      <TransacaoForm open={formAberto} onClose={() => setFormAberto(false)} transacao={editando} categorias={cats} cartoes={cards} contas={contas} />

      <ConfirmDialog
        open={!!paraExcluir}
        onClose={() => setParaExcluir(null)}
        onConfirm={excluir}
        titulo="Excluir lançamento"
        mensagem={`Excluir “${paraExcluir?.descricao}” (${fmtMoney(paraExcluir?.valor)})? Isso não pode ser desfeito.`}
      />
    </div>
  )
}
