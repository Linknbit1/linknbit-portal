import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { DatePicker } from '../../components/ui/DatePicker'
import { Toggle } from '../../components/ui/Toggle'
import { useClients } from '../../hooks/useClients'
import { usePeople } from '../../hooks/usePeople'
import { useServices } from '../../hooks/useServices'
import { useCreateProject, useUpdateProject } from '../../hooks/useProjects'
import { useCanAccess } from '../../hooks/useRoleFlags'
import { useToast } from '../../components/ui/toast-context'
import { PROJECT_STATUS_LABELS } from '../../lib/utils'
import type { ProjectListItem, ProjectStatus } from '../../api/projects'
import type { ProjectStatus as AppProjectStatus } from '../../types'

interface ProjectFormModalProps {
  /** Pre-filled for editing; omit to create. */
  project?: ProjectListItem
  onClose: () => void
}

const STATUS_ORDER: AppProjectStatus[] = ['in_progress', 'ongoing', 'awaiting_client', 'blocked', 'on_hold', 'completed']
const isStatus = (v: string): v is ProjectStatus => (STATUS_ORDER as string[]).includes(v)

export function ProjectFormModal({ project, onClose }: ProjectFormModalProps) {
  const toast = useToast()
  const isEdit = !!project
  const { data: clients = [] } = useClients()
  const { data: people = [] } = usePeople()
  const { data: services = [] } = useServices()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const canViewBudget = useCanAccess('can_view_budget')

  const [name, setName] = useState(project?.name ?? '')
  const [clientId, setClientId] = useState(project?.client_id ?? '')
  const [serviceType, setServiceType] = useState(project?.service_type ?? '')
  const [managerId, setManagerId] = useState(project?.manager_id ?? '')
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'in_progress')
  const [startDate, setStartDate] = useState(project?.start_date ?? '')
  const [deadline, setDeadline] = useState(project?.deadline ?? '')
  const [budget, setBudget] = useState(project?.budget != null ? String(project.budget) : '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [clientVisible, setClientVisible] = useState(project?.client_visible ?? false)

  const clientOptions = clients.map((c) => ({ value: c.id, label: c.name }))
  const serviceOptions = services.map((s) => ({ value: s.slug, label: s.name, dot: s.color }))
  const managerOptions = [
    { value: '', label: 'Unassigned' },
    ...people.filter((p) => p.is_active).map((p) => ({ value: p.id, label: p.name, avatar: { name: p.name, url: p.avatar_url } })),
  ]
  const statusOptions = STATUS_ORDER.map((s) => ({ value: s, label: PROJECT_STATUS_LABELS[s] }))
  const pending = createProject.isPending || updateProject.isPending

  const handleSubmit = () => {
    if (!name.trim()) { toast('Project name is required', 'error'); return }
    if (!serviceType) { toast('Choose a service', 'error'); return }
    const payload = {
      name: name.trim(),
      client_id: clientId || null,
      service_type: serviceType,
      manager_id: managerId || null,
      status,
      start_date: startDate || null,
      deadline: deadline || null,
      ...(canViewBudget ? { budget: budget ? Number(budget) : null } : {}),
      description: description.trim() || null,
      client_visible: clientVisible,
    }
    const onSuccess = () => { toast(isEdit ? 'Project updated' : 'Project created', 'success'); onClose() }
    const onError = (e: unknown) => toast(e instanceof Error ? e.message : 'Save failed', 'error')

    if (isEdit) updateProject.mutate({ id: project.id, updates: payload }, { onSuccess, onError })
    else createProject.mutate(payload, { onSuccess, onError })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit project' : 'New project'}
      size="md"
      busy={pending}
      footer={
        <div className="flex gap-2.5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button size="sm" className="flex-1" onClick={handleSubmit} loading={pending}>{isEdit ? 'Save changes' : 'Create project'}</Button>
        </div>
      }
    >
      <div className="p-5 space-y-4">
        <Input label="Project name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cricket Sansar App" autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Client</label>
            <Select value={clientId} onChange={setClientId} options={clientOptions} placeholder="Select client…" />
          </div>
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Service</label>
            <Select value={serviceType} onChange={setServiceType} options={serviceOptions} placeholder="Select service…" />
          </div>
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Project manager</label>
            <Select value={managerId} onChange={setManagerId} options={managerOptions} placeholder="Unassigned" />
          </div>
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Status</label>
            <Select value={status} onChange={(v) => { if (isStatus(v)) setStatus(v) }} options={statusOptions} />
          </div>
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Start date</label>
            <DatePicker value={startDate} onChange={setStartDate} />
          </div>
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Deadline</label>
            <DatePicker value={deadline} onChange={setDeadline} minDate={startDate || undefined} />
          </div>
          {canViewBudget && (
            <Input label="Budget (PKR)" type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0" className="col-span-2" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Short description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="A one-line summary of the project (add full docs, credentials & resources in the Overview tab afterwards)."
            className="w-full min-h-28 bg-surface-inset border border-border-default rounded-md px-3 py-2 font-ui text-body-sm text-text-1 placeholder:text-text-3 focus:outline-none focus:border-border-focus focus:shadow-ring-focus resize-y"
          />
        </div>
        <label className="flex items-center justify-between gap-3">
          <span className="font-ui text-[13px] text-text-2">Visible to client</span>
          <Toggle checked={clientVisible} onChange={setClientVisible} />
        </label>
      </div>
    </Modal>
  )
}
