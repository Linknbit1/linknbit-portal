import { UserRound, Users, Globe } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useScope } from '../../context/ScopeContext'
import { SCOPES, SCOPE_LABEL, type Scope } from '../../constants/scopes'

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

/**
 * Mine · My team · Everyone — the lens that says whose work a list is showing.
 *
 * Lives in the Topbar rather than on each page so it holds across navigation,
 * and the selected segment is brand-red: a filter you have forgotten about is
 * worse than no filter. On narrow chrome it collapses to icons alone.
 */
export function ScopeSwitch({ compact = false }: { compact?: boolean }) {
  const { scope, setScope } = useScope()

  return (
    <div
      role="group"
      aria-label="Whose work to show"
      className="inline-flex h-9 shrink-0 items-center rounded-sm border border-border-default bg-surface-1 p-0.5"
    >
      {SCOPES.map((option) => {
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
              'flex h-full items-center justify-center gap-1.5 rounded-sm font-ui text-[12px] font-semibold transition-colors',
              compact ? 'w-8' : 'px-2.5',
              active
                ? 'bg-brand-red/12 text-brand-red'
                : 'text-text-3 hover:text-text-1',
            )}
          >
            <Icon size={14} className="shrink-0" />
            {!compact && SCOPE_LABEL[option]}
          </button>
        )
      })}
    </div>
  )
}
