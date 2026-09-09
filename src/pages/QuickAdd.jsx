import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema.js'
import { useSettings } from '../store/useSettings.js'
import { interpretarTexto } from '../ai/parseText.js'
import { tamanhoFila } from '../ai/queue.js'
import { ConfirmarSugestao } from '../components/ConfirmarSugestao.jsx'
import { Card, PageHeader, Spinner, inputCls, Badge } from '../components/ui.jsx'
import { Sparkles, Send, Zap, Clock, Cpu } from 'lucide-react'

const EXEMPLOS = ['ifood 45,90', 'uber 23,50 no cartão', 'netflix 39,90 crédito', 'salário 3200 pix', 'mercado 187,30 ontem']

export default function QuickAdd() {
  const nav = useNavigate()
  const settings = useSettings()
  const cats = useLiveQuery(() => db.categories.toArray(), []) ?? []
  const cards = useLiveQuery(() => db.cards.toArray(), []) ?? []
  const contas = useLiveQuery(() => db.accounts.toArray(), []) ?? []

  const [texto, setTexto] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [sugestoes, setSugestoes] = useState(null)
  const [ambiguidade, setAmbiguidade] = useState(null)
  const [erro, setErro] = useState(null)
  const [fonte, setFonte] = useState(null)
  const [historico, setHistorico] = useState([])
  const [ultimoTexto, setUltimoTexto] = useState('')
  const [fila, setFila] = useState(0)

  useEffect(() => { tamanhoFila().then(setFila).catch(() => {}) }, [])

  async function enviar(e) {
    e?.preventDefault()
    if (!texto.trim() || carregando) return
    setCarregando(true)
    setErro(null)
    setSugestoes(null)
    setAmbiguidade(null)
    try {
      const itens = await interpretarTexto(texto, settings)
      setFonte(itens[0]?.origemNivel || 'ia')
      setSugestoes(itens)
      setUltimoTexto(texto)
      setHistorico((h) => [texto, ...h.filter((x) => x !== texto)].slice(0, 5))
      setTexto('')
    } catch (err) {
      setErro(err.message || 'Não foi possível interpretar o texto')
      tamanhoFila().then(setFila).catch(() => {})
    } finally {
      setCarregando(false)
    }
  }

  const temChave = Object.values(settings.chavesAPI || {}).some(Boolean)

  return (
    <div className="animate-in">
      <PageHeader
        title="Registrar por texto"
        subtitle={fonte ? `Resolvido por: ${rotuloFonte(fonte)}` : 'Escreva naturalmente — a IA sugere, você confirma'}
      >
        <button onClick={() => nav(-1)} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">Fechar</button>
      </PageHeader>

      <form onSubmit={enviar} className="flex gap-2 mb-2">
        <input
          autoFocus
          className={`${inputCls} flex-1`}
          placeholder="Ex.: comprei café e pão 12 reais"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={carregando}
        />
        <button type="submit" disabled={!texto.trim() || carregando}
          className="h-11 w-11 shrink-0 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-500 disabled:opacity-40 transition-colors"
          aria-label="Interpretar">
          {carregando ? <Spinner /> : <Send className="h-5 w-5" />}
        </button>
      </form>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {EXEMPLOS.map((ex) => (
          <button key={ex} onClick={() => setTexto(ex)}
            className="text-xs rounded-full px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700">
            {ex}
          </button>
        ))}
      </div>

      {/* Como a frase será resolvida */}
      <Card className="p-4 mb-4">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Pipeline</p>
        <ol className="text-sm space-y-1.5 text-slate-600 dark:text-slate-300">
          <li className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-amber-500" /> 1. Regras locais — offline, milissegundos</li>
          <li className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-violet-500" /> 2. Seu histórico — descrições que você já classificou</li>
          <li className="flex items-center gap-2"><Cpu className="h-3.5 w-3.5 text-sky-500" /> 3. IA {temChave ? '' : '(sem chave configurada — Configurações)'}</li>
        </ol>
        {fila > 0 && (
          <p className="text-xs mt-3 text-amber-600 dark:text-amber-400">
            {fila} frase(s) na fila para processar quando a internet voltar.
          </p>
        )}
      </Card>

      {erro && (
        <Card className="p-4 mb-4 border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10">
          <p className="text-sm text-amber-700 dark:text-amber-300">{erro}</p>
          <p className="text-xs text-slate-500 mt-1">A frase foi salva na fila — tente de novo online, ou lance manualmente.</p>
        </Card>
      )}

      {historico.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Suas últimas frases</p>
          <div className="space-y-1">
            {historico.map((h) => (
              <button key={h} onClick={() => setTexto(h)} className="block w-full text-left text-sm rounded-xl px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40">
                “{h}”
              </button>
            ))}
          </div>
        </div>
      )}

      <ConfirmarSugestao
        open={!!sugestoes}
        onClose={() => setSugestoes(null)}
        itens={sugestoes ?? []}
        categorias={cats}
        cartoes={cards}
        contas={contas}
        ambiguidade={ambiguidade}
        textoOrigem={ultimoTexto}
        onSalvo={() => nav('/lancamentos')}
      />
    </div>
  )
}

function rotuloFonte(f) {
  return { 'regra-local': 'regras locais (offline)', historico: 'seu histórico', ia: 'IA' }[f] || f
}
