import { cn } from '../../lib/cn'
import { isUserRole, toUserRole } from '../../lib/peopleAccess'
import { ROLE_LABELS } from '../../lib/utils'
import { useRolesByProfile } from '../../hooks/usePermissions'
import { CustomRoleBadge, RoleBadge } from './RoleBadge'

interface ProfileRolesProps {
  profileId: string
  /**
   * The person's `profiles.role`, shown on its own when they hold no
   * `profile_roles` rows at all — client accounts never get any.
   */
  fallbackRole?: string | null
  size?: 'sm' | 'md'
  /** `text` renders the names inline (" · " separated) for tight spots like the topbar. */
  variant?: 'badge' | 'text'
  className?: string
}

/**
 * Every role a person holds, highest authority first.
 *
 * Reads straight from the shared role catalogues rather than taking them as
 * props: both are cached for five minutes and TanStack Query dedupes them, so a
 * badge this small would otherwise have to be threaded through every page that
 * shows a person.
 */
export function ProfileRoles({
  profileId, fallbackRole, size = 'sm', variant = 'badge', className,
}: ProfileRolesProps) {
  const held = useRolesByProfile().get(profileId) ?? []

  if (variant === 'text') {
    const names = held.length
      ? held.map((r) => r.name)
      : fallbackRole
        ? [ROLE_LABELS[toUserRole(fallbackRole)]]
        : []
    return names.length ? <span className={className}>{names.join(' · ')}</span> : null
  }

  if (!held.length) {
    return fallbackRole
      ? <RoleBadge role={toUserRole(fallbackRole)} size={size} className={className} />
      : null
  }

  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1', className)}>
      {held.map((r) => isUserRole(r.slug)
        ? <RoleBadge key={r.id} role={r.slug} size={size} />
        : <CustomRoleBadge key={r.id} name={r.name} color={r.color} size={size} />)}
    </span>
  )
}
