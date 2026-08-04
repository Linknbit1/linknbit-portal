import { useState } from 'react'
import { Drawer } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { DateTimeRangePicker } from '../../components/ui/DateTimeRangePicker'
import { DurationInput } from '../../components/ui/DurationInput'
import { Toggle } from '../../components/ui/Toggle'
import { useProjects } from '../../hooks/useProjects'
import { useServiceStages } from '../../hooks/useStages'
import { useProjectServices, useProjectServiceMembers } from '../../hooks/useProjectServices'
import { useCreateTask, useUpdateTask } from '../../hooks/useTasks'
import { MultiSelectPeople } from '../../components/ui/MultiSelectPeople'
import { TaskTimeTracker } from '../../components/shared/TaskTimeTracker'
import { useSetTaskAssignees } from '../../hooks/useTaskAssignees'
import { useToast } from '../../components/ui/toast-context'
import { PRIORITY_LABELS, STATUS_LABELS } from '../../lib/utils'
import type { TaskListItem } from '../../api/tasks'
import type { Priority, TaskStatus } from '../../types'

interface TaskFormModalProps {
  /** Locks the task to this project (project detail view). Omit for the global picker. */
  projectId?: string
  /** Locks it to one service block. Omit to let the form pick one. */
  projectServiceId?: string
  task?: TaskListItem
  defaultStageId?: string
  onClose: () => void
}

const PRIORITY_DOTS: Record<Priority, string> = {
  critical: '#F4364C', high: '#F59E0B', medium: '#60A5FA', low: '#7A8597',
}

const STATUS_ORDER: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'approved', 'completed', 'blocked']
const PRIORITY_ORDER: Priority[] = ['critical', 'high', 'medium', 'low']

const isStatus = (v: string): v is TaskStatus => (STATUS_ORDER as string[]).includes(v)
const isPriority = (v: string): v is Priority => (PRIORITY_ORDER as string[]).includes(v)

function toPriority(v: string | null | undefined): Priority { return v && isPriority(v) ? v : 'medium' }
function toStatus(v: string | null | undefined): TaskStatus { return v && isStatus(v) ? v : 'todo' }

