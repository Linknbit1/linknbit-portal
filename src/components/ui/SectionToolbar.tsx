import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface SectionToolbarProps {
  icon: LucideIcon
  title: string
  description?: string
  /** Small count pill shown next to the title (e.g. pending requests). */
  badge?: number
  /** Right-aligned filters / actions (Select, Button, …). */
  children?: ReactNode
  className?: string
}

/**
 * The shared header for a panel/table section: icon + title (+ optional description
 * and count badge) on the left, actions on the right. Wraps gracefully on narrow
 * screens — the title never breaks to two lines and actions reflow as a group.
 */
export function SectionToolbar({ icon: Icon, title, description, badge, children, className }: SectionToolbarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 px-4 lg:px-5 py-3 border-b border-border-subtle', className)}>
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        <Icon size={14} className="text-text-3 shrink-0" />
        <span className="font-ui font-semibold text-[13px] text-text-1 whitespace-nowrap">{title}</span>
        {badge != null && badge > 0 && (
          <span className="min-w-4.5 h-4.5 px-1 rounded-full bg-warning text-[10px] font-bold text-amber-900 flex items-center justify-center shrink-0">
            {badge}
          </span>
        )}
      </div>
      {description && (
        <span className="font-ui text-[12px] text-text-4 min-w-0 truncate">{description}</span>
      )}
      {children && (
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2 shrink-0">{children}</div>
      )}
    </div>
  )
}
