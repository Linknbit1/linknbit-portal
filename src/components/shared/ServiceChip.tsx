import { cn } from '../../lib/cn'
import { useServices } from '../../hooks/useServices'

// Fallback colours for the seeded services, so chips render correctly even
// before the services query resolves (and on mock pages without live data).
const FALLBACK: Record<string, { name: string; color: string }> = {
  design: { name: 'Design', color: '#A78BFA' },
  development: { name: 'Development', color: '#22D3EE' },
  marketing: { name: 'Marketing', color: '#FBBF24' },
}
const NEUTRAL = '#8A93A3'

interface ServiceChipProps {
  /** A service slug (e.g. "design"). Colour + label resolve from the services table. */
  service: string
  showDot?: boolean
  className?: string
}

export function ServiceChip({ service, showDot = true, className }: ServiceChipProps) {
  const { data: services } = useServices()
  const match = services?.find((s) => s.slug === service)
  const fallback = FALLBACK[service]
  const name = match?.name ?? fallback?.name ?? service
  const color = match?.color ?? fallback?.color ?? NEUTRAL

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 py-0.75 px-2.25 rounded-full font-ui font-semibold text-[10.5px] uppercase tracking-[0.04em] leading-[1.4] whitespace-nowrap border border-transparent',
        className,
      )}
      // Dynamic per-service colour — the sanctioned inline-style case (value can't be a token).
      style={{ color, backgroundColor: `${color}1F` }}
    >
      {showDot && <span className="size-1.25 rounded-full bg-current shrink-0" />}
      {name}
    </span>
  )
}
