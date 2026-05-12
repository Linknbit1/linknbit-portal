import { CheckCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { ClickUpSyncStatus } from '../../types'

const STATUS_CONFIG = {
  synced: {
    icon: CheckCircle,
    label: 'Synced',
    classes: 'text-success',
  },
  pending: {
    icon: Clock,
    label: 'Pending sync',
    classes: 'text-warning',
  },
  error: {
    icon: AlertTriangle,
    label: 'Sync error',
    classes: 'text-error',
  },
} as const

interface ClickUpStatusProps {
  status: ClickUpSyncStatus
  showLabel?: boolean
  showRetry?: boolean
  onRetry?: () => void
  size?: number
  className?: string
}

export function ClickUpStatus({ status, showLabel, showRetry, onRetry, size = 14, className }: ClickUpStatusProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <span className={cn('inline-flex items-center gap-1', config.classes, className)}>
      <Icon size={size} className={status === 'pending' ? 'animate-spin-slow' : ''} />
      {showLabel && (
        <span className="text-caption font-ui">{config.label}</span>
      )}
      {showRetry && status === 'error' && onRetry && (
        <button
          onClick={onRetry}
          className="text-caption text-text-3 hover:text-text-1 underline underline-offset-2 flex items-center gap-1"
        >
          <RefreshCw size={10} />
          Retry
        </button>
      )}
    </span>
  )
}
