import { useMemo, useState } from 'react'
import { Users, Plus, X, Loader2, Pencil, UserPlus, UserMinus, Crown } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { ServiceChip } from '../../components/shared/ServiceChip'
import { useToast } from '../../components/ui/toast-context'
import { useAuthContext } from '../../context/AuthContext'
import { useTeams, useCreateTeam, useUpdateTeam } from '../../hooks/useTeams'
import { usePeople, useUpdatePersonRole } from '../../hooks/usePeople'
import type { Team } from '../../api/teams'
import type { Person } from '../../api/people'
import { canManagePeople } from '../../lib/peopleAccess'

const SERVICE_OPTIONS = [
  { value: 'design', label: 'Design' },
  { value: 'development', label: 'Development' },
  { value: 'marketing', label: 'Marketing' },
]

const isService = (s: string): s is 'design' | 'development' | 'marketing' =>
  s === 'design' || s === 'development' || s === 'marketing'

function serviceChip(s: string) {
  return isService(s) ? <ServiceChip service={s} /> : null
}

// ── Create / edit team modal ───────────────────────────────────────────────────

function TeamModal({ team, people, onClose }: {
  team: Team | null
  people: Person[]
  onClose: () => void
}) {
  const toast = useToast()
  const { mutate: create, isPending: creating } = useCreateTeam()
  const { mutate: update, isPending: updating } = useUpdateTeam()
  const isEdit = team !== null
  const [name, setName] = useState(team?.name ?? '')
  const [service, setService] = useState(team?.service_type ?? 'development')
  const [leadId, setLeadId] = useState(team?.lead_id ?? '')
  const isPending = creating || updating

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-1 border border-border-default rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-[16px] text-text-1">{isEdit ? 'Edit Team' : 'Create Team'}</h3>
          <button onClick={onClose} className="text-text-4 hover:text-text-1"><X size={18} /></button>
        </div>
        <div className="space-y-3.5">
          <Input label="Team name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Development Pod A" />
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Service</label>
            <Select value={service} onChange={setService} options={SERVICE_OPTIONS} />
          </div>
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Team lead</label>
            <Select value={leadId} onChange={setLeadId} options={[{ value: '', label: 'No lead' }, ...people.map((p) => ({ value: p.id, label: p.name }))]} />
          </div>
        </div>
        <div className="flex gap-2.5 mt-5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" disabled={!name.trim() || isPending} onClick={submit}>
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} {isEdit ? 'Save' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Add member modal ───────────────────────────────────────────────────────────

function AddMemberModal({ team, candidates, onClose }: {
  team: Team
  candidates: Person[]
  onClose: () => void
}) {
  const toast = useToast()
  const { mutate: assign, isPending } = useUpdatePersonRole()
  const [selected, setSelected] = useState('')

  const add = () => {
    const person = candidates.find((p) => p.id === selected)
    if (!person) return
    assign({ profileId: person.id, role: person.role, teamId: team.id, serviceType: null }, {
      onSuccess: () => { toast(`${person.name} added to ${team.name}`, 'success'); onClose() },
      onError: () => toast('Failed to add member', 'error'),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-1 border border-border-default rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-[16px] text-text-1">Add to {team.name}</h3>
          <button onClick={onClose} className="text-text-4 hover:text-text-1"><X size={18} /></button>
        </div>
        <Select value={selected} onChange={setSelected} options={[{ value: '', label: 'Select member…' }, ...candidates.map((p) => ({ value: p.id, label: p.name }))]} />
        <div className="flex gap-2.5 mt-4">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" disabled={!selected || isPending} onClick={add}>
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />} Add
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const toast = useToast()
  const { profile } = useAuthContext()
  const canManage = canManagePeople(profile?.role)

  const { data: teams = [], isLoading } = useTeams()
  const { data: people = [] } = usePeople()
  const { mutate: assign } = useUpdatePersonRole()

  const [teamModal, setTeamModal] = useState<Team | null | 'new'>(null)
  const [addTo, setAddTo] = useState<Team | null>(null)

  const membersByTeam = useMemo(() => {
    const map = new Map<string, Person[]>()
    for (const p of people) {
      if (!p.team_id) continue
      const list = map.get(p.team_id) ?? []
      list.push(p)
      map.set(p.team_id, list)
    }
    return map
  }, [people])

  const removeMember = (team: Team, person: Person) => {
    assign({ profileId: person.id, role: person.role, teamId: null, serviceType: person.service_type }, {
      onSuccess: () => toast(`${person.name} removed from ${team.name}`, 'success'),
      onError: () => toast('Failed to remove member', 'error'),
    })
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Teams" />
      <div className="p-6 flex flex-col gap-5 max-w-content mx-auto w-full">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11.5px] text-text-3">{teams.length} team{teams.length === 1 ? '' : 's'} · {people.length} internal members</p>
          {canManage && <Button size="sm" onClick={() => setTeamModal('new')}><Plus size={13} /> Create Team</Button>}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16 text-text-4"><Loader2 size={20} className="animate-spin" /></div>
        ) : teams.length === 0 ? (
          <div className="py-16 text-center text-text-4 font-ui text-[13px]">No teams yet.</div>
        ) : (
          <div className="grid grid-cols-2 gap-5">
            {teams.map((team) => {
              const members = membersByTeam.get(team.id) ?? []
              const lead = people.find((p) => p.id === team.lead_id)
              const candidates = people.filter((p) => p.team_id !== team.id && p.is_active)
              return (
                <div key={team.id} className="bg-surface-1 border border-border-default rounded-xl p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0"><Users size={18} className="text-text-3" /></div>
                      <div className="min-w-0">
                        <p className="font-display font-bold text-[15px] text-text-1 truncate">{team.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">{serviceChip(team.service_type)}<span className="font-mono text-[11px] text-text-4">{members.length} member{members.length === 1 ? '' : 's'}</span></div>
                      </div>
                    </div>
                    {canManage && <Button size="sm" variant="ghost" onClick={() => setTeamModal(team)}><Pencil size={13} /></Button>}
                  </div>

                  <div className="flex items-center gap-2 text-[12px] font-ui text-text-3">
                    <Crown size={13} className="text-coin-gold" />
                    {lead ? <span className="text-text-2">{lead.name}</span> : <span className="text-text-4">No lead assigned</span>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {members.length === 0 && <p className="font-ui text-[12px] text-text-4">No members yet.</p>}
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center gap-2.5 group">
                        <Avatar name={m.name} size="xs" />
                        <span className="font-ui text-[12.5px] text-text-2 flex-1 truncate">{m.name}{m.id === team.lead_id && <span className="ml-1.5 font-mono text-[9px] text-coin-gold">LEAD</span>}</span>
                        {canManage && (
                          <button onClick={() => removeMember(team, m)} className="p-1 text-text-4 hover:text-error opacity-0 group-hover:opacity-100 transition-opacity" title="Remove from team"><UserMinus size={13} /></button>
                        )}
                      </div>
                    ))}
                  </div>

                  {canManage && (
                    <Button size="sm" variant="secondary" className="w-full" disabled={candidates.length === 0} onClick={() => setAddTo(team)}>
                      <UserPlus size={13} /> Add Member
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {teamModal !== null && <TeamModal team={teamModal === 'new' ? null : teamModal} people={people} onClose={() => setTeamModal(null)} />}
      {addTo && <AddMemberModal team={addTo} candidates={people.filter((p) => p.team_id !== addTo.id && p.is_active)} onClose={() => setAddTo(null)} />}
    </div>
  )
}
