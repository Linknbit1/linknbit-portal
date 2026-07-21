import { useMemo, useState } from 'react'
import { Users, Plus, X, Loader2, Pencil, UserPlus, UserMinus, Crown, Sparkles, ShieldCheck } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Avatar, AvatarGroup } from '../../components/ui/Avatar'
import { PersonLink } from '../../components/shared/PersonLink'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { ServiceChip } from '../../components/shared/ServiceChip'
import { RoleBadge } from '../../components/shared/RoleBadge'
import { useToast } from '../../components/ui/toast-context'
import { useTeams, useCreateTeam, useUpdateTeam } from '../../hooks/useTeams'
import { usePeople } from '../../hooks/usePeople'
import { useServices } from '../../hooks/useServices'
import { useDesignations } from '../../hooks/useDesignations'
import { useTeamMembers, useAddTeamMember, useRemoveTeamMember } from '../../hooks/useTeamMembers'
import type { Team } from '../../api/teams'
import type { Person } from '../../api/people'
import type { UserRole } from '../../types'
import { useCanManagePeople } from '../../hooks/useRoleFlags'
import { ModalShell } from '../../components/ui/ModalShell'

type Option = { value: string; label: string }

// ── Create / edit team modal ───────────────────────────────────────────────────

function TeamModal({ team, people, serviceOptions, onClose }: {
  team: Team | null
  people: Person[]
  serviceOptions: Option[]
  onClose: () => void
}) {
  const toast = useToast()
  const { mutate: create, isPending: creating } = useCreateTeam()
  const { mutate: update, isPending: updating } = useUpdateTeam()
  const isEdit = team !== null
  const [name, setName] = useState(team?.name ?? '')
  const [service, setService] = useState(team?.service_type ?? serviceOptions[0]?.value ?? '')
  const [leadId, setLeadId] = useState(team?.lead_id ?? '')
  const isPending = creating || updating

  // Only users who hold the Team Lead role may lead a team. Keep the current
  // lead selectable even if their role later changed, so editing doesn't drop it.
  const leadOptions = useMemo(() => {
    const eligible = people.filter((p) => p.role === 'team_lead')
    const opts = [{ value: '', label: 'No lead' }, ...eligible.map((p) => ({ value: p.id, label: p.name, avatar: { name: p.name, url: p.avatar_url } }))]
    if (team?.lead_id && !eligible.some((p) => p.id === team.lead_id)) {
      const cur = people.find((p) => p.id === team.lead_id)
      if (cur) opts.splice(1, 0, { value: cur.id, label: `${cur.name} (current)` })
    }
    return opts
  }, [people, team])

  const submit = () => {
    if (!name.trim()) return
    const payload = { name: name.trim(), service_type: service, lead_id: leadId || null }
    if (isEdit) {
      update({ id: team.id, payload }, {
        onSuccess: () => { toast('Team updated', 'success'); onClose() },
        onError: (e) => toast(e.message.includes('unique') ? 'A team with that name exists' : 'Failed to update team', 'error'),
      })
    } else {
      create(payload, {
        onSuccess: () => { toast(`Team "${name}" created`, 'success'); onClose() },
        onError: (e) => toast(e.message.includes('unique') ? 'A team with that name exists' : 'Failed to create team', 'error'),
      })
    }
  }

  return (
    <ModalShell onClose={onClose} size="md" contentClassName="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-[16px] text-text-1">{isEdit ? 'Edit Team' : 'Create Team'}</h3>
          <button onClick={onClose} className="text-text-4 hover:text-text-1"><X size={18} /></button>
        </div>
        <div className="space-y-3.5">
          <Input label="Team name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Development Pod A" inputClassName="text-[13px]" />
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Service</label>
            <Select value={service} onChange={setService} options={serviceOptions} />
          </div>
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Team lead</label>
            <Select value={leadId} onChange={setLeadId} options={leadOptions} />
            {leadOptions.length === 1 && <p className="font-mono text-[10px] text-text-4 mt-1">No users with the Team Lead role yet.</p>}
          </div>
        </div>
        <div className="flex gap-2.5 mt-5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" disabled={!name.trim() || isPending} onClick={submit}>
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} {isEdit ? 'Save' : 'Create'}
          </Button>
        </div>
    </ModalShell>
  )
}

// ── Add member modal ───────────────────────────────────────────────────────────

