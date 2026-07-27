import { Check } from 'lucide-react'
import { RoleBadge } from '../shared/RoleBadge'
import { cn } from '../../lib/cn'
import { toUserRole } from '../../lib/peopleAccess'
import { CHANNEL_ROLE_OPTIONS } from '../../constants/roles'

interface RolePickerProps {
  value: string[]
  onChange: (roles: string[]) => void
  /** Roles already granted, shown as locked so they aren't re-added. */
  lockedRoles?: string[]
  disabled?: boolean
}

/**
 * Grants a channel to whole roles. Selecting one adds every current holder and
 * keeps up as people join or change role.
 */
export function RolePicker({ value, onChange, lockedRoles = [], disabled }: RolePickerProps) {
  const toggle = (role: string) => {
    if (disabled || lockedRoles.includes(role)) return
    onChange(value.includes(role) ? value.filter((r) => r !== role) : [...value, role])
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {CHANNEL_ROLE_OPTIONS.map((role) => {
        const locked = lockedRoles.includes(role)
        const selected = locked || value.includes(role)
        return (
          <button
            key={role}
            type="button"
            onClick={() => toggle(role)}
            disabled={disabled || locked}
            title={locked ? 'Already added to this channel' : undefined}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2 py-1 transition-colors',
              selected
                ? 'border-brand-red/40 bg-brand-red/13'
                : 'border-border-default hover:border-border-strong',
              (disabled || locked) && 'cursor-not-allowed opacity-60',
            )}
          >
            {selected && <Check size={11} className="text-brand-red" />}
            <RoleBadge role={toUserRole(role)} size="sm" />
          </button>
        )
      })}
    </div>
  )
}
