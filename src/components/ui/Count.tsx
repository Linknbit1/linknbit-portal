import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

interface CountProps {
  value: number
  /** Optional glyph before the number — says what is being counted at a glance. */
  icon?: LucideIcon
  /** Spelled out for screen readers and the hover tooltip ("3 members"). */
  label?: string
  /** Draw attention: an amber pill for things waiting on someone. */
  tone?: 'default' | 'attention'
  className?: string
}

/**
 * The number that sits next to a label — task counts, member counts, "5 files".
 *
 * These were written ad hoc wherever they were needed, and had drifted to bare
 * text in `text-text-4`, the dimmest token in the palette. At 10px on a dark
 * surface that is close to invisible, which is the opposite of what a count is
 * for: it exists to be read at a glance.
 *
 * So: a pill with its own background, a readable foreground, and tabular figures
 * so columns of numbers line up. Zero keeps the quiet treatment — "nothing here"
 * should recede, while any real number stands out against it.
 */
export function Count({ value, icon: Icon, label, tone = 'default', className }: CountProps) {
  const empty = value === 0
  const title = label ?? undefined

  return (
    <span
      title={title}
      aria-label={title}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[10.5px] font-semibold leading-none tabular-nums',
        empty
          ? 'border-border-subtle bg-surface-2/50 text-text-4'
          : tone === 'attention'
            ? 'border-warning/25 bg-warning/10 text-warning'
            : 'border-border-default bg-surface-3 text-text-1',
        className,
      )}
    >
      {Icon && <Icon size={10} className="shrink-0 opacity-70" />}
      {value}
    </span>
  )
}
