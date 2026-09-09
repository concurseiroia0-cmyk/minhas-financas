import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema.js'
import { useSettings } from '../store/useSettings.js'
import { exportarJSON, importarJSON, resetarTudo, salvarCategoria, excluirCategoria } from '../db/repo.js'
import { temChaveIA, MODELOS } from '../config/ai.js'
import { estadoPermissao, pedirPermissao, notificar, verificarVencimentos } from '../core/notifications.js'
import { Card, PageHeader, Field, inputCls, ConfirmDialog, Badge } from '../components/ui.jsx'
import { Cpu, Palette, Tags, Database, Download, Upload, Trash2, Plus, ShieldCheck, Bell } from 'lucide-react'

export default function Config() {
  const settings = useSettings()
  const cats = useLiveQuery(() => db.categories.toArray(), []) ?? []
  const fileRef = useRef(null)

  const [novaCat, setNovaCat] = useState('')
  const [confirmarReset, setConfirmarReset] = useState(false)
  const [importMsg, setImportMsg] = useState(null)
  const [permissao, setPermissao] = useState(estadoPermissao())

  async function exportar() {
    const data = await exportarJSON()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `financas-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importar(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      await importarJSON(JSON.parse(text))
      setImportMsg({ ok: true, msg: 'Backup restaurado! Recarregando…' })
      setTimeout(() => location.reload(), 1200)
    } catch (err) {
      setImportMsg({ ok: false, msg: 'Erro: ' + err.message })
    }
    e.target.value = ''
  }

  async function resetar() {
    await resetarTudo()
    await db.profile.delete('me')
    await db.settings.clear()
    location.reload()
  }

  async function addCategoria() {
    if (!novaCat.trim()) return
    const cores = ['#34d399', '#38bdf8', '#a78bfa', '#f472b6', '#fbbf24', '#fb923c', '#f87171', '#2dd4bf']
    await salvarCategoria({ nome: novaCat.trim(), cor: cores[Math.floor(Math.random() * cores.length)] })
    setNovaCat('')
  }

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Tudo fica no seu dispositivo" />

      {/* IA */}
      <Card className="p-4 mb-3">
        <p className="text-sm font-semibold flex items-center gap-1.5 mb-3"><Cpu className="h-4 w-4 text-sky-500" /> Inteligência Artificial</p>
        <div className="flex items-center gap-2 mb-3">
          <Badge className={temChaveIA() ? 'bg-[#f6d353]/15 text-[#f6d353]' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'}>
            {temChaveIA() ? '✓ IA ativada' : '✕ IA desativada'}
          </Badge>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> modelos gratuitos
          </span>
        </div>
        <Field label="Provedor preferido" hint="Se falhar ou estiver lento, o app tenta o outro automaticamente.">
          <select className={inputCls} value={settings.provedorIA} onChange={(e) => settings.update({ provedorIA: e.target.value })}>
            <option value="openrouter">OpenRouter ({MODELOS.openrouter})</option>
            <option value="nvidia">NVIDIA NIM ({MODELOS.nvidia})</option>
          </select>
        </Field>
        <p className="text-[11px] text-slate-400">
          As chaves já estão configuradas neste app. Os dados das suas transações nunca são enviados — só o texto
          que você digitar no QuickAdd e números agregados dos relatórios.
        </p>
      </Card>

      {/* Notificações */}
      <Card className="p-4 mb-3">
        <p className="text-sm font-semibold flex items-center gap-1.5 mb-3"><Bell className="h-4 w-4 text-[#f6d353]" /> Notificações</p>
        {permissao === 'granted' ? (
          <>
            <Badge className="bg-[#f6d353]/15 text-[#f6d353]">✓ Ativadas</Badge>
            <p className="text-xs text-slate-400 mt-2 mb-3">
              Você será avisado quando uma fatura ou conta recorrente vencer (1 dia antes e no dia).
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => notificar('Teste de notificação 🔔', 'Está funcionando! Você será avisado dos vencimentos.', 'teste')}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold border border-slate-700 hover:bg-slate-800">
                Enviar teste
              </button>
              <button onClick={() => verificarVencimentos({ forcar: true })}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold border border-slate-700 hover:bg-slate-800">
                Verificar vencimentos agora
              </button>
            </div>
          </>
        ) : permissao === 'denied' ? (
          <>
            <Badge className="bg-rose-500/15 text-rose-400">✕ Bloqueadas</Badge>
            <p className="text-xs text-slate-400 mt-2">
              As notificações foram bloqueadas nas configurações do navegador. Para ativar: toque no ícone 🔒/ⓘ ao lado do endereço do site → Notificações → Permitir.
            </p>
          </>
        ) : (
          <>
            <p className="text-xs text-slate-400 mb-3">
              Receba um aviso no celular quando a fatura do cartão ou uma conta recorrente estiver para vencer.
            </p>
            <button onClick={async () => setPermissao(await pedirPermissao())}
              className="rounded-xl px-4 py-2.5 text-sm font-bold bg-[#f6d353] text-slate-950 hover:bg-[#f2c62e]">
              🔔 Ativar notificações
            </button>
          </>
        )}
      </Card>

      {/* Aparência */}
      <Card className="p-4 mb-3">
        <p className="text-sm font-semibold flex items-center gap-1.5 mb-3"><Palette className="h-4 w-4 text-violet-500" /> Aparência</p>
        <div className="grid grid-cols-2 gap-2">
          {['dark', 'light'].map((t) => (
            <button key={t} onClick={() => settings.update({ tema: t })}
              className={`rounded-xl py-2.5 text-sm font-semibold border ${settings.tema === t ? 'border-[#f6d353] bg-[#f6d353]/10 text-[#f6d353]' : 'border-slate-300 dark:border-slate-700'}`}>
              {t === 'dark' ? '🌙 Escuro' : '☀️ Claro'}
            </button>
          ))}
        </div>
      </Card>

      {/* Categorias */}
      <Card className="p-4 mb-3">
        <p className="text-sm font-semibold flex items-center gap-1.5 mb-3"><Tags className="h-4 w-4 text-amber-500" /> Categorias</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {cats.map((c) => (
            <span key={c.id} className="group inline-flex items-center gap-1 rounded-full pl-2.5 pr-1.5 py-1 text-xs font-medium"
              style={{ background: (c.cor || '#94a3b8') + '22', color: c.cor || '#94a3b8' }}>
              {c.nome}
              <button onClick={() => excluirCategoria(c.id)} className="opacity-40 group-hover:opacity-100" aria-label={`Excluir ${c.nome}`}>×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input className={inputCls} value={novaCat} onChange={(e) => setNovaCat(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCategoria()} placeholder="Nova categoria…" />
          <button onClick={addCategoria} className="h-11 w-11 shrink-0 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center" aria-label="Adicionar categoria">
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </Card>

      {/* Dados */}
      <Card className="p-4 mb-3">
        <p className="text-sm font-semibold flex items-center gap-1.5 mb-3"><Database className="h-4 w-4 text-[#f6d353]" /> Dados</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportar} className="rounded-xl px-4 py-2.5 text-sm font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-2">
            <Download className="h-4 w-4" /> Exportar backup
          </button>
          <button onClick={() => fileRef.current?.click()} className="rounded-xl px-4 py-2.5 text-sm font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-2">
            <Upload className="h-4 w-4" /> Importar backup
          </button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={importar} />
          <button onClick={() => setConfirmarReset(true)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-rose-600 border border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-900/30 inline-flex items-center gap-2">
            <Trash2 className="h-4 w-4" /> Apagar tudo
          </button>
        </div>
        {importMsg && <p className={`text-xs mt-2 ${importMsg.ok ? 'text-[#f6d353]' : 'text-rose-600'}`}>{importMsg.msg}</p>}
        <p className="text-[11px] text-slate-400 mt-3">
          Seus dados vivem apenas no IndexedDB deste navegador/dispositivo. Nada é enviado a servidores.
          Exporte de vez em quando — limpar os dados do site apaga tudo.
        </p>
      </Card>

      <p className="text-center text-[11px] text-slate-400 pb-4">
        Minhas Finanças v0.2 · PWA offline-first · IA gratuita que só sugere
      </p>

      <ConfirmDialog
        open={confirmarReset}
        onClose={() => setConfirmarReset(false)}
        onConfirm={resetar}
        titulo="Apagar todos os dados"
        mensagem="Isso exclui perfil, transações, recorrentes e configurações deste navegador. Exporte um backup antes! Não pode ser desfeito."
      />
    </div>
  )
}
