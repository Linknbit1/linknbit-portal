import { useMemo, useState } from 'react'
import { Search, Users, UserCheck, Info } from 'lucide-react'
import { Topbar } from '../components/layout/Topbar'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Select } from '../components/ui/Select'
import { Toggle } from '../components/ui/Toggle'
import { Skeleton } from '../components/ui/Skeleton'
import { RoleBadge } from '../components/shared/RoleBadge'
import { ProfileRoles } from '../components/shared/ProfileRoles'
import { StandupTabs } from '../components/shared/StandupTabs'
import { toUserRole } from '../lib/peopleAccess'
import { useToast } from '../components/ui/toast-context'
import { usePeople } from '../hooks/usePeople'
import {
  useStandupRoleSettings, useStandupParticipants,
  useSetStandupRoleRequirement, useSetStandupParticipation,
} from '../hooks/useStandups'
import type { ParticipationMode } from '../api/standups'
import { PersonLink } from '../components/shared/PersonLink'

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

export default function StandupSettingsPage() {
  const toast = useToast()
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
    <div className="flex flex-col flex-1">
      <Topbar title="Standup Settings" />
      <div className="p-4 lg:px-8 lg:py-7 flex flex-col gap-6">
        <div>
          <h2 className="font-display font-bold text-[22px] text-text-1">Standup Settings</h2>
          <p className="font-ui text-[13px] text-text-3">
            Who has to submit a daily standup. Set a default per role, then make exceptions per person.
          </p>
        </div>

        <StandupTabs />

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
        ) : (
          <>
            {/* ── Role defaults ─────────────────────────────────────────────── */}
            <section className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
              <header className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border-subtle">
                <Users size={15} className="text-brand-red shrink-0" />
                <h3 className="font-display font-bold text-[15px] text-text-1">Required by role</h3>
                <span className="font-mono text-[10.5px] text-text-4 uppercase tracking-wider">Default</span>
              </header>

              <div className="divide-y divide-border-subtle">
                {ROLE_ORDER.filter((role) => roleRequired.has(role)).map((role) => (
                  <div key={role} className="flex items-center gap-3 px-4 py-3">
                    <RoleBadge role={toUserRole(role)} />
                    <span className="font-ui text-[12.5px] text-text-3 flex-1 min-w-0 truncate">
                      {roleRequired.get(role)
                        ? `Every ${ROLE_LABEL[role] ?? role} submits a standup`
                        : `${ROLE_LABEL[role] ?? role}s are not asked for a standup`}
                    </span>
                    <Toggle
                      checked={roleRequired.get(role) ?? false}
                      onChange={(v) => handleRole(role, v)}
                      disabled={setRole.isPending}
                      label={`Standup required for ${ROLE_LABEL[role] ?? role}`}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* ── Per-person overrides ──────────────────────────────────────── */}
            <section className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
              <header className="flex flex-wrap items-center gap-3 px-4 py-3.5 border-b border-border-subtle">
                <UserCheck size={15} className="text-brand-red shrink-0" />
                <h3 className="font-display font-bold text-[15px] text-text-1">People</h3>
                <Badge variant="success">{requiredCount} submitting</Badge>
                <div className="ml-auto relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-4 pointer-events-none" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search people…"
                    aria-label="Search people"
                    className="h-8 w-48 bg-surface-inset border border-border-default rounded-sm pl-7.5 pr-2.5 font-ui text-[12px] text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus"
                  />
                </div>
              </header>

              <div className="flex items-start gap-2 px-4 py-2.5 bg-surface-2/40 border-b border-border-subtle">
                <Info size={12} className="text-text-4 shrink-0 mt-0.5" />
                <p className="font-ui text-[11.5px] text-text-4">
                  "Follow role" uses the defaults above. Setting a person to Required or Excluded overrides
                  their role — useful for exempting one person or pulling a lead into the routine.
                </p>
              </div>

              {roster.length === 0 ? (
                <div className="py-12 text-center font-ui text-[13px] text-text-4">No people match that search.</div>
              ) : (
                <div className="divide-y divide-border-subtle">
                  {roster.map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                      <Avatar name={p.name} src={p.avatar_url ?? undefined} size="sm" personId={p.id} />
                      <div className="min-w-0 flex-1">
                        <PersonLink personId={p.id} className="block truncate font-ui text-[13px] font-medium text-text-1">{p.name}</PersonLink>
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
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
