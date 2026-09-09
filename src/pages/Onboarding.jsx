import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveProfile, salvarConta } from '../db/repo.js'
import { carregarDadosDemo } from '../store/useSettings.js'
import { Field, inputCls, Spinner } from '../components/ui.jsx'
import { Sparkles, Building2, Plus, X } from 'lucide-react'

export default function Onboarding({ onConcluir }) {
  const nav = useNavigate()
  const [form, setForm] = useState({ rendaLiquida: '', diasTrabalhados: 22, horasPorDia: 8 })
  const [bancos, setBancos] = useState([{ nome: 'Nubank', guardado: '' }, { nome: 'Banco do Brasil', guardado: '' }])
  const [carregando, setCarregando] = useState(null)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const totalBancos = bancos.reduce((a, b) => a + (Number(String(b.guardado).replace(',', '.')) || 0), 0)
  const concluir = () => { onConcluir?.(); nav('/', { replace: true }) }

  async function comecarDoZero(e) {
    e?.preventDefault()
    setCarregando('zero')
    const guardado = totalBancos
    await saveProfile({
      regime: 'mensal',
      rendaLiquida: Number(String(form.rendaLiquida).replace(',', '.')) || 0,
      diasTrabalhados: Number(form.diasTrabalhados) || 22,
      horasPorDia: Number(form.horasPorDia) || 8,
      guardado,
      disponivel: guardado,
      moeda: 'BRL',
    })
    for (const b of bancos) {
      if (b.nome.trim()) {
        await salvarConta({ nome: b.nome.trim(), tipo: 'conta', saldoInicial: Number(String(b.guardado).replace(',', '.')) || 0 })
      }
    }
    concluir()
  }

  async function usarDemo() {
    setCarregando('demo')
    await carregarDadosDemo()
    concluir()
  }

  const setBanco = (i, k, v) => setBancos((bs) => bs.map((b, j) => (j === i ? { ...b, [k]: v } : b)))
  const removeBanco = (i) => setBancos((bs) => bs.filter((_, j) => j !== i))
  const addBanco = () => setBancos((bs) => [...bs, { nome: '', guardado: '' }])

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <p className="text-4xl mb-2">💰</p>
          <h1 className="text-2xl font-extrabold">Minhas Finanças</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Controle offline-first. A IA só sugere — você confirma.</p>
        </div>

        <form onSubmit={comecarDoZero} className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-sm">
          <Field label="Renda líquida (R$)">
            <input className={inputCls} inputMode="decimal" placeholder="3200" value={form.rendaLiquida} onChange={(e) => set('rendaLiquida', e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dias trabalhados/mês">
              <input className={inputCls} type="number" min={1} max={31} value={form.diasTrabalhados} onChange={(e) => set('diasTrabalhados', e.target.value)} />
            </Field>
            <Field label="Horas por dia">
              <input className={inputCls} type="number" min={1} max={16} value={form.horasPorDia} onChange={(e) => set('horasPorDia', e.target.value)} />
            </Field>
          </div>

          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" /> Quanto tem guardado em cada banco
          </p>
          <div className="space-y-2 mb-1">
            {bancos.map((b, i) => (
              <div key={i} className="flex gap-2">
                <input className={`${inputCls} flex-1`} placeholder="Banco" value={b.nome} onChange={(e) => setBanco(i, 'nome', e.target.value)} />
                <input className={`${inputCls} w-28`} inputMode="decimal" placeholder="R$" value={b.guardado} onChange={(e) => setBanco(i, 'guardado', e.target.value)} />
                <button type="button" onClick={() => removeBanco(i)} className="px-1 text-slate-400 hover:text-rose-500" aria-label="Remover banco">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addBanco} className="text-xs text-[#f6d353] font-medium mb-3 inline-flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" /> Adicionar outro banco
          </button>
          {totalBancos > 0 && (
            <p className="text-xs text-slate-400 mb-3">Total guardado: <strong className="text-slate-600 dark:text-slate-300">R$ {totalBancos.toFixed(2).replace('.', ',')}</strong></p>
          )}

          <button type="submit" disabled={!!carregando} className="w-full rounded-xl py-3 font-semibold bg-[#f6d353] text-slate-950 hover:bg-[#f2c62e] disabled:opacity-50 flex items-center justify-center gap-2">
            {carregando === 'zero' ? <Spinner /> : null} Começar
          </button>

          <div className="flex items-center gap-2 my-4">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            <span className="text-xs text-slate-400">ou</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>

          <button type="button" onClick={usarDemo} disabled={!!carregando} className="w-full rounded-xl py-3 font-semibold border border-[#f6d353]/40 text-[#f6d353] hover:bg-[#f2c62e]/10 disabled:opacity-50 flex items-center justify-center gap-2">
            {carregando === 'demo' ? <Spinner /> : <Sparkles className="h-4 w-4" />} Explorar com dados de exemplo
          </button>
        </form>
      </div>
    </div>
  )
}
