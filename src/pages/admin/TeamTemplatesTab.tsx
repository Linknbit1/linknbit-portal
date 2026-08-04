import { useState } from 'react'
import {
  Plus, Trash2, Pencil, Layers, ChevronDown, ChevronRight, LayoutTemplate, X, Check,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Toggle } from '../../components/ui/Toggle'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Skeleton } from '../../components/ui/Skeleton'
import { ServiceChip } from '../../components/shared/ServiceChip'
import { PriorityChip } from '../../components/shared/PriorityChip'
import { useToast } from '../../components/ui/toast-context'
import { useServices } from '../../hooks/useServices'
import {
  useTeamTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate,
  useCreateTemplateStage, useUpdateTemplateStage, useDeleteTemplateStage,
  useCreateTemplateTask, useDeleteTemplateTask,
} from '../../hooks/useTemplates'
import { cn } from '../../lib/cn'
import { PRIORITY_LABELS } from '../../lib/utils'
import { formatEstimate } from '../../lib/duration'
import type { TemplateDetail, TemplateStageDetail } from '../../api/templates'
import type { Priority } from '../../types'

const PRIORITY_ORDER: Priority[] = ['critical', 'high', 'medium', 'low']
const isPriority = (v: string): v is Priority => (PRIORITY_ORDER as string[]).includes(v)

const fmtEstimate = formatEstimate

interface TeamTemplatesTabProps {
  teamId: string
  /** The team's own service — the sensible default for a new template. */
  teamServiceSlug: string
  canEdit: boolean
}

/**
 * A team's reusable pipelines. Each template is a service plus an ordered list of
 * stages, each holding tasks — the shape a project of that service starts from.
 */
