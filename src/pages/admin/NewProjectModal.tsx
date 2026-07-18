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
import { useCreateProject } from '../../hooks/useProjects'
import { useToast } from '../../components/ui/toast-context'

interface NewProjectModalProps {
  onClose: () => void
}

export function NewProjectModal({ onClose }: NewProjectModalProps) {
  const toast = useToast()
  const { data: clients = [] } = useClients()
  const { data: people = [] } = usePeople()
  const { data: services = [] } = useServices()
  const createProject = useCreateProject()

  const [name, setName] = useState('')
  const [clientId, setClientId] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [managerId, setManagerId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [deadline, setDeadline] = useState('')
  const [budget, setBudget] = useState('')
  const [description, setDescription] = useState('')
  const [clientVisible, setClientVisible] = useState(false)

  const clientOptions = clients.map((c) => ({ value: c.id, label: c.name }))
  const serviceOptions = services.map((s) => ({ value: s.slug, label: s.name, dot: s.color }))
  const managerOptions = [
    { value: '', label: 'Unassigned' },
    ...people.filter((p) => p.is_active).map((p) => ({ value: p.id, label: p.name, avatar: { name: p.name, url: p.avatar_url } })),
  ]

  const handleCreate = () => {
    if (!name.trim()) { toast('Project name is required', 'error'); return }
    if (!serviceType) { toast('Choose a service', 'error'); return }
    createProject.mutate(
      {
        name: name.trim(),
        client_id: clientId || null,
        service_type: serviceType,
        manager_id: managerId || null,
        start_date: startDate || null,
        deadline: deadline || null,
        budget: budget ? Number(budget) : null,
        description: description.trim() || null,
        client_visible: clientVisible,
      },
      {
        onSuccess: () => { toast('Project created', 'success'); onClose() },
        onError: (e) => toast(e instanceof Error ? e.message : 'Could not create project', 'error'),
      },
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="New project"
      size="md"
      busy={createProject.isPending}
      footer={
        <div className="flex gap-2.5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose} disabled={createProject.isPending}>Cancel</Button>
          <Button size="sm" className="flex-1" onClick={handleCreate} loading={createProject.isPending}>Create project</Button>
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
          <Input label="Budget (PKR)" type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0" />
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Start date</label>
            <DatePicker value={startDate} onChange={setStartDate} />
          </div>
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Deadline</label>
            <DatePicker value={deadline} onChange={setDeadline} minDate={startDate || undefined} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What is this project about?"
            className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 font-ui text-body-sm text-text-1 placeholder:text-text-3 focus:outline-none focus:border-border-focus focus:shadow-ring-focus resize-none"
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
