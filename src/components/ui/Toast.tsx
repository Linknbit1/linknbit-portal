import { useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { ToastContext } from './toast-context'
import type { ToastType } from './toast-context'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const STYLES = {
  success: 'border-success/30 bg-success/8 text-success',
  error: 'border-error/30 bg-error/8 text-error',
  warning: 'border-warning/30 bg-warning/8 text-warning',
  info: 'border-border-strong bg-surface-2 text-text-1',
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const Icon = ICONS[toast.type]

  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.duration ?? 3500)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onRemove])

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl backdrop-blur-sm',
        'font-ui text-[13px] font-medium min-w-70 max-w-95',
        'animate-in slide-in-from-right-4 fade-in duration-200',
        STYLES[toast.type],
      )}
      style={{ background: 'rgba(15,22,32,0.95)' }}
    >
      <Icon size={16} className="shrink-0" />
      <span className="flex-1 text-text-1">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 text-text-4 hover:text-text-2 transition-colors"
      >
        <X size={13} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'success', duration?: number) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev.slice(-4), { id, type, message, duration }])
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] sm:left-auto sm:right-6 sm:bottom-6 flex flex-col gap-2 z-9999 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={remove} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
