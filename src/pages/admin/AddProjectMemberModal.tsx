import { useMemo, useState } from 'react'
import { Users, Check } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { MultiSelectPeople } from '../../components/ui/MultiSelectPeople'
import { usePeople } from '../../hooks/usePeople'
import { useTeams } from '../../hooks/useTeams'
import { useTeamMembers } from '../../hooks/useTeamMembers'
import { useAddProjectMembers } from '../../hooks/useProjectMembers'
import { useToast } from '../../components/ui/toast-context'
import { cn } from '../../lib/cn'

interface AddProjectMemberModalProps {
  projectId: string
  /** Profile ids already on the project — excluded from the picker. */
  existingIds: string[]
  onClose: () => void
}

export function AddProjectMemberModal({ projectId, existingIds, onClose }: AddProjectMemberModalProps) {
  const toast = useToast()
  const { data: people = [] } = usePeople()
  const { data: teams = [] } = useTeams()
  const { data: teamMembers = [] } = useTeamMembers()
  const addMembers = useAddProjectMembers()
  const [selected, setSelected] = useState<string[]>([])

  const candidates = useMemo(
    () => people.filter((p) => p.is_active && !existingIds.includes(p.id)),
    [people, existingIds],
  )
  const candidateIds = useMemo(() => new Set(candidates.map((p) => p.id)), [candidates])

  /** Teams that still have someone addable, with that addable subset. */
  const teamShortcuts = useMemo(() => teams.map((t) => {
    const ids = teamMembers
      .filter((tm) => tm.team_id === t.id && candidateIds.has(tm.profile_id))
      .map((tm) => tm.profile_id)
    return { id: t.id, name: t.name, ids }
  }).filter((t) => t.ids.length > 0), [teams, teamMembers, candidateIds])

  const options = candidates.map((p) => ({ id: p.id, name: p.name, avatar_url: p.avatar_url }))

  const toggleTeam = (ids: string[], allSelected: boolean) => {
    setSelected((prev) => allSelected
      ? prev.filter((id) => !ids.includes(id))
      : [...new Set([...prev, ...ids])])
  }

  const handleAdd = () => {
    if (selected.length === 0) return
    addMembers.mutate(
      { projectId, profileIds: selected },
      {
        onSuccess: () => {
          toast(`${selected.length} member${selected.length === 1 ? '' : 's'} added to project`, 'success')
          onClose()
        },
        onError: (e) => toast(e instanceof Error ? e.message : 'Could not add members', 'error'),
      },
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Add project members"
      size="sm"
      busy={addMembers.isPending}
      footer={
        <div className="flex gap-2.5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose} disabled={addMembers.isPending}>Cancel</Button>
          <Button size="sm" className="flex-1" onClick={handleAdd} loading={addMembers.isPending} disabled={selected.length === 0}>
            Add {selected.length > 0 ? `${selected.length} member${selected.length === 1 ? '' : 's'}` : 'members'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        {candidates.length === 0 ? (
          <p className="py-4 text-center font-ui text-[13px] text-text-3">Everyone is already on this project.</p>
        ) : (
          <>
            {teamShortcuts.length > 0 && (
              <div>
                <label className="text-label font-ui font-semibold uppercase tracking-wider text-text-2">Add a whole team</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {teamShortcuts.map((t) => {
                    const allSelected = t.ids.every((id) => selected.includes(id))
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTeam(t.ids, allSelected)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-ui text-[12px] transition-colors',
                          allSelected
                            ? 'border-brand-red/30 bg-brand-red/10 text-brand-red'
                            : 'border-border-default bg-surface-2 text-text-2 hover:border-border-strong hover:text-text-1',
                        )}
                      >
                        {allSelected ? <Check size={12} /> : <Users size={12} />}
                        {t.name}
                        <span className="font-mono text-[10px] text-text-4">{t.ids.length}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="text-label font-ui font-semibold uppercase tracking-wider text-text-2">People</label>
              <div className="mt-1.5">
                <MultiSelectPeople
                  value={selected}
                  onChange={setSelected}
                  options={options}
                  placeholder="Select people…"
                />
              </div>
              <p className="mt-1.5 font-mono text-[10.5px] text-text-4">
                {selected.length} selected · {candidates.length} available
              </p>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