export function TeamTemplatesTab({ teamId, teamServiceSlug, canEdit }: TeamTemplatesTabProps) {
  const toast = useToast()
  const { data: templates = [], isLoading } = useTeamTemplates(teamId)
  const { data: services = [] } = useServices()
  const [formFor, setFormFor] = useState<TemplateDetail | 'new' | null>(null)
  const [pendingDelete, setPendingDelete] = useState<TemplateDetail | null>(null)
  const deleteTemplate = useDeleteTemplate()

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="font-ui text-[12.5px] text-text-3 max-w-xl">
          Pre-built stages and tasks this team runs for a service. When a project takes on that
          service, one of these can be applied to it — a copy, so later edits here never change
          projects already created.
        </p>
        {canEdit && (
          <Button size="sm" iconLeft={<Plus size={14} />} onClick={() => setFormFor('new')}>New template</Button>
        )}
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border-default bg-surface-1 py-14 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-surface-2 text-text-3">
            <LayoutTemplate size={19} />
          </span>
          <p className="font-ui text-[13px] text-text-2">No templates yet</p>
          <p className="font-ui text-[11.5px] text-text-4 max-w-sm">
            {canEdit
              ? 'Build the pipeline this team repeats — stages, and the tasks inside each.'
              : 'This team has not built any templates yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              canEdit={canEdit}
              onEdit={() => setFormFor(t)}
              onDelete={() => setPendingDelete(t)}
            />
          ))}
        </div>
      )}

      {formFor && (
        <TemplateFormModal
          teamId={teamId}
          template={formFor === 'new' ? undefined : formFor}
          services={services.filter((s) => s.is_active).map((s) => ({ value: s.id, label: s.name, dot: s.color }))}
          defaultServiceId={services.find((s) => s.slug === teamServiceSlug)?.id ?? ''}
          onClose={() => setFormFor(null)}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete template?"
        message={pendingDelete
          ? `"${pendingDelete.name}" and its ${pendingDelete.stages.length} stage(s) will be removed. Projects already created from it are unaffected.`
          : ''}
        confirmLabel="Delete template"
        danger
        isPending={deleteTemplate.isPending}
        onConfirm={() => {
          if (!pendingDelete) return
          deleteTemplate.mutate(pendingDelete.id, {
            onSuccess: () => { toast('Template deleted', 'success'); setPendingDelete(null) },
            onError: (e) => toast(e instanceof Error ? e.message : 'Failed', 'error'),
          })
        }}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}

/* ── One template, expandable into its pipeline ─────────────────────────────── */

function TemplateCard({ template, canEdit, onEdit, onDelete }: {
  template: TemplateDetail
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const taskCount = template.stages.reduce((sum, s) => sum + s.tasks.length, 0)

  return (
    <div className="overflow-hidden rounded-xl border border-border-default bg-surface-1">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          {open ? <ChevronDown size={14} className="shrink-0 text-text-3" /> : <ChevronRight size={14} className="shrink-0 text-text-3" />}
          <span className="min-w-0">
            <span className="block truncate font-ui font-semibold text-[13.5px] text-text-1">{template.name}</span>
            <span className="font-mono text-[10.5px] text-text-4">
              {template.stages.length} stage{template.stages.length === 1 ? '' : 's'} · {taskCount} task{taskCount === 1 ? '' : 's'}
            </span>
          </span>
        </button>
        {template.service && <ServiceChip service={template.service.slug} />}
        {canEdit && (
          <div className="flex items-center gap-1">
            <button onClick={onEdit} aria-label={`Edit ${template.name}`}
              className="flex size-7 items-center justify-center rounded-sm text-text-4 hover:bg-surface-2 hover:text-text-1">
              <Pencil size={13} />
            </button>
            <button onClick={onDelete} aria-label={`Delete ${template.name}`}
              className="flex size-7 items-center justify-center rounded-sm text-text-4 hover:bg-error/10 hover:text-error">
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {template.description && !open && (
        <p className="px-4 pb-3 font-ui text-[12px] text-text-3">{template.description}</p>
      )}

      {open && <TemplatePipeline template={template} canEdit={canEdit} />}
    </div>
  )
}

function TemplatePipeline({ template, canEdit }: { template: TemplateDetail; canEdit: boolean }) {
  const toast = useToast()
  const createStage = useCreateTemplateStage()
  const [newStage, setNewStage] = useState('')

  const addStage = () => {
    const name = newStage.trim()
    if (!name) return
    createStage.mutate(
      { template_id: template.id, name, order_index: template.stages.length },
      {
        onSuccess: () => { setNewStage(''); toast('Stage added', 'success') },
        onError: (e) => toast(e instanceof Error ? e.message : 'Failed', 'error'),
      },
    )
  }

  return (
    <div className="border-t border-border-subtle bg-surface-2/30 p-4 space-y-3">
      {template.description && <p className="font-ui text-[12px] text-text-3">{template.description}</p>}

      {template.stages.length === 0 && (
        <p className="py-4 text-center font-ui text-[12.5px] text-text-4">
          No stages yet{canEdit ? ' — add the first one below.' : '.'}
        </p>
      )}

      {template.stages.map((stage) => (
        <StageBlock key={stage.id} stage={stage} canEdit={canEdit} />
      ))}

      {canEdit && (
        <div className="flex items-center gap-2 pt-1">
          <Input
            value={newStage}
            onChange={(e) => setNewStage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addStage() }}
            placeholder="Add a stage — e.g. Wireframes"
            className="flex-1"
          />
          <Button size="sm" variant="secondary" iconLeft={<Plus size={13} />} onClick={addStage} loading={createStage.isPending}>
            Stage
          </Button>
        </div>
      )}
    </div>
  )
}

function StageBlock({ stage, canEdit }: { stage: TemplateStageDetail; canEdit: boolean }) {
  const toast = useToast()
  const updateStage = useUpdateTemplateStage()
  const deleteStage = useDeleteTemplateStage()
  const createTask = useCreateTemplateTask()
  const deleteTask = useDeleteTemplateTask()
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const onError = (e: unknown) => toast(e instanceof Error ? e.message : 'Failed', 'error')

  return (
    <div className="overflow-hidden rounded-lg border border-border-default bg-surface-1">
      <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle px-3 py-2.5">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-text-3">
          <Layers size={12} />
        </span>
        <span className="min-w-0 flex-1 truncate font-ui font-semibold text-[12.5px] text-text-1">{stage.name}</span>
        <span className="font-mono text-[10px] text-text-4">{stage.tasks.length} task{stage.tasks.length === 1 ? '' : 's'}</span>
        {stage.requires_approval && (
          <span className="rounded-xs border border-warning/25 bg-warning/10 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wide text-warning">
            Approval
          </span>
        )}
        {canEdit && (
          <div className="flex items-center gap-1">
            <button onClick={() => setShowTaskForm(true)} aria-label={`Add task to ${stage.name}`}
              className="flex size-6.5 items-center justify-center rounded-sm text-text-4 hover:bg-surface-2 hover:text-text-1">
              <Plus size={13} />
            </button>
            <button onClick={() => setConfirmDelete(true)} aria-label={`Delete stage ${stage.name}`}
              className="flex size-6.5 items-center justify-center rounded-sm text-text-4 hover:bg-error/10 hover:text-error">
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {stage.tasks.length === 0 ? (
        <p className="p-3 text-center font-ui text-[11.5px] text-text-4">No tasks in this stage</p>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {stage.tasks.map((task) => (
            <li key={task.id} className="group flex flex-wrap items-center gap-2 px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-ui text-[12.5px] text-text-1">{task.title}</span>
                {task.description && (
                  <span className="block truncate font-ui text-[11px] text-text-4">{task.description}</span>
                )}
              </span>
              {fmtEstimate(task.estimated_minutes) && (
                <span className="font-mono text-[10.5px] text-text-3">{fmtEstimate(task.estimated_minutes)}</span>
              )}
              {task.client_visible && (
                <span className="font-mono text-[9.5px] uppercase tracking-wide text-text-4">client</span>
              )}
              <PriorityChip priority={task.priority} />
              {canEdit && (
                <button
                  onClick={() => deleteTask.mutate(task.id, { onError })}
                  aria-label={`Delete task ${task.title}`}
                  className="flex size-6 items-center justify-center rounded-sm text-text-4 opacity-0 transition-opacity hover:bg-error/10 hover:text-error group-hover:opacity-100"
                >
                  <X size={12} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="flex items-center justify-between gap-3 border-t border-border-subtle px-3 py-2">
          <label className="flex items-center gap-2">
            <Toggle
              size="sm"
              checked={stage.requires_approval}
              onChange={(v) => updateStage.mutate({ id: stage.id, updates: { requires_approval: v } }, { onError })}
              label={`Client approval for ${stage.name}`}
            />
            <span className="font-ui text-[11.5px] text-text-3">Needs client approval</span>
          </label>
          <label className="flex items-center gap-2">
            <Toggle
              size="sm"
              checked={stage.client_visible}
              onChange={(v) => updateStage.mutate({ id: stage.id, updates: { client_visible: v } }, { onError })}
              label={`Client visibility for ${stage.name}`}
            />
            <span className="font-ui text-[11.5px] text-text-3">Visible to client</span>
          </label>
        </div>
      )}

      {showTaskForm && (
        <TemplateTaskModal
          stageName={stage.name}
          pending={createTask.isPending}
          onSubmit={(payload) => createTask.mutate(
            { ...payload, template_stage_id: stage.id, order_index: stage.tasks.length },
            {
              onSuccess: () => { toast('Task added', 'success'); setShowTaskForm(false) },
              onError,
            },
          )}
          onClose={() => setShowTaskForm(false)}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete stage?"
        message={`"${stage.name}" and its ${stage.tasks.length} task(s) will be removed from this template.`}
        confirmLabel="Delete"
        danger
        isPending={deleteStage.isPending}
        onConfirm={() => deleteStage.mutate(stage.id, {
          onSuccess: () => { toast('Stage deleted', 'success'); setConfirmDelete(false) },
          onError,
        })}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}

/* ── Modals ─────────────────────────────────────────────────────────────────── */

function TemplateFormModal({ teamId, template, services, defaultServiceId, onClose }: {
  teamId: string
  template?: TemplateDetail
  services: { value: string; label: string; dot: string }[]
  defaultServiceId: string
  onClose: () => void
}) {
  const toast = useToast()
  const create = useCreateTemplate()
  const update = useUpdateTemplate()
  const isEdit = !!template

  const [name, setName] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [serviceId, setServiceId] = useState(template?.service_id ?? defaultServiceId)
  const pending = create.isPending || update.isPending

  const submit = () => {
    if (!name.trim()) { toast('Give the template a name', 'error'); return }
    if (!serviceId) { toast('Choose the service this builds', 'error'); return }
    const onSuccess = () => { toast(isEdit ? 'Template updated' : 'Template created', 'success'); onClose() }
    const onError = (e: unknown) => toast(e instanceof Error ? e.message : 'Save failed', 'error')

    if (template) {
      update.mutate({ id: template.id, updates: { name: name.trim(), description: description.trim() || null, service_id: serviceId } }, { onSuccess, onError })
    } else {
      create.mutate({ team_id: teamId, service_id: serviceId, name: name.trim(), description: description.trim() || null }, { onSuccess, onError })
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit template' : 'New template'}
      size="sm"
      busy={pending}
      footer={
        <div className="flex gap-2.5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button size="sm" className="flex-1" onClick={submit} loading={pending}>{isEdit ? 'Save' : 'Create'}</Button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        <Input label="Template name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard campaign" autoFocus />
        <div className="space-y-1.5">
          <label className="text-label font-ui font-semibold uppercase tracking-wider text-text-2">Builds this service</label>
          <Select value={serviceId} onChange={setServiceId} options={services} placeholder="Select service…" />
          <p className="font-mono text-[10.5px] text-text-4">Offered when a project takes on this service.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-label font-ui font-semibold uppercase tracking-wider text-text-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="When should this pipeline be used?"
            className="w-full resize-y rounded-md border border-border-default bg-surface-inset px-3 py-2 font-ui text-body-sm text-text-1 placeholder:text-text-3 focus:border-border-focus focus:outline-none"
          />
        </div>
      </div>
    </Modal>
  )
}

interface TaskDraft {
  title: string
  description: string | null
  priority: string
  estimated_minutes: number | null
  client_visible: boolean
}

function TemplateTaskModal({ stageName, pending, onSubmit, onClose }: {
  stageName: string
  pending: boolean
  onSubmit: (payload: TaskDraft) => void
  onClose: () => void
}) {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [hours, setHours] = useState('')
  const [clientVisible, setClientVisible] = useState(false)

  const submit = () => {
    if (!title.trim()) { toast('Task needs a title', 'error'); return }
    const estimate = hours ? Math.round(parseFloat(hours) * 60) : null
    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      estimated_minutes: estimate && estimate > 0 ? estimate : null,
      client_visible: clientVisible,
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Add task to ${stageName}`}
      size="sm"
      busy={pending}
      footer={
        <div className="flex gap-2.5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button size="sm" className="flex-1" iconLeft={<Check size={13} />} onClick={submit} loading={pending}>Add task</Button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Low-fidelity flows" autoFocus />
        <div className="flex flex-col gap-1.5">
          <label className="text-label font-ui font-semibold uppercase tracking-wider text-text-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Optional detail carried into every project."
            className="w-full resize-y rounded-md border border-border-default bg-surface-inset px-3 py-2 font-ui text-body-sm text-text-1 placeholder:text-text-3 focus:border-border-focus focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold uppercase tracking-wider text-text-2">Priority</label>
            <Select
              value={priority}
              onChange={(v) => { if (isPriority(v)) setPriority(v) }}
              options={PRIORITY_ORDER.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
            />
          </div>
          <Input label="Estimate (hours)" type="number" min={0} step={0.5} value={hours} onChange={(e) => setHours(e.target.value)} placeholder="—" />
        </div>
        <label className="flex items-center justify-between gap-3">
          <span className={cn('font-ui text-[13px]', clientVisible ? 'text-text-1' : 'text-text-2')}>Visible to client</span>
          <Toggle checked={clientVisible} onChange={setClientVisible} />
        </label>
      </div>
    </Modal>
  )
}
