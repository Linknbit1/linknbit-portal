import { UserRound, Users } from 'lucide-react'
import { useScope } from '../../context/ScopeContext'

const DESCRIPTION = {
  mine: 'showing only work assigned to or tagging you',
  team: 'showing only work belonging to your teams',
} as const

/**
 * Says out loud that the list is filtered, with a one-click way out.
 *
 * Without it, a narrowed scope on a board you have nothing on just looks like an
 * empty board — and the only clue is a small control up in the Topbar.
 *
 * Nothing is said when the scope is already as wide as the role goes: for an
 * employee "Mine" is not a filter they forgot to clear, it is what the screen
 * is, and a permanent banner offering a view they cannot open is worse than
 * silence.
 */
export function ScopeNotice({ shown, total }: { shown?: number; total?: number }) {
  const { scope, setScope, maxScope } = useScope()
  if (scope === 'everyone' || scope === maxScope) return null

  const Icon = scope === 'mine' ? UserRound : Users
  // The count is what proves the filter is doing something. Without it, a view
  // where you happen to own most of the work looks identical to no filter at all.
  const hasCounts = shown !== undefined && total !== undefined

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand-red/30 bg-brand-red/8 px-3 py-2">
      <Icon size={14} className="shrink-0 text-brand-red" />
      <span className="font-ui text-[12px] text-text-2">
        <strong className="text-text-1">{scope === 'mine' ? 'Mine' : 'My team'}</strong> —{' '}
        {DESCRIPTION[scope]}
        {hasCounts && (
          <>
            {' '}(<strong className="text-text-1">{shown}</strong> of {total})
          </>
        )}
        .
      </span>
      <button
        onClick={() => setScope(maxScope)}
        className="ml-auto rounded-sm px-2 py-0.5 font-ui text-[11.5px] font-semibold text-brand-red transition-colors hover:bg-brand-red/12"
      >
        {maxScope === 'everyone' ? 'Show everyone' : 'Show my teams'}
      </button>
    </div>
  )
}
