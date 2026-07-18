import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Toggle } from '../../components/ui/Toggle'
import { useServices } from '../../hooks/useServices'
import { useCreateStage, useUpdateStage } from '../../hooks/useStages'
import { useToast } from '../../components/ui/toast-context'
import type { StageRow } from '../../api/stages'

interface StageFormModalProps {
  projectId: string
  /** Pre-filled for editing; omit to create. */
  stage?: StageRow
  /** order_index to use for a newly created stage. */
  nextOrder?: number
  onClose: () => void
}

export function StageFormModal({ projectId, stage, nextOrder = 0, onClose }: StageFormModalProps) {
  const toast = useToast()
  const { data: services = [] } = useServices()
  const createStage = useCreateStage()
  const updateStage = useUpdateStage()
  const isEdit = !!stage

  const [name, setName] = useState(stage?.name ?? '')
  const [serviceType, setServiceType] = useState(stage?.service_type ?? '')
  const [requiresApproval, setRequiresApproval] = useState(stage?.requires_approval ?? false)
  const [clientVisible, setClientVisible] = useState(stage?.client_visible ?? true)

  const serviceOptions = services.map((s) => ({ value: s.slug, label: s.name, dot: s.color }))
  const pending = createStage.isPending || updateStage.isPending

  const handleSubmit = () => {
    if (!name.trim()) { toast('Stage name is required', 'error'); return }
    const onSuccess = () => { toast(isEdit ? 'Stage updated' : 'Stage added', 'success'); onClose() }
    const onError = (e: unknown) => toast(e instanceof Error ? e.message : 'Save failed', 'error')

    if (isEdit) {
      updateStage.mutate(
        { id: stage.id, updates: { name: name.trim(), service_type: serviceType || null, requires_approval: requiresApproval, client_visible: clientVisible } },
        { onSuccess, onError },
      )
    } else {
      createStage.mutate(
        { project_id: projectId, name: name.trim(), order_index: nextOrder, service_type: serviceType || null, requires_approval: requiresApproval, client_visible: clientVisible },
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
        <div className="space-y-1.5">
          <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Service</label>
          <Select value={serviceType} onChange={setServiceType} options={serviceOptions} placeholder="Inherit from project" />
        </div>
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