function AddMemberModal({ team, candidates, onClose }: {
  team: Team
  candidates: Person[]
  onClose: () => void
}) {
  const toast = useToast()
  const { mutate: addMember, isPending } = useAddTeamMember()
  const [selected, setSelected] = useState('')

  const add = () => {
    const person = candidates.find((p) => p.id === selected)
    if (!person) return
    addMember({ teamId: team.id, profileId: person.id }, {
      onSuccess: () => { toast(`${person.name} added to ${team.name}`, 'success'); onClose() },
      onError: () => toast('Failed to add member', 'error'),
    })
  }

  return (
    <ModalShell onClose={onClose} size="sm" contentClassName="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-[16px] text-text-1">Add to {team.name}</h3>
          <button onClick={onClose} className="text-text-4 hover:text-text-1"><X size={18} /></button>
        </div>
        <Select value={selected} onChange={setSelected} options={[{ value: '', label: 'Select member…' }, ...candidates.map((p) => ({ value: p.id, label: p.name, avatar: { name: p.name, url: p.avatar_url } }))]} />
        <div className="flex gap-2.5 mt-4">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" disabled={!selected || isPending} onClick={add}>
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />} Add
          </Button>
        </div>
    </ModalShell>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const toast = useToast()
  const canManage = useCanManagePeople()

  const { data: teams = [], isLoading } = useTeams()
  const { data: people = [] } = usePeople()
  const { data: services = [] } = useServices()
  const { data: designations = [] } = useDesignations()
  const { data: teamMembers = [] } = useTeamMembers()
  const { mutate: removeFromTeam } = useRemoveTeamMember()

  const serviceOptions = useMemo(
    () => services.filter((s) => s.is_active).map((s) => ({ value: s.slug, label: s.name })),
    [services],
  )
  const designationName = useMemo(() => new Map(designations.map((d) => [d.id, d.name])), [designations])

  const [teamModal, setTeamModal] = useState<Team | null | 'new'>(null)
  const [addTo, setAddTo] = useState<Team | null>(null)

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people])

  // Many-to-many membership: resolve team_members rows to Person records per team.
  const membersByTeam = useMemo(() => {
    const map = new Map<string, Person[]>()
    for (const tm of teamMembers) {
      const person = peopleById.get(tm.profile_id)
      if (!person) continue
      const list = map.get(tm.team_id) ?? []
      list.push(person)
      map.set(tm.team_id, list)
    }
    return map
  }, [teamMembers, peopleById])

  // Profile ids already in a given team — drives the "candidates" filter below.
  const memberIdsByTeam = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const tm of teamMembers) {
      const set = map.get(tm.team_id) ?? new Set<string>()
      set.add(tm.profile_id)
      map.set(tm.team_id, set)
    }
    return map
  }, [teamMembers])

  const removeMember = (team: Team, person: Person) => {
    removeFromTeam({ teamId: team.id, profileId: person.id }, {
      onSuccess: () => toast(`${person.name} removed from ${team.name}`, 'success'),
      onError: () => toast('Failed to remove member', 'error'),
    })
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Teams" back="/more" />
      <div className="px-4 py-6 lg:px-8 lg:py-7 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11.5px] text-text-3">{teams.length} team{teams.length === 1 ? '' : 's'} · {people.length} internal members</p>
          {canManage && <Button size="sm" onClick={() => setTeamModal('new')}><Plus size={13} /> Create Team</Button>}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16 text-text-4"><Loader2 size={20} className="animate-spin" /></div>
        ) : teams.length === 0 ? (
          <div className="py-16 text-center text-text-4 font-ui text-[13px]">No teams yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {teams.map((team) => {
              const members = membersByTeam.get(team.id) ?? []
              const memberIds = memberIdsByTeam.get(team.id) ?? new Set<string>()
              const lead = people.find((p) => p.id === team.lead_id)
              const candidates = people.filter((p) => !memberIds.has(p.id) && p.is_active)
              return (
                <section
                  key={team.id}
                  className="group overflow-hidden rounded-lg border border-border-default bg-surface-1 shadow-[0_18px_50px_rgba(0,0,0,0.16)] transition-colors hover:border-border-strong"
                >
                  <div className="border-b border-border-subtle bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(238,39,55,0.04)_45%,rgba(20,29,42,0)_100%)] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3.5">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface-2 text-service-dev shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                          <Users size={20} />
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-display text-[17px] font-bold leading-tight text-text-1 truncate">{team.name}</p>
                            {lead && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-coin-gold/25 bg-coin-gold/10 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-coin-gold">
                                <Crown size={10} /> Led
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <ServiceChip service={team.service_type} />
                            <span className="rounded-full border border-border-subtle bg-surface-2 px-2.5 py-1 font-mono text-[10.5px] text-text-3">
                              {members.length} member{members.length === 1 ? '' : 's'}
                            </span>
                          </div>
                        </div>
                      </div>
                      {canManage && (
                        <button
                          onClick={() => setTeamModal(team)}
                          className="flex size-8 shrink-0 items-center justify-center rounded-md text-text-4 transition-colors hover:bg-surface-2 hover:text-text-1"
                          aria-label={`Edit ${team.name}`}
                          title="Edit team"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div className="flex items-center gap-2.5 rounded-md border border-border-subtle bg-bg-base/35 px-3 py-2.5">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-coin-gold/10 text-coin-gold">
                          <Crown size={14} />
                        </span>
                        <div className="min-w-0">
                          <p className="font-mono text-[9.5px] font-semibold uppercase tracking-wider text-text-4">Team lead</p>
                          {lead ? (
                            <p className="truncate font-ui text-[12.5px] font-semibold text-text-1">{lead.name}</p>
                          ) : (
                            <p className="font-ui text-[12.5px] text-text-4">Assign a lead to give this team ownership.</p>
                          )}
                        </div>
                      </div>
                      {members.length > 0 && (
                        <div className="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-bg-base/35 px-3 py-2.5 sm:justify-end">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-text-4">Roster</span>
                          <AvatarGroup users={members.map((m) => ({ id: m.id, name: m.name, avatarUrl: m.avatar_url }))} max={4} size="sm" linkToProfile />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-ui text-[13px] font-semibold text-text-1">Members</p>
                        <p className="mt-0.5 font-mono text-[10.5px] text-text-4">People assigned to this team</p>
                      </div>
                      {members.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 font-mono text-[10px] text-text-3">
                          <ShieldCheck size={11} /> Active roster
                        </span>
                      )}
                    </div>

                    {members.length === 0 && (
                      <div className="rounded-md border border-dashed border-border-default bg-surface-2/40 px-4 py-5 text-center">
                        <Sparkles size={16} className="mx-auto text-text-4" />
                        <p className="mt-2 font-ui text-[13px] font-semibold text-text-2">No members yet</p>
                        <p className="mt-1 font-ui text-[12px] text-text-4">Add teammates to make this card useful at a glance.</p>
                      </div>
                    )}
                    {members.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 rounded-md border border-transparent bg-surface-2/35 px-3 py-2.5 transition-colors hover:border-border-subtle hover:bg-surface-2"
                      >
                        <Avatar name={m.name} src={m.avatar_url ?? undefined} size="sm" personId={m.id} />
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <PersonLink personId={m.id} className="truncate font-ui text-[13px] font-semibold text-text-1">{m.name}</PersonLink>
                            {m.id === team.lead_id && <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-coin-gold">Lead</span>}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <RoleBadge role={m.role as UserRole} />
                            {m.designation_id && designationName.get(m.designation_id) && (
                              <span className="rounded-full bg-surface-inset border border-border-subtle px-2 py-0.5 font-ui text-[10px] text-text-2">{designationName.get(m.designation_id)}</span>
                            )}
                          </div>
                        </div>
                        {canManage && (
                          <button
                            onClick={() => removeMember(team, m)}
                            className="flex size-7 shrink-0 items-center justify-center rounded-md text-text-4 opacity-100 transition-all hover:bg-error/10 hover:text-error lg:opacity-0 lg:group-hover:opacity-100"
                            title="Remove from team"
                            aria-label={`Remove ${m.name} from ${team.name}`}
                          >
                            <UserMinus size={13} />
                          </button>
                        )}
                      </div>
                    ))}

                    {canManage && (
                      <Button size="sm" variant="secondary" className="mt-1 w-full" disabled={candidates.length === 0} onClick={() => setAddTo(team)}>
                        <UserPlus size={13} /> {candidates.length === 0 ? 'Everyone is assigned' : 'Add Member'}
                      </Button>
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>

      {teamModal !== null && <TeamModal team={teamModal === 'new' ? null : teamModal} people={people} serviceOptions={serviceOptions} onClose={() => setTeamModal(null)} />}
      {addTo && <AddMemberModal team={addTo} candidates={people.filter((p) => !(memberIdsByTeam.get(addTo.id)?.has(p.id)) && p.is_active)} onClose={() => setAddTo(null)} />}
    </div>
  )
}
