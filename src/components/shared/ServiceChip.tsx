import { cn } from '../../lib/cn'
import type { ServiceType } from '../../types'

const SERVICE_CONFIG = {
  design: {
    label: 'Design',
    classes: 'bg-[rgba(167,139,250,0.12)] text-[#C4B5FD]',
  },
  development: {
    label: 'Development',
    classes: 'bg-[rgba(34,211,238,0.12)] text-[#67E8F9]',
  },
  marketing: {
    label: 'Marketing',
    classes: 'bg-[rgba(251,191,36,0.12)] text-[#FCD34D]',
  },
} as const

interface ServiceChipProps {
  service: ServiceType
  showDot?: boolean
  className?: string
}

export function ServiceChip({ service, showDot = true, className }: ServiceChipProps) {
  const config = SERVICE_CONFIG[service]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-[6px] py-[3px] px-[9px] rounded-full font-ui font-semibold text-[10.5px] uppercase tracking-[0.04em] leading-[1.4] whitespace-nowrap border border-transparent',
        config.classes,
        className,
      )}
    >
      {showDot && <span className="w-[5px] h-[5px] rounded-full bg-current flex-shrink-0" />}
      {config.label}
    </span>
  )
}
