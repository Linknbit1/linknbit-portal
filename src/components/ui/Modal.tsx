import { type ReactNode } from 'react'
import { X } from 'lucide-react'
import { ModalShell, type ModalSize } from './ModalShell'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: ModalSize
  /** Block backdrop/Esc close (e.g. while a request is in flight). */
  busy?: boolean
}

/**
 * Chrome wrapper over {@link ModalShell}: optional sticky title bar + footer with
 * a scrollable body between them. Animation/positioning all come from ModalShell.
 */
export function Modal({ open, onClose, title, children, footer, size = 'md', busy = false }: ModalProps) {
  if (!open) return null
  return (
    <ModalShell onClose={onClose} size={size} busy={busy} scroll={false}>
      {title && (
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border-subtle shrink-0">
          <h2 className="font-display font-bold text-[16px] text-text-1 min-w-0 truncate">{title}</h2>
          <button
            onClick={onClose}
            disabled={busy}
            className="size-7 rounded-md flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-surface-2 transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto pb-safe sm:pb-0">{children}</div>
      {footer && (
        <div className="shrink-0 border-t border-border-subtle px-5 py-4">{footer}</div>
      )}
    </ModalShell>
  )
}
