import { cn } from '../../lib/cn'

interface DepartedBadgeProps {
  /**
   * Wording is context-dependent: a list entry states the fact ("Left"), while a
   * field that still holds this person asks for the fix ("Reassign").
   */
  label?: string
  className?: string
}

/**
 * Marks a record that still points at someone who has left the company.
 *
 * Deactivating a member hides them from every roster and picker, but the rows
 * they were attached to — a project they managed, a fingerprint enrolled on the
 * terminal — keep pointing at them on purpose: dropping the reference would
 * rewrite history and quietly turn "needs a new owner" into "nobody's problem".
 * This badge is what makes that leftover state visible instead of silent.
 */
export function DepartedBadge({ label = 'Left', className }: DepartedBadgeProps) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-xs bg-brand-red/12 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-brand-red',
        className,
      )}
    >
      {label}
    </span>
  )
}
