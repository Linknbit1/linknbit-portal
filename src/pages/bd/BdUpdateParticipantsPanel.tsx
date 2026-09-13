import { Users } from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar'
import { Select } from '../../components/ui/Select'
import { useToast } from '../../components/ui/toast-context'
import { RoleBadge } from '../../components/shared/RoleBadge'
import { cn } from '../../lib/cn'
import { toUserRole } from '../../lib/peopleAccess'
import { useBdUpdateParticipants, useSetBdUpdateParticipant } from '../../hooks/useBd'
import { EmptyState } from './DailyUpdatesPage'
import type { BdUpdateParticipationMode } from '../../types'

const MODE_OPTIONS = [
  { value: 'inherit', label: 'Follow their role' },
  { value: 'required', label: 'Always required' },
  { value: 'excluded', label: 'Never required' },
]

function toMode(value: string): BdUpdateParticipationMode {
  return value === 'required' || value === 'excluded' ? value : 'inherit'
}

/**
 * Who has to file a BD daily update.
 *
 * The default comes from the `can_submit_bd_updates` permission, granted to the
 * Business Development and BD Manager roles in Settings → Roles. This screen is
 * only the per-person exception on top of it, which is why the effective answer
 * is shown beside every row rather than only the override: reading "Follow their
 * role" tells you nothing on its own.
 *
 * Deliberately not a role list. Admins and super admins can open and read the
 * module, and neither is chased for a check-in unless somebody sets one here.
 */
export function BdUpdateParticipantsPanel() {
  const toast = useToast()
  const { data: people = [], isPending } = useBdUpdateParticipants()
  const { mutate: setMode, isPending: saving } = useSetBdUpdateParticipant()

  const required = people.filter((p) => p.isRequired)

  if (isPending) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg border border-border-default bg-surface-1" />
        ))}
      </div>
    )
  }

  if (people.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Nobody to configure"
        body="This list shows active internal members. Grant a role that carries “Submit BD daily updates” to set the default."
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 px-0.5">
        <h3 className="font-ui text-[11px] font-semibold uppercase tracking-widest text-text-4">
          Who files daily updates
        </h3>
        <span className="font-mono text-[11px] text-text-4">
          {required.length} of {people.length} required
        </span>
      </div>

      <p className="font-ui text-[12.5px] text-text-3">
        The default follows the <span className="text-text-2">Submit BD daily updates</span> permission.
        Use this only for exceptions — somebody covering the desk for a month, or a
        business developer who reports elsewhere.
      </p>

      <div className="flex flex-col gap-2">
        {people.map((person) => (
          <div
            key={person.profileId}
            className={cn(
              'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-surface-1 px-4 py-3',
              person.isRequired ? 'border-border-default' : 'border-border-subtle',
            )}
          >
            <Avatar name={person.name} src={person.avatarUrl ?? undefined} size="sm" />
            <div className="min-w-0">
              <p className="truncate font-ui text-[13px] font-semibold text-text-1">{person.name}</p>
              <p className="font-mono text-[10.5px] text-text-4">
                {person.isRequired ? 'Files a daily update' : 'Not required'}
                {person.override !== 'inherit' && ' · set here'}
                {person.override === 'inherit' && person.hasGrant && ' · from their role'}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <RoleBadge role={toUserRole(person.role)} />
              <Select
                value={person.override}
                onChange={(value) => setMode(
                  { profileId: person.profileId, mode: toMode(value) },
                  {
                    onSuccess: () => toast(`Updated ${person.name}`, 'success'),
                    onError: () => toast('Could not change that. Try again.', 'error'),
                  },
                )}
                options={MODE_OPTIONS}
                size="sm"
                className="w-44"
                disabled={saving}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
