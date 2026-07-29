import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Toggle } from '../../components/ui/Toggle'
import { useCreateStage, useUpdateStage } from '../../hooks/useStages'
import { useToast } from '../../components/ui/toast-context'
import type { StageRow } from '../../api/stages'

interface StageFormModalProps {
  projectId: string
  /** The service block this stage belongs to — stages live under a service now. */
  projectServiceId: string
  /** Pre-filled for editing; omit to create. */
  stage?: StageRow
  /** order_index to use for a newly created stage. */
  nextOrder?: number
  onClose: () => void
}

export function StageFormModal({ projectId, projectServiceId, stage, nextOrder = 0, onClose }: StageFormModalProps) {
  const toast = useToast()
  const createStage = useCreateStage()
  const updateStage = useUpdateStage()
  const isEdit = !!stage

  const [name, setName] = useState(stage?.name ?? '')
  const [requiresApproval, setRequiresApproval] = useState(stage?.requires_approval ?? false)
  const [clientVisible, setClientVisible] = useState(stage?.client_visible ?? true)

  const pending = createStage.isPending || updateStage.isPending

  const handleSubmit = () => {
    if (!name.trim()) { toast('Stage name is required', 'error'); return }
    const onSuccess = () => { toast(isEdit ? 'Stage updated' : 'Stage added', 'success'); onClose() }
    const onError = (e: unknown) => toast(e instanceof Error ? e.message : 'Save failed', 'error')

    if (isEdit) {
      updateStage.mutate(
        { id: stage.id, updates: { name: name.trim(), requires_approval: requiresApproval, client_visible: clientVisible } },
        { onSuccess, onError },
      )
    } else {
      createStage.mutate(
        {
          project_id: projectId,
          project_service_id: projectServiceId,
          name: name.trim(),
          order_index: nextOrder,
          requires_approval: requiresApproval,
          client_visible: clientVisible,
        },
        { onSuccess, onError },
      )
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit stage' : 'Add stage'}
      size="sm"
      busy={pending}
      footer={
        <div className="flex gap-2.5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button size="sm" className="flex-1" onClick={handleSubmit} loading={pending}>{isEdit ? 'Save' : 'Add stage'}</Button>
        </div>
      }
    >
      <div className="p-5 space-y-4">
        <Input label="Stage name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Wireframes" autoFocus />
        <label className="flex items-center justify-between gap-3">
          <span className="font-ui text-[13px] text-text-2">Requires client approval</span>
          <Toggle checked={requiresApproval} onChange={setRequiresApproval} />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span className="font-ui text-[13px] text-text-2">Visible to client</span>
          <Toggle checked={clientVisible} onChange={setClientVisible} />
        </label>
      </div>
    </Modal>
  )
}
