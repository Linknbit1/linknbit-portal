import { Link } from 'react-router-dom'
import { Mail, Phone, BadgeCheck, Briefcase, Users as UsersIcon, CalendarDays, type LucideIcon } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { ProfileRoles } from './ProfileRoles'
import { StartDMButton } from '../chat/StartDMButton'
import { usePerson, usePersonTeams } from '../../hooks/usePeople'
import { useDesignations } from '../../hooks/useDesignations'
import { cn } from '../../lib/cn'

interface UserProfileBodyProps {
  profileId: string
  /** Shown while the full record loads, so the card never renders empty. */
  fallbackName?: string
  fallbackAvatar?: string | null
  /** Card is the compact popover variant; panel is the wider sidebar one. */
  variant?: 'card' | 'panel'
  onNavigate?: () => void
}

/**
 * The shared "who is this person" block — used both by the conversation info
 * sidebar and by the popover card that opens from a message avatar, so the two
 * can never drift apart.
 */
export function UserProfileBody({
  profileId, fallbackName, fallbackAvatar, variant = 'panel', onNavigate,
}: UserProfileBodyProps) {
  const { data: person } = usePerson(profileId)
  const { data: teams = [] } = usePersonTeams(profileId)
  const { data: designations = [] } = useDesignations()

  const designation = person?.designation_id
    ? designations.find((d) => d.id === person.designation_id)?.name ?? null
    : null

  const name = person?.name ?? fallbackName ?? 'Unknown'
  const memberSince = person?.created_at
    ? new Date(person.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' })
    : null

  const isCard = variant === 'card'

  return (
    <div className={cn('flex flex-col', isCard ? 'items-start text-left' : 'items-center text-center')}>
      {/* No status dot: we don't track presence, and wiring it to is_active
          would read as "offline" when it actually means "deactivated". */}
      <Avatar name={name} src={person?.avatar_url ?? fallbackAvatar ?? undefined} size="xl" />

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <h3 className={cn('font-display font-bold text-text-1', isCard ? 'text-[16px]' : 'text-[17px]')}>
          {name}
        </h3>
        {person && !person.is_active && (
          <span className="rounded-full bg-error/10 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-error">
            Deactivated
          </span>
        )}
      </div>

      {person && <ProfileRoles profileId={person.id} fallbackRole={person.role} className="mt-1.5" />}

      {person?.job_title && (
        <p className="mt-2 flex items-center gap-1.5 font-ui text-[12.5px] text-text-2">
          <Briefcase size={12} className="shrink-0 text-text-4" /> {person.job_title}
        </p>
      )}

      <div className={cn('mt-3 flex w-full flex-col gap-1.5 border-t border-border-subtle pt-3 text-left')}>
        {person?.email && (
          <InfoRow icon={Mail}>
            <a href={`mailto:${person.email}`} className="truncate transition-colors hover:text-text-1">{person.email}</a>
          </InfoRow>
        )}
        {person?.phone && (
          <InfoRow icon={Phone}>
            <a href={`tel:${person.phone}`} className="truncate transition-colors hover:text-text-1">{person.phone}</a>
          </InfoRow>
        )}
        {designation && <InfoRow icon={BadgeCheck}>{designation}</InfoRow>}
        {teams.length > 0 && <InfoRow icon={UsersIcon}>{teams.map((t) => t.name).join(', ')}</InfoRow>}
        {memberSince && <InfoRow icon={CalendarDays}>Member since {memberSince}</InfoRow>}
      </div>

      <div className="mt-3 flex w-full flex-col gap-1.5">
        {person && (
          <StartDMButton
            profileId={person.id}
            name={person.name}
            role={person.role}
            variant="button"
            className="w-full justify-center"
          />
        )}
        <Link
          to={`/members/${profileId}`}
          onClick={onNavigate}
          className="w-full rounded-sm border border-border-default px-3 py-1.5 text-center font-ui text-[12px] font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text-1"
        >
          View full profile
        </Link>
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 font-ui text-[12px] text-text-3">
      <Icon size={12} className="shrink-0 text-text-4" />
      <span className="min-w-0 truncate">{children}</span>
    </p>
  )
}
