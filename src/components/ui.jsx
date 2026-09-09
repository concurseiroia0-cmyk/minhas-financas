import { useEffect } from 'react'
import { useSettings } from '../store/useSettings.js'

export function BadgeOffline() {
  const online = useSettings((s) => s.online)
  if (online) return null
  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 rounded-full bg-amber-500/90 px-4 py-1 text-xs font-medium text-slate-900 shadow-lg">
      ⚡ Offline — dados salvos localmente
    </div>
  )
}

export function Spinner({ className = 'h-4 w-4' }) {
  return (
    <span className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />
  )
}

export function Card({ className = '', children }) {
  return (
    <div className={`rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export function EmptyState({ icon: Icon, titulo, sub, children }) {
  return (
    <Card className="p-8 text-center">
      {Icon && <Icon className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />}
      <p className="font-medium">{titulo}</p>
      {sub && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{sub}</p>}
      {children && <div className="mt-4 flex justify-center">{children}</div>}
    </Card>
  )
}

/** Modal mobile-first (bottom sheet no celular). */
export function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[92dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fechar">✕</button>
        </div>
        <div className="px-5 pb-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({ label, children, hint }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
    </label>
  )
}

export const inputCls =
  'w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500'

export function ConfirmDialog({ open, onClose, onConfirm, titulo, mensagem }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titulo}
      footer={
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium border border-slate-300 dark:border-slate-700">Cancelar</button>
          <button onClick={() => { onConfirm(); onClose() }} className="rounded-xl px-4 py-2 text-sm font-medium bg-rose-600 text-white hover:bg-rose-500">Excluir</button>
        </div>
      }
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">{mensagem}</p>
    </Modal>
  )
}

export function CardResumo({ titulo, valor, cor = '', icone: Icon }) {
  const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0)
  return (
    <Card className="p-4">
      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {titulo}
      </p>
      <p className={`text-xl font-extrabold tabular-nums mt-0.5 ${cor}`}>{fmt(valor)}</p>
    </Card>
  )
}

export function Badge({ children, className = '' }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${className}`}>{children}</span>
}
