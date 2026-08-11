import { UserRound } from 'lucide-react'
import { useMeMode } from '../../context/MeModeContext'

/**
 * Says out loud that the list is filtered, with a one-click way out.
 *
 * Without it, Me Mode on a task you are not assigned to just looks like an empty
 * board — and the only clue is a small toggle in the Topbar.
 */
export function MeModeNotice({ shown, total }: { shown?: number; total?: number }) {
  const { enabled, setEnabled } = useMeMode()
  if (!enabled) return null

  // The count is what proves the filter is doing something. Without it, a view
  // where you happen to own most of the work looks identical to no filter at all.
  const hasCounts = shown !== undefined && total !== undefined

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand-red/30 bg-brand-red/8 px-3 py-2">
      <UserRound size={14} className="shrink-0 text-brand-red" />
      <span className="font-ui text-[12px] text-text-2">
        <strong className="text-text-1">Me Mode</strong> — showing only tasks assigned to or tagging you
        {hasCounts && (
          <>
            {' '}(<strong className="text-text-1">{shown}</strong> of {total})
          </>
        )}
        .
      </span>
      <button
        onClick={() => setEnabled(false)}
        className="ml-auto rounded-sm px-2 py-0.5 font-ui text-[11.5px] font-semibold text-brand-red transition-colors hover:bg-brand-red/12"
      >
        Show everyone
      </button>
    </div>
  )
}
