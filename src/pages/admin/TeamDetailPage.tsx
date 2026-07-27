import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Users, Crown, CalendarCheck, LayoutTemplate, UserCircle } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Avatar } from '../../components/ui/Avatar'
import { Skeleton } from '../../components/ui/Skeleton'
import { PersonLink } from '../../components/shared/PersonLink'
import { RoleBadge } from '../../components/shared/RoleBadge'
import { ServiceChip } from '../../components/shared/ServiceChip'
import { TeamAttendancePanel } from '../../components/shared/TeamAttendancePanel'
import { TeamTemplatesTab } from './TeamTemplatesTab'
import { useTeams } from '../../hooks/useTeams'
import { useTeamMembers } from '../../hooks/useTeamMembers'
import { usePeople } from '../../hooks/usePeople'
import { useAuthContext } from '../../context/AuthContext'
import { useCanAccess } from '../../hooks/useRoleFlags'
import { toUserRole } from '../../lib/peopleAccess'
import { cn } from '../../lib/cn'

type Tab = 'overview' | 'attendance' | 'templates'

/**
 * One team, three tabs. Overview is open to every internal user (the directory is
 * public); Attendance is for the people who supervise the team; Templates is a
 * management tool and stays with the lead, PMs on the team, and admins.
 */
export default function TeamDetailPage() {
  const { id = '' } = useParams()
  const { profile } = useAuthContext()
  const [tab, setTab] = useState<Tab>('overview')

  const { data: teams = [], isLoading } = useTeams()
  const { data: teamMembers = [] } = useTeamMembers()
  const { data: people = [] } = usePeople()
  const canManageAttendance = useCanAccess('can_manage_attendance')

  const team = teams.find((t) => t.id === id)
  const memberIds = useMemo(
    () => new Set(teamMembers.filter((tm) => tm.team_id === id).map((tm) => tm.profile_id)),
    [teamMembers, id],
  )
  const members = people.filter((p) => memberIds.has(p.id))
  const lead = people.find((p) => p.id === team?.lead_id)

  const role = profile?.role
  const isLead = !!profile && team?.lead_id === profile.id
  const isOnTeam = !!profile && memberIds.has(profile.id)
  const isAdmin = role === 'super_admin' || role === 'admin'

  // Supervisors of this team see its attendance; HR/admin see every team's.
  const canSeeAttendance = isAdmin || canManageAttendance || isLead || role === 'project_manager'
  // Templates: the team's lead, a PM staffed on the team, or an admin — mirrors
  // can_manage_team_templates() in SQL, so the tab never shows an empty list.
  const canSeeTemplates = isAdmin || isLead || (role === 'project_manager' && isOnTeam)

  const tabs: { key: Tab; label: string; icon: typeof Users; visible: boolean }[] = [
    { key: 'overview',   label: 'Overview',   icon: Users,          visible: true },
    { key: 'attendance', label: 'Attendance', icon: CalendarCheck,  visible: canSeeAttendance },
    { key: 'templates',  label: 'Templates',  icon: LayoutTemplate, visible: canSeeTemplates },
  ]
  const visibleTabs = tabs.filter((t) => t.visible)
  const activeTab = visibleTabs.some((t) => t.key === tab) ? tab : 'overview'

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1">
        <Topbar title="Team" back="/teams" />
        <div className="p-4 lg:px-8 lg:py-7 space-y-3"><Skeleton className="h-28" /><Skeleton className="h-64" /></div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="flex flex-col flex-1">
        <Topbar title="Team" back="/teams" />
        <div className="p-10 text-center font-ui text-text-3">Team not found.</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title={team.name} back="/teams" />
      <div className="p-4 lg:px-8 lg:py-7 flex flex-col gap-5">
        {/* Header */}
        <div className="rounded-xl border border-border-default bg-surface-1 p-5">
          <div className="flex flex-wrap items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface-2 text-service-dev">
              <Users size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-[20px] font-bold text-text-1">{team.name}</h1>
                <ServiceChip service={team.service_type} />
              </div>
              <p className="mt-1 font-mono text-[11px] text-text-4">
                {members.length} member{members.length === 1 ? '' : 's'}
              </p>
            </div>
            {lead && (
              <div className="flex items-center gap-2.5 rounded-md border border-border-subtle bg-bg-base/35 px-3 py-2.5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-coin-gold/10 text-coin-gold">
                  <Crown size={14} />
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-[9.5px] font-semibold uppercase tracking-wider text-text-4">Team lead</p>
                  <PersonLink personId={lead.id} className="block truncate font-ui text-[12.5px] font-semibold text-text-1">
                    {lead.name}
                  </PersonLink>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        {visibleTabs.length > 1 && (
          <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-border-default bg-surface-1 p-1 no-scrollbar">
            {visibleTabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 h-8 font-ui text-[12.5px] font-medium transition-colors',
                  activeTab === key ? 'bg-surface-3 text-text-1 shadow-sm' : 'text-text-3 hover:text-text-1',
                )}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'overview' && (
          <section className="overflow-hidden rounded-xl border border-border-default bg-surface-1">
            <div className="border-b border-border-subtle px-5 py-3">
              <h2 className="flex items-center gap-2 font-display text-[14px] font-bold text-text-1">
                <Users size={15} className="text-text-3" /> Members
                <span className="font-mono text-[11px] font-normal text-text-4">{members.length}</span>
              </h2>
            </div>
            {members.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <span className="flex size-11 items-center justify-center rounded-full bg-surface-2 text-text-3"><UserCircle size={19} /></span>
                <p className="font-ui text-[13px] text-text-2">Nobody on this team yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-2/40 px-3 py-2.5">
                    <Avatar name={m.name} src={m.avatar_url ?? undefined} size="sm" personId={m.id} />
                    <div className="min-w-0 flex-1">
                      <PersonLink personId={m.id} className="block truncate font-ui text-[13px] font-medium text-text-1">
                        {m.name}
                      </PersonLink>
                      {m.id === team.lead_id && (
                        <span className="font-mono text-[10px] text-coin-gold">Team lead</span>
                      )}
                    </div>
                    <RoleBadge role={toUserRole(m.role)} />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'attendance' && canSeeAttendance && (
          <TeamAttendancePanel memberIds={memberIds} title={`${team.name} attendance`} />
        )}

        {activeTab === 'templates' && canSeeTemplates && (
          <TeamTemplatesTab
            teamId={team.id}
            teamServiceSlug={team.service_type}
            // The SQL says the same thing; this only decides whether buttons render.
            canEdit={canSeeTemplates}
          />
        )}
      </div>
    </div>
  )
}
