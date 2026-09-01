import { useMemo, useState } from 'react'
import { Check, Minus, Search, X } from 'lucide-react'
import { isInternalRole } from '../../lib/roles'
import { cn } from '../../lib/cn'
import { Input } from '../ui/Input'
import { Avatar } from '../ui/Avatar'
import { Skeleton } from '../ui/Skeleton'
import { useToast } from '../ui/toast-context'
import { usePeople } from '../../hooks/usePeople'
import {
  useParticipationModules, useParticipationOverrides, useParticipationRoleDefaults,
  useSetParticipationOverride, useSetParticipationRoleDefault,
} from '../../hooks/useParticipation'

/** What a cell is currently saying, before it is turned into a click. */
type Cell = 'in' | 'out' | 'default-in' | 'default-out'

const ROLE_ORDER = ['employee', 'team_lead', 'project_manager', 'hr', 'finance', 'admin', 'super_admin']

/**
 * Who takes part in what, in one grid.
 *
 * Attendance, standup, timesheet, the task timer and gamification each used to
 * be excluded from somewhere else, or not at all: a checkbox on the person for
 * attendance, a separate screen for standup, a permission for gamification, and
 * nothing whatsoever for the timesheet or the timer. They are one question, so
 * they get one answer.
 *
 * Two levels, the way the standup settings already worked: a default per role,
 * and a per-person exception that beats it. A cell showing the default is drawn
 * faintly, so it is obvious at a glance which of these were decided deliberately
 * and which are simply inherited.
 */
export function ParticipationMatrix() {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const { data: modules = [], isLoading: loadingModules } = useParticipationModules()
  const { data: defaults = [] } = useParticipationRoleDefaults()
  const { data: overrides = [] } = useParticipationOverrides()
  const { data: people = [], isLoading: loadingPeople } = usePeople()
  const setOverride = useSetParticipationOverride()
  const setRoleDefault = useSetParticipationRoleDefault()

  const defaultFor = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const d of defaults) map.set(`${d.module_key}:${d.role}`, d.is_required)
    return map
  }, [defaults])

  const overrideFor = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const o of overrides) map.set(`${o.module_key}:${o.profile_id}`, o.is_required)
    return map
  }, [overrides])

  const cellFor = (moduleKey: string, personId: string, role: string): Cell => {
    const own = overrideFor.get(`${moduleKey}:${personId}`)
    if (own !== undefined) return own ? 'in' : 'out'
    // Absent everywhere means yes: a module nobody has ruled on includes people.
    return (defaultFor.get(`${moduleKey}:${role}`) ?? true) ? 'default-in' : 'default-out'
  }

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return people
      .filter((p) => p.is_active && isInternalRole(p.role))
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) =>
        ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.name.localeCompare(b.name))
  }, [people, query])

  const roles = useMemo(
    () => ROLE_ORDER.filter((r) => shown.some((p) => p.role === r)),
    [shown],
  )

  /** in → out → follow the role default → in. */
  const cycle = (moduleKey: string, personId: string, current: Cell) => {
    const next = current === 'in' ? false : current === 'out' ? null : true
    setOverride.mutate(
      { moduleKey, profileId: personId, isRequired: next },
      { onError: (e) => toast(e instanceof Error ? e.message : 'Could not save that', 'error') },
    )
  }

  if (loadingModules || loadingPeople) {
    return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="font-ui text-[12.5px] text-text-3">
        Click a cell to move it between taking part, excluded, and following the role default.
        A faint mark is inherited from the role; a solid one was set for that person.
      </p>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search people…"
        iconLeft={<Search size={14} />}
        className="w-full sm:w-64"
      />

      <div className="overflow-x-auto border border-border-default bg-surface-1">
        <table className="w-full min-w-184 border-collapse">
          <thead>
            <tr className="border-b border-border-default bg-surface-2/40">
              <th className="px-4 py-2.5 text-left font-ui text-[11px] font-semibold uppercase tracking-wider text-text-3">
                Person
              </th>
              {modules.map((m) => (
                <th key={m.key} className="px-3 py-2.5 text-center font-ui text-[11px] font-semibold uppercase tracking-wider text-text-3" title={m.description ?? undefined}>
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Role defaults first: the rule most of these rows are following. */}
            {roles.map((role) => (
              <tr key={`role-${role}`} className="border-b border-border-subtle bg-surface-2/20">
                <td className="px-4 py-2 font-ui text-[12px] font-semibold text-text-2">
                  Everyone on {role.replace(/_/g, ' ')}
                </td>
                {modules.map((m) => {
                  const on = defaultFor.get(`${m.key}:${role}`) ?? true
                  return (
                    <td key={m.key} className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => setRoleDefault.mutate(
                          { moduleKey: m.key, role, isRequired: !on },
                          { onError: (e) => toast(e instanceof Error ? e.message : 'Could not save that', 'error') },
                        )}
                        aria-label={`${on ? 'Exclude' : 'Include'} ${role} from ${m.label}`}
                        className={cn(
                          'inline-flex size-6 items-center justify-center rounded-sm border transition-colors',
                          on
                            ? 'border-success/40 bg-success/12 text-success hover:bg-success/20'
                            : 'border-border-default bg-surface-2 text-text-4 hover:text-text-2',
                        )}
                      >
                        {on ? <Check size={12} /> : <X size={12} />}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}

            {shown.map((p) => (
              <tr key={p.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-2/30">
                <td className="px-4 py-2">
                  <span className="flex items-center gap-2.5">
                    <Avatar name={p.name} src={p.avatar_url ?? undefined} size="xs" personId={p.id} />
                    <span className="min-w-0">
                      <span className="block truncate font-ui text-[13px] text-text-1">{p.name}</span>
                      <span className="block font-mono text-[10px] text-text-4">{p.role.replace(/_/g, ' ')}</span>
                    </span>
                  </span>
                </td>
                {modules.map((m) => {
                  const cell = cellFor(m.key, p.id, p.role)
                  const inherited = cell.startsWith('default')
                  const on = cell === 'in' || cell === 'default-in'
                  return (
                    <td key={m.key} className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => cycle(m.key, p.id, cell)}
                        title={inherited ? `Following the ${p.role.replace(/_/g, ' ')} default` : 'Set for this person'}
                        aria-label={`${p.name}: ${m.label}`}
                        className={cn(
                          'inline-flex size-6 items-center justify-center rounded-sm border transition-colors',
                          inherited && 'opacity-40',
                          on
                            ? 'border-success/40 bg-success/12 text-success hover:bg-success/25'
                            : 'border-error/30 bg-error/10 text-error hover:bg-error/20',
                        )}
                      >
                        {on ? <Check size={12} /> : inherited ? <Minus size={12} /> : <X size={12} />}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
