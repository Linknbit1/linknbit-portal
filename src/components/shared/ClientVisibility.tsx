import { Eye, Lock } from 'lucide-react'
import { cn } from '../../lib/cn'

interface ClientVisibilityProps {
  visible: boolean
  onChange?: (visible: boolean) => void
  showLabel?: boolean
  size?: number
  className?: string
}

export function ClientVisibility({ visible, onChange, showLabel, size = 14, className }: ClientVisibilityProps) {
  const Icon = visible ? Eye : Lock

  const content = (
    <span
      className={cn(
        'inline-flex items-center gap-1',
        visible ? 'text-text-3' : 'text-text-4',
        className,
      )}
      title={visible ? 'Visible to client' : 'Hidden from client'}
    >
      <Icon size={size} />
      {showLabel && (
        <span className="text-caption font-ui">
          {visible ? 'Client visible' : 'Hidden'}
        </span>
      )}
    </span>
  )

  if (onChange) {
    return (
      <button
        onClick={() => onChange(!visible)}
        className={cn(
          'inline-flex items-center gap-1 transition-colors hover:opacity-80',
          visible ? 'text-text-3' : 'text-text-4',
          className,
        )}
        title={visible ? 'Click to hide from client' : 'Click to show to client'}
        aria-label={visible ? 'Visible to client' : 'Hidden from client'}
      >
        <Icon size={size} />
        {showLabel && (
          <span className="text-caption font-ui">
            {visible ? 'Client visible' : 'Hidden'}
          </span>
        )}
      </button>
    )
  }

  return content
}
