import { useState } from 'react'
import { Check } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { MultiSelectPeople } from '../../components/ui/MultiSelectPeople'
import { DatePicker } from '../../components/ui/DatePicker'
import { Toggle } from '../../components/ui/Toggle'
import { useClients } from '../../hooks/useClients'
import { usePeople } from '../../hooks/usePeople'
import { useServices } from '../../hooks/useServices'
import { useCreateProject, useUpdateProject, useSetProjectManagers } from '../../hooks/useProjects'
import { useUsableTemplates } from '../../hooks/useTemplates'
import { useCanAccess } from '../../hooks/useRoleFlags'
import { useToast } from '../../components/ui/toast-context'
import { PROJECT_STATUS_LABELS } from '../../lib/utils'
import { cn } from '../../lib/cn'
import type { ProjectListItem, ProjectStatus } from '../../api/projects'
import type { ProjectStatus as AppProjectStatus } from '../../types'

interface ProjectFormModalProps {
  /** Pre-filled for editing; omit to create. */
  project?: ProjectListItem
  onClose: () => void
}

const STATUS_ORDER: AppProjectStatus[] = ['todo', 'in_progress', 'ongoing', 'awaiting_client', 'blocked', 'on_hold', 'completed']
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
  // Services are only chosen at creation; afterwards they are managed on the
  // project page, where each one carries its own stages, tasks and people.
  const [serviceIds, setServiceIds] = useState<string[]>([])
  // Optional per-service starting pipeline, keyed by service id.
  const [templateByService, setTemplateByService] = useState<Record<string, string>>({})
  // A project can be run by several people. Seeded from the join table, with
  // the legacy column as the fallback for a project loaded before it was
  // backfilled.
  const [managerIds, setManagerIds] = useState<string[]>(
    project?.managers?.map((m) => m.id) ?? (project?.manager_id ? [project.manager_id] : []),
  )
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'todo')
  const [startDate, setStartDate] = useState(project?.start_date ?? '')
  const [deadline, setDeadline] = useState(project?.deadline ?? '')
  const [budget, setBudget] = useState(project?.budget != null ? String(project.budget) : '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [clientVisible, setClientVisible] = useState(project?.client_visible ?? false)

  const clientOptions = clients.map((c) => ({ value: c.id, label: c.name }))
  const activeServices = services.filter((s) => s.is_active)
  // Only fetched while creating — RLS already limits these to the user's own teams.
  const { data: templates = [] } = useUsableTemplates(!isEdit)
  // A manager who has since left stays selected and is listed as such, so the
  // field matches the project header instead of quietly reading "Unassigned"
  // while the project is still recorded as theirs. `Select` keeps them
  // unpickable for any other project.
  const departedManagers = (project?.managers ?? []).filter((m) => m.is_active === false)
  const managerOptions = [
    ...departedManagers.map((m) => ({
      id: m.id,
      name: `${m.name}, deactivated`,
      avatar_url: m.avatar_url,
    })),
    ...people.filter((p) => p.is_active).map((p) => ({ id: p.id, name: p.name, avatar_url: p.avatar_url })),
  ]
  const statusOptions = STATUS_ORDER.map((s) => ({ value: s, label: PROJECT_STATUS_LABELS[s] }))
  const setManagers = useSetProjectManagers()
  const pending = createProject.isPending || updateProject.isPending || setManagers.isPending

  const handleSubmit = () => {
    if (!name.trim()) { toast('Project name is required', 'error'); return }
    if (!isEdit && serviceIds.length === 0) { toast('Choose at least one service', 'error'); return }
    const payload = {
      name: name.trim(),
      client_id: clientId || null,
      // The column follows the join table via a trigger, so it is only sent on
      // create, to give a brand-new project its first manager. Editing goes
      // through setManagers, which is the side that can hold more than one.
      ...(isEdit ? {} : { manager_id: managerIds[0] ?? null }),
      status,
      start_date: startDate || null,
      deadline: deadline || null,
      ...(canViewBudget ? { budget: budget ? Number(budget) : null } : {}),
      description: description.trim() || null,
      client_visible: clientVisible,
    }
    const onSuccess = () => { toast(isEdit ? 'Project updated' : 'Project created', 'success'); onClose() }
    const onError = (e: unknown) => toast(e instanceof Error ? e.message : 'Save failed', 'error')

    if (isEdit) {
      updateProject.mutate(
        { id: project.id, updates: payload },
        {
          // Managers last: it decides who can see the project at all, so it
          // should not land before the edit it belongs to.
          onSuccess: () => setManagers.mutate(
            { projectId: project.id, profileIds: managerIds },
            { onSuccess, onError },
          ),
          onError,
        },
      )
    } else {
      createProject.mutate(
        { payload, services: serviceIds.map((serviceId) => ({ serviceId, templateId: templateByService[serviceId] })) },
        {
          onSuccess: (row) => {
            // The first manager arrived with the row; anyone else is added now.
            if (managerIds.length > 1) {
              setManagers.mutate({ projectId: row.id, profileIds: managerIds }, { onSuccess, onError })
            } else onSuccess()
          },
          onError,
        },
      )
    }
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
        {!isEdit && (
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Services</label>
            <div className="flex flex-wrap gap-1.5">
              {activeServices.map((s) => {
                const picked = serviceIds.includes(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={picked}
                    onClick={() => setServiceIds((prev) =>
                      picked ? prev.filter((id) => id !== s.id) : [...prev, s.id])}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-sm border px-3 py-1 font-ui text-[12px] transition-colors',
                      picked
                        ? 'border-border-strong bg-surface-3 text-text-1'
                        : 'border-border-default bg-surface-2 text-text-3 hover:text-text-1',
                    )}
                  >
                    <span className="size-2 rounded-full shrink-0" style={{ background: s.color }} />
                    {s.name}
                    {picked && <Check size={11} />}
                  </button>
                )
              })}
            </div>
            <p className="font-mono text-[10.5px] text-text-4">
              Each service gets its own stages, tasks and people. You can add more later.
            </p>

            {serviceIds.map((serviceId) => {
              const forService = templates.filter((t) => t.service_id === serviceId)
              if (forService.length === 0) return null
              const service = activeServices.find((s) => s.id === serviceId)
              return (
                <div key={serviceId} className="space-y-1.5 pt-1">
                  <label className="text-label font-ui font-semibold uppercase tracking-wider text-text-2">
                    {service?.name} starting point
                  </label>
                  <Select
                    value={templateByService[serviceId] ?? ''}
                    onChange={(v) => setTemplateByService((prev) => ({ ...prev, [serviceId]: v }))}
                    options={[
                      { value: '', label: 'Empty, no stages' },
                      ...forService.map((t) => ({
                        value: t.id,
                        label: `${t.name} · ${t.stages.length} stage${t.stages.length === 1 ? '' : 's'}`,
                      })),
                    ]}
                    placeholder="Empty, no stages"
                  />
                </div>
              )
            })}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Client</label>
            <Select value={clientId} onChange={setClientId} options={clientOptions} placeholder="Select client…" />
          </div>
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Project managers</label>
            <MultiSelectPeople value={managerIds} onChange={setManagerIds} options={managerOptions} />
            {departedManagers.some((m) => managerIds.includes(m.id)) && (
              <p className="font-mono text-[10.5px] text-brand-red">
                {departedManagers.filter((m) => managerIds.includes(m.id)).map((m) => m.name).join(', ')}
                {' '}has left the company, pick a replacement.
              </p>
            )}
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
