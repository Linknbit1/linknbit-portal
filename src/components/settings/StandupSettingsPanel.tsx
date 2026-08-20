import { useMemo, useState } from 'react'
import { Search, Users, UserCheck } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Select } from '../ui/Select'
import { Toggle } from '../ui/Toggle'
import { Skeleton } from '../ui/Skeleton'
import { RoleBadge } from '../shared/RoleBadge'
import { ProfileRoles } from '../shared/ProfileRoles'
import { PersonLink } from '../shared/PersonLink'
import { toUserRole } from '../../lib/peopleAccess'
import { useToast } from '../ui/toast-context'
import { usePeople } from '../../hooks/usePeople'
import {
  useStandupRoleSettings, useStandupParticipants,
  useSetStandupRoleRequirement, useSetStandupParticipation,
} from '../../hooks/useStandups'
import { useCanAccess } from '../../hooks/useRoleFlags'
import type { ParticipationMode } from '../../api/standups'
import { StandupRulesPanel } from './StandupRulesPanel'
import { SettingsGroup } from './SettingsPrimitives'

/** Client roles never appear here — standups are an internal ritual. */
const ROLE_ORDER = ['employee', 'team_lead', 'project_manager', 'hr', 'admin', 'super_admin', 'finance']

const ROLE_LABEL: Record<string, string> = {
  employee: 'Employee', team_lead: 'Team Lead', project_manager: 'Project Manager',
  hr: 'HR', admin: 'Admin', super_admin: 'Super Admin', finance: 'Finance',
}

const MODE_OPTIONS = [
  { value: 'inherit', label: 'Follow role' },
  { value: 'required', label: 'Required' },
  { value: 'excluded', label: 'Excluded' },
]

/**
 * Everything that governs standups: the rules first, then who has to submit one.
 *
 * Rules before people on purpose — the participation list is long, and burying
 * the four numbers that decide how the ritual behaves underneath it is what
 * made them hard to find in the first place.
 */
export function StandupSettingsPanel() {
  const toast = useToast()
  const canEdit = useCanAccess('can_manage_standups')
  const [search, setSearch] = useState('')

  const { data: people = [], isLoading: peopleLoading } = usePeople()
  const { data: roleSettings = [], isLoading: rolesLoading } = useStandupRoleSettings()
  const { data: overrides = [], isLoading: overridesLoading } = useStandupParticipants()

  const setRole = useSetStandupRoleRequirement()
  const setParticipation = useSetStandupParticipation()

  const roleRequired = useMemo(
    () => new Map(roleSettings.map((r) => [r.role, r.is_required])),
    [roleSettings],
  )
  const overrideByProfile = useMemo(
    () => new Map(overrides.map((o) => [o.profile_id, o.is_required])),
    [overrides],
  )

  const roster = useMemo(() => {
    const term = search.trim().toLowerCase()
    return people
      .filter((p) => p.is_active)
      .filter((p) => !term || p.name.toLowerCase().includes(term))
      .map((p) => {
        const override = overrideByProfile.get(p.id)
        const mode: ParticipationMode =
          override === undefined ? 'inherit' : override ? 'required' : 'excluded'
        const effective = override ?? roleRequired.get(p.role) ?? false
        return { ...p, mode, effective }
      })
      .sort((a, b) => Number(b.effective) - Number(a.effective) || a.name.localeCompare(b.name))
  }, [people, search, overrideByProfile, roleRequired])

  const requiredCount = roster.filter((p) => p.effective).length
  const isLoading = peopleLoading || rolesLoading || overridesLoading

  const handleRole = (role: string, required: boolean) => {
    setRole.mutate({ role, required }, {
      onError: (e) => toast(e instanceof Error ? e.message : 'Could not update the role default', 'error'),
    })
  }

  const handleMode = (profileId: string, mode: string) => {
    if (mode !== 'inherit' && mode !== 'required' && mode !== 'excluded') return
    setParticipation.mutate({ profileId, mode }, {
      onError: (e) => toast(e instanceof Error ? e.message : 'Could not update this person', 'error'),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <StandupRulesPanel canEdit={canEdit} />

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <SettingsGroup
            icon={Users}
            title="Required by role"
            description="The default for everyone with that role. Individual people can override it below."
          >
            <div className="-mx-4 -my-1 divide-y divide-border-subtle">
              {ROLE_ORDER.filter((role) => roleRequired.has(role)).map((role) => (
                <div key={role} className="flex items-center gap-3 px-4 py-3">
                  <RoleBadge role={toUserRole(role)} />
                  <span className="min-w-0 flex-1 truncate font-ui text-[12.5px] text-text-3">
                    {roleRequired.get(role)
                      ? `Every ${ROLE_LABEL[role] ?? role} submits a standup`
                      : `${ROLE_LABEL[role] ?? role}s are not asked for a standup`}
                  </span>
                  <Toggle
                    checked={roleRequired.get(role) ?? false}
                    onChange={(v) => handleRole(role, v)}
                    disabled={setRole.isPending || !canEdit}
                    label={`Standup required for ${ROLE_LABEL[role] ?? role}`}
                  />
                </div>
              ))}
            </div>
          </SettingsGroup>

          <SettingsGroup
            icon={UserCheck}
            title="People"
            description="“Follow role” uses the defaults above. Required or Excluded overrides them for one person."
          >
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="success">{requiredCount} submitting</Badge>
              <div className="relative ml-auto">
                <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-4" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search people…"
                  aria-label="Search people"
                  className="h-8 w-48 rounded-sm border border-border-default bg-surface-inset pl-7.5 pr-2.5 font-ui text-[12px] text-text-1 outline-none placeholder:text-text-4 focus:border-border-focus"
                />
              </div>
            </div>

            {roster.length === 0 ? (
              <p className="py-8 text-center font-ui text-[13px] text-text-4">No people match that search.</p>
            ) : (
              <div className="-mx-4 max-h-112 divide-y divide-border-subtle overflow-y-auto">
                {roster.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                    <Avatar name={p.name} src={p.avatar_url ?? undefined} size="sm" personId={p.id} />
                    <div className="min-w-0 flex-1">
                      <PersonLink personId={p.id} className="block truncate font-ui text-[13px] font-medium text-text-1">
                        {p.name}
                      </PersonLink>
                      <p className="font-mono text-[10px] text-text-4">
                        {p.effective ? 'Submits a standup' : 'No standup required'}
                        {p.mode !== 'inherit' && ' · overridden'}
                      </p>
                    </div>
                    <ProfileRoles profileId={p.id} fallbackRole={p.role} />
                    <Select
                      value={p.mode}
                      onChange={(v) => handleMode(p.id, v)}
                      options={MODE_OPTIONS}
                      size="sm"
                      className="w-36"
                      disabled={!canEdit}
                    />
                  </div>
                ))}
              </div>
            )}
          </SettingsGroup>
        </>
      )}
    </div>
  )
}