export function TaskFormModal({ projectId, projectServiceId, task, defaultStageId, onClose }: TaskFormModalProps) {
  const toast = useToast()
  const isEdit = !!task
  const { data: projects = [] } = useProjects()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const setAssignees = useSetTaskAssignees()

  const lockedProjectId = projectId ?? task?.project_id
  const lockedServiceId = projectServiceId ?? task?.project_service_id
  const [selectedProject, setSelectedProject] = useState(lockedProjectId ?? '')
  // A task hangs off a service, so that is picked before stage and assignees.
  const [selectedService, setSelectedService] = useState(lockedServiceId ?? '')
  const { data: services = [] } = useProjectServices(selectedProject || undefined)
  const { data: stages = [] } = useServiceStages(selectedService || undefined)
  const { data: allMembers = [] } = useProjectServiceMembers(selectedProject || undefined)

  // Switching project invalidates the service; fall back to its first one.
  const effectiveService = services.some((s) => s.id === selectedService)
    ? selectedService
    : services[0]?.id ?? ''
  // Only people staffed on this service can be assigned its work.
  const members = allMembers.filter((m) => m.project_service_id === effectiveService)

  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [stageId, setStageId] = useState(task?.stage_id ?? defaultStageId ?? '')
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task?.assignees.map((a) => a.id) ?? [])
  const [priority, setPriority] = useState<Priority>(toPriority(task?.priority))
  const [status, setStatus] = useState<TaskStatus>(toStatus(task?.status))
  const [startAt, setStartAt] = useState<string | null>(task?.start_date ?? null)
  const [dueAt, setDueAt] = useState<string | null>(task?.due_date ?? null)
  const [clientVisible, setClientVisible] = useState(task?.client_visible ?? false)
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(task?.estimated_minutes ?? null)
  // Drives the slide-out; the real `onClose` runs once the animation finishes.
  const [visible, setVisible] = useState(true)
  const dismiss = () => setVisible(false)

  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }))
  const serviceOptions = services.flatMap((s) =>
    s.service ? [{ value: s.id, label: s.service.name, dot: s.service.color }] : [])
  const stageOptions = [{ value: '', label: 'No stage' }, ...stages.map((s) => ({ value: s.id, label: s.name }))]
  const memberPeople = members.map((m) => ({ id: m.id, name: m.name, avatar_url: m.avatar_url }))
  const priorityOptions = PRIORITY_ORDER.map((p) => ({ value: p, label: PRIORITY_LABELS[p], dot: PRIORITY_DOTS[p] }))
  const statusOptions = STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABELS[s] }))

  const pending = createTask.isPending || updateTask.isPending

  const handleSubmit = () => {
    if (!selectedProject) { toast('Choose a project', 'error'); return }
    if (!effectiveService) { toast('Choose a service', 'error'); return }
    if (!title.trim()) { toast('Task title is required', 'error'); return }
    const onSuccess = () => { toast(isEdit ? 'Task updated' : 'Task created', 'success'); dismiss() }
    const onError = (e: unknown) => toast(e instanceof Error ? e.message : 'Save failed', 'error')

    if (isEdit) {
      updateTask.mutate(
        {
          id: task.id,
          updates: {
            title: title.trim(),
            description: description.trim() || null,
            project_service_id: effectiveService,
            stage_id: stageId || null,
            priority, status, start_date: startAt, due_date: dueAt, client_visible: clientVisible,
            estimated_minutes: estimatedMinutes,
          },
        },
        {
          onSuccess: () => setAssignees.mutate(
            { taskId: task.id, profileIds: assigneeIds, projectId: task.project_id },
            { onSuccess, onError },
          ),
          onError,
        },
      )
    } else {
      createTask.mutate(
        {
          project_id: selectedProject,
          project_service_id: effectiveService,
          title: title.trim(),
          description: description.trim() || null,
          stage_id: stageId || null,
          assignee_id: assigneeIds[0] ?? null,
          priority, status, start_date: startAt, due_date: dueAt, client_visible: clientVisible,
          estimated_minutes: estimatedMinutes,
        },
        {
          onSuccess: (row) => {
            if (assigneeIds.length) {
              setAssignees.mutate({ taskId: row.id, profileIds: assigneeIds, projectId: selectedProject }, { onSuccess, onError })
            } else onSuccess()
          },
          onError,
        },
      )
    }
  }

  return (
    <Drawer
      open={visible}
      // Saving must not be interrupted by Escape or a backdrop click, which is
      // what Modal's `busy` prop used to guard.
      onClose={pending ? () => {} : dismiss}
      // The parent mounts this conditionally, so unmounting is deferred until the
      // slide-out has played.
      onExitComplete={onClose}
      width={560}
      title={<h2 className="font-display font-bold text-[16px] text-text-1 min-w-0 truncate">{isEdit ? 'Edit task' : 'New task'}</h2>}
      footer={
        <div className="flex gap-2.5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={dismiss} disabled={pending}>Cancel</Button>
          <Button size="sm" className="flex-1" onClick={handleSubmit} loading={pending}>{isEdit ? 'Save changes' : 'Create task'}</Button>
        </div>
      }
    >
      <div className="p-5 space-y-4">
        {!lockedProjectId && (
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Project</label>
            <Select value={selectedProject} onChange={(v) => { setSelectedProject(v); setSelectedService(''); setStageId(''); setAssigneeIds([]) }} options={projectOptions} placeholder="Select a project…" />
          </div>
        )}
        {!projectServiceId && serviceOptions.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Service</label>
            <Select
              value={effectiveService}
              onChange={(v) => { setSelectedService(v); setStageId(''); setAssigneeIds([]) }}
              options={serviceOptions}
              placeholder="Select a service…"
            />
          </div>
        )}
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" autoFocus />
        <div className="flex flex-col gap-1.5">
          <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Add details…"
            className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 font-ui text-body-sm text-text-1 placeholder:text-text-3 focus:outline-none focus:border-border-focus focus:shadow-ring-focus resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Stage</label>
            <Select value={stageId} onChange={setStageId} options={stageOptions} placeholder="No stage" />
          </div>
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Assignees</label>
            <MultiSelectPeople value={assigneeIds} onChange={setAssigneeIds} options={memberPeople} />
          </div>
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Priority</label>
            <Select value={priority} onChange={(v) => { if (isPriority(v)) setPriority(v) }} options={priorityOptions} />
          </div>
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Status</label>
            <Select value={status} onChange={(v) => { if (isStatus(v)) setStatus(v) }} options={statusOptions} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Schedule</label>
          <DateTimeRangePicker
            start={startAt}
            end={dueAt}
            onChange={({ start, end }) => { setStartAt(start); setDueAt(end) }}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Time estimate</label>
          <DurationInput value={estimatedMinutes} onChange={setEstimatedMinutes} />
          <p className="font-ui text-[11px] text-text-4">How much work this is — separate from when it&rsquo;s scheduled.</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Track time</label>
          {isEdit ? (
            <TaskTimeTracker taskId={task.id} estimatedMinutes={estimatedMinutes} />
          ) : (
            // Time is logged against a task that exists, so there is nothing to
            // attach an entry to until this form is saved.
            <p className="rounded-md border border-dashed border-border-default bg-surface-inset px-3 py-2.5 font-ui text-[12px] text-text-4">
              Available once the task is created — open it to start a timer or log time.
            </p>
          )}
        </div>
        <label className="flex items-center justify-between gap-3 pt-1">
          <span className="font-ui text-[13px] text-text-2">Visible to client</span>
          <Toggle checked={clientVisible} onChange={setClientVisible} />
        </label>
      </div>
    </Drawer>
  )
}
