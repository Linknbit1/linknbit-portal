import { UserRound, Users, Globe } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useScope } from '../../context/ScopeContext'
import { SCOPE_LABEL, scopesUpTo, type Scope } from '../../constants/scopes'

const SCOPE_ICON: Record<Scope, LucideIcon> = {
  mine: UserRound,
  team: Users,
  everyone: Globe,
}

const SCOPE_TITLE: Record<Scope, string> = {
  mine: 'Only work assigned to or tagging you',
  team: 'Work belonging to anyone on your teams',
  everyone: 'Everything you have access to',
}

interface ScopeSwitchProps {
  /** Icons only — for narrow rows where the labels will not fit. */
  compact?: boolean
  /** `sm` matches the h-8 filter controls; `md` stands alone. */
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Mine · My team · Everyone — the lens that says whose work a list is showing.
 *
 * Sits in each screen's own filter row rather than in the Topbar: it only
 * applies to lists of work, and global chrome implies it applies everywhere.
 * The selected segment is brand-red because a filter you have forgotten about
 * is worse than no filter.
 *
 * Only the scopes the viewer's permissions allow are offered, and someone with
 * a single option gets no switch at all — a one-button group is a control that
 * does nothing, and it advertises a view the person cannot reach.
 */
export function ScopeSwitch({ compact = false, size = 'md', className }: ScopeSwitchProps) {
  const { scope, setScope, maxScope } = useScope()
  const options = scopesUpTo(maxScope)

  if (options.length < 2) return null

  return (
    <div
      role="group"
      aria-label="Whose work to show"
      className={cn(
        'inline-flex shrink-0 items-center rounded-sm border border-border-default bg-surface-1 p-0.5',
        size === 'sm' ? 'h-8' : 'h-9',
        className,
      )}
    >
      {options.map((option) => {
        const Icon = SCOPE_ICON[option]
        const active = scope === option
        return (
          <button
            key={option}
            type="button"
            onClick={() => setScope(option)}
            aria-pressed={active}
            aria-label={SCOPE_LABEL[option]}
            title={SCOPE_TITLE[option]}
            className={cn(
              'flex h-full items-center justify-center gap-1.5 rounded-sm font-ui font-semibold transition-colors',
              size === 'sm' ? 'text-[11.5px]' : 'text-[12px]',
              compact ? 'w-8' : 'px-2.5',
              active
                ? 'bg-brand-red/12 text-brand-red'
                : 'text-text-3 hover:text-text-1',
            )}
          >
            <Icon size={size === 'sm' ? 13 : 14} className="shrink-0" />
            {!compact && SCOPE_LABEL[option]}
          </button>
        )
      })}
    </div>
  )
}
