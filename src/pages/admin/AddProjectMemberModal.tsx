import { useMemo, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { usePeople } from '../../hooks/usePeople'
import { useAddProjectMember } from '../../hooks/useProjectMembers'
import { useToast } from '../../components/ui/toast-context'
import { ROLE_LABELS } from '../../lib/utils'
import type { UserRole } from '../../types'

interface AddProjectMemberModalProps {
  projectId: string
  /** Profile ids already on the project — excluded from the picker. */
  existingIds: string[]
  onClose: () => void
}

export function AddProjectMemberModal({ projectId, existingIds, onClose }: AddProjectMemberModalProps) {
  const toast = useToast()
  const { data: people = [] } = usePeople()
  const addMember = useAddProjectMember()
  const [selected, setSelected] = useState('')

  const candidates = useMemo(
    () => people.filter((p) => p.is_active && !existingIds.includes(p.id)),
    [people, existingIds],
  )

  const options = candidates.map((p) => ({
    value: p.id,
    label: `${p.name} · ${ROLE_LABELS[p.role as UserRole] ?? p.role}`,
    avatar: { name: p.name, url: p.avatar_url },
  }))

  const handleAdd = () => {
    if (!selected) return
    addMember.mutate(
      { projectId, profileId: selected },
      {
        onSuccess: () => { toast('Member added to project', 'success'); onClose() },
        onError: (e) => toast(e instanceof Error ? e.message : 'Could not add member', 'error'),
      },
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Add team member"
      size="sm"
      busy={addMember.isPending}
      footer={
        <div className="flex gap-2.5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose} disabled={addMember.isPending}>Cancel</Button>
          <Button size="sm" className="flex-1" onClick={handleAdd} loading={addMember.isPending} disabled={!selected}>Add member</Button>
        </div>
      }
    >
      <div className="p-5 space-y-3">
        {candidates.length === 0 ? (
          <p className="font-ui text-[13px] text-text-3 text-center py-4">Everyone is already on this project.</p>
        ) : (
          <>
            <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Person</label>
            <Select
              value={selected}
              onChange={setSelected}
              options={options}
              placeholder="Select a person…"
            />
          </>
        )}
      </div>
    </Modal>
  )
}
