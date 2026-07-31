import { cn } from '../../lib/cn'
import { ROLE_LABELS } from '../../lib/utils'
import type { UserRole } from '../../types'

const ROLE_CONFIG: Record<UserRole, string> = {
  super_admin: 'text-role-super-admin bg-role-super-admin/10 border border-role-super-admin/30',
  admin: 'text-role-admin bg-role-admin/10 border border-role-admin/30',
  project_manager: 'text-role-pm bg-role-pm/10 border border-role-pm/30',
  team_lead: 'text-role-lead bg-role-lead/10 border border-role-lead/30',
  employee: 'text-role-employee bg-surface-2 border border-border-default',
  hr: 'text-service-design bg-service-design/10 border border-service-design/30',
  finance: 'text-service-mkt bg-service-mkt/10 border border-service-mkt/30',
  client_owner: 'text-role-client bg-role-client/10 border border-role-client/30',
  client_member: 'text-role-client-member bg-surface-2 border border-border-default',
}

const BADGE_BASE =
  'inline-flex w-fit items-center font-mono font-semibold rounded-full uppercase tracking-wider whitespace-nowrap'

const sizeClass = (size: 'sm' | 'md') =>
  size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-caption px-2.5 py-1'

interface RoleBadgeProps {
  role: UserRole
  size?: 'sm' | 'md'
  className?: string
}

/** Badge for one of the nine built-in roles, tinted from its design token. */
export function RoleBadge({ role, size = 'sm', className }: RoleBadgeProps) {
  return (
    <span className={cn(BADGE_BASE, sizeClass(size), ROLE_CONFIG[role], className)}>
      {ROLE_LABELS[role]}
    </span>
  )
}

interface CustomRoleBadgeProps {
  name: string
  color: string | null
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Badge for a role defined in the database rather than one of the built-ins.
 *
 * Its colour is chosen by whoever created the role, so the tint is mixed inline —
 * Tailwind cannot express a value that only exists at runtime. Roles saved
 * without a colour fall back to the neutral token treatment.
 */
export function CustomRoleBadge({ name, color, size = 'sm', className }: CustomRoleBadgeProps) {
  return (
    <span
      className={cn(
        BADGE_BASE,
        sizeClass(size),
        color ? 'border' : 'text-text-2 bg-surface-2 border border-border-default',
        className,
      )}
      style={color ? {
        color,
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
        borderColor: `color-mix(in srgb, ${color} 32%, transparent)`,
      } : undefined}
    >
      {name}
    </span>
  )
}
