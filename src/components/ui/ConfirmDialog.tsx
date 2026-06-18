import { type ReactNode } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { ModalShell } from './ModalShell'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Styles the confirm button as destructive (default true). */
  danger?: boolean
  isPending?: boolean
  onConfirm: () => void
  onClose: () => void
}

/**
 * A small reusable confirm/cancel modal — used for destructive actions like deletes.
 * Caller controls visibility via `open`; renders nothing when closed.
 */
export function ConfirmDialog({
  open, title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel',
  danger = true, isPending = false, onConfirm, onClose,
}: ConfirmDialogProps) {
  if (!open) return null
  return (
    <ModalShell onClose={onClose} size="sm" busy={isPending} contentClassName="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          {danger && (
            <span className="size-9 rounded-lg bg-error/10 border border-error/25 flex items-center justify-center shrink-0">
              <AlertTriangle size={17} className="text-error" />
            </span>
          )}
          <h3 className="font-display font-bold text-[16px] text-text-1">{title}</h3>
        </div>
        <button onClick={onClose} disabled={isPending} className="text-text-4 hover:text-text-1 disabled:opacity-50">
          <X size={18} />
        </button>
      </div>
      <div className="text-[13px] font-ui text-text-2 mb-5">{message}</div>
      <div className="flex gap-2.5">
        <Button variant="ghost" size="sm" className="flex-1" onClick={onClose} disabled={isPending}>{cancelLabel}</Button>
        <Button variant={danger ? 'danger' : 'primary'} size="sm" className="flex-1" onClick={onConfirm} disabled={isPending}>
          {isPending ? 'Deleting…' : confirmLabel}
        </Button>
      </div>
    </ModalShell>
  )
}
