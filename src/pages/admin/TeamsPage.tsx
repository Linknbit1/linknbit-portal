import { useState } from 'react'
import { Users, Plus, Search, MoreHorizontal, Zap, CheckCircle2, X, Check } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { ServiceChip } from '../../components/shared/ServiceChip'
import { useToast } from '../../components/ui/Toast'
import { TEAMS, USERS, PROJECTS, TEAM_PERFORMANCE } from '../../data/mock'
import type { Team } from '../../types'
import { cn } from '../../lib/cn'

const WORKLOAD_META = {
  light:  { label: 'Light',  cls: 'text-success bg-success/10 border-success/30' },
  medium: { label: 'Medium', cls: 'text-warning bg-warning/10 border-warning/30' },
  heavy:  { label: 'Heavy',  cls: 'text-error bg-error/10 border-error/30' },
}


function AddMemberModal({ open, team, onClose, onAdd }: {
  open: boolean
  team: Team | null
  onClose: () => void
  onAdd: (teamId: string, userId: string) => void
}) {
  const [selected, setSelected] = useState('')
  if (!open || !team) return null

  const available = USERS.filter(
    (u) => u.role !== 'client_owner' && u.role !== 'client_member' && !team.memberIds.includes(u.id)
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-1 border border-border-default rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-[16px] text-text-1">Add to {team.name}</h3>
          <button onClick={onClose} className="text-text-4 hover:text-text-1 transition-colors"><X size={18} /></button>
        </div>
        <Select
          value={selected}
          onChange={setSelected}
          options={[{ value: '', label: 'Select member...' }, ...available.map((u) => ({ value: u.id, label: u.name }))]}
        />
        <div className="flex gap-2.5 mt-4">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" disabled={!selected} onClick={() => { onAdd(team.id, selected); onClose(); setSelected('') }}>
            <Check size={14} /> Add
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function TeamsPage() {
  const toast = useToast()
  const [teams, setTeams] = useState<Team[]>(TEAMS)
  const [search, setSearch] = useState('')
  const [addModal, setAddModal] = useState<{ open: boolean; team: Team | null }>({ open: false, team: null })

  const filtered = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) || t.leadName.toLowerCase().includes(search.toLowerCase())
  )

  const handleAddMember = (teamId: string, userId: string) => {
    setTeams((prev) => prev.map((t) =>
      t.id === teamId ? { ...t, memberIds: [...t.memberIds, userId] } : t
    ))
    const user = USERS.find((u) => u.id === userId)
    toast(`${user?.name} added to team`, 'success')
  }

  const handleRemoveMember = (teamId: string, userId: string) => {
    const user = USERS.find((u) => u.id === userId)
    setTeams((prev) => prev.map((t) =>
      t.id === teamId ? { ...t, memberIds: t.memberIds.filter((id) => id !== userId) } : t
    ))
    toast(`${user?.name} removed from team`, 'info')
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Teams" />

      <div className="p-6 flex flex-col gap-6 max-w-content mx-auto w-full">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-[280px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams..."
              className="w-full pl-8 pr-3 py-2 bg-surface-1 border border-border-default rounded-md text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus"
            />
          </div>
          <div className="ml-auto">
            <Button onClick={() => toast('Create team modal coming soon', 'info')}>
              <Plus size={14} /> New Team
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Members', value: USERS.filter((u) => u.role === 'employee' || u.role === 'team_lead').length, icon: Users, color: 'text-service-dev' },
            { label: 'Active Projects', value: PROJECTS.filter((p) => p.status === 'in_progress').length, icon: CheckCircle2, color: 'text-success' },
            { label: 'Total XP Earned', value: TEAM_PERFORMANCE.reduce((s, m) => s + m.xp, 0).toLocaleString(), icon: Zap, color: 'text-coin-gold' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-surface-1 border border-border-default rounded-xl p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-surface-2 border border-border-default flex items-center justify-center flex-shrink-0">
                <Icon size={20} className={color} />
              </div>
              <div>
                <p className="font-display font-bold text-[26px] text-text-1 leading-none">{value}</p>
                <p className="font-ui text-[12px] text-text-3 mt-1">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Teams */}
        <div className="grid gap-5">
          {filtered.map((team) => {
            const members = USERS.filter((u) => team.memberIds.includes(u.id))
            const perf = TEAM_PERFORMANCE.filter((p) => team.memberIds.includes(p.id))
            const wl = WORKLOAD_META[team.avgWorkload]

            return (
              <div key={team.id} className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
                {/* Team Header */}
                <div className="flex items-center gap-4 px-6 py-4 border-b border-border-subtle">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-display font-bold text-[15px] text-text-1">{team.name}</h3>
                      <ServiceChip service={team.department} />
                      <span className={cn('text-[10.5px] font-ui font-semibold px-2 py-0.5 rounded-full border', wl.cls)}>
                        {wl.label} workload
                      </span>
                    </div>
                    <p className="text-[12px] font-mono text-text-4">
                      Lead: <span className="text-text-2">{team.leadName}</span> · {members.length} members · {team.activeProjects} active projects
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAddModal({ open: true, team })}
                      className="h-8 px-3 bg-surface-2 border border-border-default rounded-md text-[12px] font-ui font-semibold text-text-2 hover:bg-surface-3 hover:text-text-1 flex items-center gap-1.5 transition-colors"
                    >
                      <Plus size={12} /> Add Member
                    </button>
                    <button
                      onClick={() => toast('Team options menu', 'info')}
                      className="w-8 h-8 bg-surface-2 border border-border-default rounded-md text-text-3 hover:text-text-1 flex items-center justify-center transition-colors"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </div>

                {/* Members */}
                <div className="divide-y divide-border-subtle">
                  {members.map((member) => {
                    const memberPerf = perf.find((p) => p.id === member.id)
                    const isLead = member.id === team.leadId
                    return (
                      <div key={member.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/[0.015] transition-colors">
                        <Avatar name={member.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-ui font-semibold text-[13px] text-text-1">{member.name}</span>
                            {isLead && (
                              <span className="text-[9.5px] font-mono font-semibold text-brand-red bg-brand-red/10 border border-brand-red/30 px-1.5 py-[1px] rounded uppercase tracking-wider">
                                Lead
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-[11px] text-text-4 capitalize">{member.role.replace('_', ' ')}</p>
                        </div>
                        {memberPerf && (
                          <div className="flex items-center gap-5 text-right">
                            <div>
                              <p className="font-mono text-[13px] font-semibold text-text-1">{memberPerf.tasksCompleted}</p>
                              <p className="font-ui text-[10px] text-text-4">Tasks</p>
                            </div>
                            <div>
                              <p className="font-mono text-[13px] font-semibold text-coin-gold">{memberPerf.xp.toLocaleString()}</p>
                              <p className="font-ui text-[10px] text-text-4">XP</p>
                            </div>
                            <div>
                              <span className={cn('text-[10.5px] font-ui font-semibold px-2 py-0.5 rounded-full border', WORKLOAD_META[memberPerf.workload].cls)}>
                                {WORKLOAD_META[memberPerf.workload].label}
                              </span>
                            </div>
                          </div>
                        )}
                        {!isLead && (
                          <button
                            onClick={() => handleRemoveMember(team.id, member.id)}
                            className="w-7 h-7 rounded-md bg-surface-2 border border-border-default text-text-4 hover:text-error hover:border-error/30 hover:bg-error/10 flex items-center justify-center transition-colors ml-2"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <AddMemberModal
        open={addModal.open}
        team={addModal.team}
        onClose={() => setAddModal({ open: false, team: null })}
        onAdd={handleAddMember}
      />
    </div>
  )
}
