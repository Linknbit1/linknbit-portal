import { cn } from '../../lib/cn'
import type { AuditSeverity } from '../../types'

const SEVERITY_CONFIG: Record<AuditSeverity, { label: string; classes: string }> = {
  info:    { label: 'Info',    classes: 'bg-surface-3 text-text-2 border-border-default' },
  warning: { label: 'Warning', classes: 'bg-[rgba(251,191,36,0.12)] text-service-mkt border-[rgba(251,191,36,0.3)]' },
  danger:  { label: 'Danger',  classes: 'bg-[rgba(238,39,55,0.12)] text-brand-red border-[rgba(238,39,55,0.35)]' },
}

interface SeverityChipProps {
  // Accepts a raw string (the DB column is `text`); unknown values fall back to info.
  severity: AuditSeverity | string
  className?: string
}

export function SeverityChip({ severity, className }: SeverityChipProps) {
  const config = SEVERITY_CONFIG[severity as AuditSeverity] ?? SEVERITY_CONFIG.info

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 py-0.75 px-2.25 rounded-full font-ui font-semibold text-[10.5px] uppercase tracking-[0.04em] leading-[1.4] whitespace-nowrap border',
        config.classes,
        className,
      )}
    >
      <span className="size-1.25 rounded-full bg-current shrink-0" />
      {config.label}
    </span>
  )
}
