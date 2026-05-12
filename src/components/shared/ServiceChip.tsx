import { cn } from '../../lib/cn'
import type { ServiceType } from '../../types'

const SERVICE_CONFIG = {
  design: {
    label: 'Design',
    dot: 'bg-service-design',
    classes: 'bg-service-design/10 text-service-design border border-service-design/30',
  },
  development: {
    label: 'Development',
    dot: 'bg-service-dev',
    classes: 'bg-service-dev/10 text-service-dev border border-service-dev/30',
  },
  marketing: {
    label: 'Marketing',
    dot: 'bg-service-mkt',
    classes: 'bg-service-mkt/10 text-service-mkt border border-service-mkt/30',
  },
} as const

interface ServiceChipProps {
  service: ServiceType
  size?: 'sm' | 'md'
  showDot?: boolean
  className?: string
}

export function ServiceChip({ service, size = 'sm', showDot = true, className }: ServiceChipProps) {
  const config = SERVICE_CONFIG[service]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-ui font-semibold rounded-xs',
        size === 'sm' ? 'text-caption px-2 py-0.5' : 'text-body-sm px-2.5 py-1',
        config.classes,
        className,
      )}
    >
      {showDot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dot)} />}
      {config.label}
    </span>
  )
}
