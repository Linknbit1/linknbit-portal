import { cn } from '../../lib/cn'
import { ROLE_LABELS } from '../../lib/utils'
import type { UserRole } from '../../types'

const ROLE_CONFIG: Record<UserRole, string> = {
  super_admin: 'text-role-super-admin bg-role-super-admin/10 border border-role-super-admin/30',
  admin: 'text-role-admin bg-role-admin/10 border border-role-admin/30',
  project_manager: 'text-role-pm bg-role-pm/10 border border-role-pm/30',
  team_lead: 'text-role-lead bg-role-lead/10 border border-role-lead/30',
  employee: 'text-role-employee bg-surface-2 border border-border-default',
  client_owner: 'text-role-client bg-role-client/10 border border-role-client/30',
  client_member: 'text-role-client-member bg-surface-2 border border-border-default',
}

interface RoleBadgeProps {
  role: UserRole
  size?: 'sm' | 'md'
  className?: string
}

export function RoleBadge({ role, size = 'sm', className }: RoleBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-mono font-semibold rounded-xs uppercase tracking-wider',
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-caption px-2 py-1',
        ROLE_CONFIG[role],
        className,
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  )
}
