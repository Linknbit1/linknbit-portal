import { useMemo, useRef, useState } from 'react'
import { Paperclip, X as XIcon } from 'lucide-react'
import { Drawer } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { DatePicker } from '../../components/ui/DatePicker'
import { TimePicker } from '../../components/ui/TimePicker'
import { DurationInput } from '../../components/ui/DurationInput'
import { Toggle } from '../../components/ui/Toggle'
import { useProjects } from '../../hooks/useProjects'
import { usePeople } from '../../hooks/usePeople'
import { useServiceStages } from '../../hooks/useStages'
import { useAddProjectService, useProjectServices, useProjectServiceMembers } from '../../hooks/useProjectServices'
import { useServices } from '../../hooks/useServices'
import { useCreateTask, useUpdateTask, useMoveTask } from '../../hooks/useTasks'
import { MultiSelectPeople } from '../../components/ui/MultiSelectPeople'
import { RichEditor } from '../../components/editor/RichEditor'
import { useSyncMentions } from '../../hooks/useMentions'
import { TaskTimeTracker } from '../../components/shared/TaskTimeTracker'
import { useSetTaskAssignees } from '../../hooks/useTaskAssignees'
import { useSetTaskReviewers } from '../../hooks/useTaskReviewers'
import { useTaskStatuses } from '../../hooks/useTaskStatuses'
import { useUploadAttachment } from '../../hooks/useAttachments'
import { useCanAccess } from '../../hooks/useRoleFlags'
import { useToast } from '../../components/ui/toast-context'
import { formatFileSize } from '../../lib/attachment'
import { cn } from '../../lib/cn'
import { docToPlainText, extractMentionIds, fromDbDoc, plainTextToDoc, toDbDoc } from '../../lib/richText'
import type { JSONContent } from '@tiptap/react'
import { PRIORITY_LABELS, toDateInput, toTimeInput, fromDateTimeInput } from '../../lib/utils'
import type { TaskListItem } from '../../api/tasks'
import type { Priority } from '../../types'

interface TaskFormModalProps {
  /** Locks the task to this project (project detail view). Omit for the global picker. */
  projectId?: string
  /**
   * Pre-selects a service block — the one currently on screen. Still switchable:
   * a task belongs to Design or Development, and that call is made here rather
   * than by whichever tab happened to be open.
   */
  projectServiceId?: string
  task?: TaskListItem
  defaultStageId?: string
  onClose: () => void
}

/** Marks a dropdown value as "service the project does not have yet". */
const NEW_SERVICE = 'new:'

const PRIORITY_DOTS: Record<Priority, string> = {
  critical: '#F4364C', high: '#F59E0B', medium: '#60A5FA', low: '#8A8A8A',
}

const PRIORITY_ORDER: Priority[] = ['critical', 'high', 'medium', 'low']

const isPriority = (v: string): v is Priority => (PRIORITY_ORDER as string[]).includes(v)

function toPriority(v: string | null | undefined): Priority { return v && isPriority(v) ? v : 'medium' }

export function TaskFormModal({ projectId, projectServiceId, task, defaultStageId, onClose }: TaskFormModalProps) {
  const toast = useToast()
  const isEdit = !!task
  const { data: projects = [] } = useProjects()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const moveTask = useMoveTask()
  const uploadAttachment = useUploadAttachment()
  const canSignOff = useCanAccess('can_approve_tasks')
  const setAssignees = useSetTaskAssignees()
  const setReviewers = useSetTaskReviewers()

  const lockedProjectId = projectId ?? task?.project_id
  const lockedServiceId = projectServiceId ?? task?.project_service_id
  const [selectedProject, setSelectedProject] = useState(lockedProjectId ?? '')
  // A task hangs off a service, so that is picked before stage and assignees.
  const [selectedService, setSelectedService] = useState(lockedServiceId ?? '')
  const { data: services = [] } = useProjectServices(selectedProject || undefined)
  const { data: catalog = [] } = useServices()
  const { data: allMembers = [] } = useProjectServiceMembers(selectedProject || undefined)
  const { data: taskStatuses = [] } = useTaskStatuses()
  // Everyone internal, so somebody can be put on a task before they are staffed.
  const { data: people = [] } = usePeople()
  const addService = useAddProjectService()

  /**
   * The dropdown offers the whole service catalogue, not just the blocks this
   * project already has — otherwise a project set up as Development-only can
   * never receive a Design task. Services the project lacks carry a `new:` value
   * and their block is created on save.
   */
  const serviceOptions = catalog
    .filter((s) => s.is_active)
    .map((s) => {
      const block = services.find((ps) => ps.service_id === s.id)
      return {
        value: block ? block.id : `${NEW_SERVICE}${s.id}`,
        label: block ? s.name : `${s.name}, add to project`,
        dot: s.color,
      }
    })

  // Switching project invalidates the service; fall back to the first option.
  const effectiveService = serviceOptions.some((o) => o.value === selectedService)
    ? selectedService
    : serviceOptions[0]?.value ?? ''
  const pendingNewService = effectiveService.startsWith(NEW_SERVICE)

  // A service the project does not have yet has no stages and nobody staffed, so
  // don't query with a sentinel that isn't a uuid.
  const { data: stages = [] } = useServiceStages(pendingNewService ? undefined : effectiveService || undefined)
  // Who is already staffed on this service. Others can still be picked, and
  // are staffed by a trigger as the link is written.
  const members = pendingNewService ? [] : allMembers.filter((m) => m.project_service_id === effectiveService)

  const [title, setTitle] = useState(task?.title ?? '')
  // The same rich editor the task view uses, so `/` commands and `@` mentions
  // work while a task is being written rather than only after it exists. It is
  // RichEditor rather than DocEditor because DocEditor autosaves against a row
  // id, and on a new task there is no row yet -- mentions are synced on save.
  const [descDoc, setDescDoc] = useState<JSONContent | null>(
    // Tasks written before `description` was mirrored only have the rich `doc`,
    // and older ones only the plain text. Take whichever exists.
    () => fromDbDoc(task?.doc) ?? (task?.description ? plainTextToDoc(task.description) : null),
  )
  const description = useMemo(() => docToPlainText(descDoc), [descDoc])
  const [stageId, setStageId] = useState(task?.stage_id ?? defaultStageId ?? '')
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task?.assignees.map((a) => a.id) ?? [])
  const [reviewerIds, setReviewerIds] = useState<string[]>(task?.reviewers.map((r) => r.id) ?? [])
  const [priority, setPriority] = useState<Priority>(toPriority(task?.priority))
  // Open-ended now: a new column added on the Statuses screen is a valid value
  // here without this file knowing about it. Empty until the statuses arrive —
  // `effectiveStatus` below is what the form actually reads.
  const [status, setStatus] = useState<string>(task?.status ?? '')
  // Deadline only — a task is "due by", not "scheduled from". start_date is left
  // untouched on existing rows rather than silently wiped.
  const [dueDay, setDueDay] = useState(toDateInput(task?.due_date))
  const [dueTime, setDueTime] = useState(toTimeInput(task?.due_date) || '18:00')
  const dueAt = dueDay ? fromDateTimeInput(dueDay, dueTime) : null
  const [clientVisible, setClientVisible] = useState(task?.client_visible ?? false)
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(task?.estimated_minutes ?? null)
  // Files chosen before the task exists. There is no task_id to attach them to
  // until save, so they wait here with their descriptions and upload after.
  const [pendingFiles, setPendingFiles] = useState<{ file: File; description: string }[]>([])
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Drives the slide-out; the real `onClose` runs once the animation finishes.
  const [visible, setVisible] = useState(true)
  const dismiss = () => setVisible(false)

  const syncMentions = useSyncMentions()
  // DocEditor records mentions as it autosaves; here there is one save, so the
  // same job is done once the row is known to exist. Fire-and-forget: a mention
  // that fails to record must not fail the task that carries it.
  const recordMentions = (taskId: string, projectId: string) => {
    const ids = extractMentionIds(descDoc)
    if (ids.length === 0) return
    syncMentions.mutate({ sourceType: 'task', sourceId: taskId, projectId, profileIds: ids })
  }

  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }))
  const stageOptions = [{ value: '', label: 'No stage' }, ...stages.map((s) => ({ value: s.id, label: s.name }))]
  /**
   * Anyone internal, not just whoever is already staffed on this service.
   *
   * Picking someone new staffs them onto the service as the task saves, the same
   * way choosing a service the project does not run adds the service. Offering
   * only the current roster meant leaving the form, staffing them, and coming
   * back, which is why so much work ended up on whoever happened to be there.
   *
   * Staffed members are listed first: they are the likely answer, and the rest
   * are there for when they are not.
   */
  const staffedIds = new Set(members.map((m) => m.id))
  const assignablePeople = [
    ...members.map((m) => ({ id: m.id, name: m.name, avatar_url: m.avatar_url })),
    ...people
      .filter((p) => p.is_active && !staffedIds.has(p.id))
      .map((p) => ({ id: p.id, name: p.name, avatar_url: p.avatar_url })),
  ]
  const priorityOptions = PRIORITY_ORDER.map((p) => ({ value: p, label: PRIORITY_LABELS[p], dot: PRIORITY_DOTS[p] }))
  // Approved/Completed are a sign-off, refused by fn_guard_task_approval for
  // anyone without can_approve_tasks. The task's current status stays listed so
  // editing an approved task doesn't blank the field.
  // Sign-off columns are hidden from anyone who cannot move a task into one,
  // except the status the task already has, so editing an approved task does not
  // blank the field.
  const statusOptions = taskStatuses
    .filter((s) => canSignOff || !s.is_signoff || s.key === task?.status)
    .map((s) => ({ value: s.key, label: s.label, dot: s.color }))
  /**
   * Statuses only arrive after first paint, so a new task starts with nothing
   * picked. Falling back to the column marked default is what the board itself
   * assumes; sending the empty string instead reached Postgres as a task_statuses
   * foreign key violation the moment somebody saved without touching the field.
   */
  const defaultStatusKey = taskStatuses.find((s) => s.is_default)?.key ?? taskStatuses[0]?.key ?? ''
  const effectiveStatus = statusOptions.some((o) => o.value === status) ? status : defaultStatusKey

  const pending = createTask.isPending || updateTask.isPending || addService.isPending || moveTask.isPending || uploadAttachment.isPending

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return
    setPendingFiles((prev) => [...prev, ...Array.from(list).map((file) => ({ file, description: '' }))])
  }

  /** Uploads sequentially so one rejected file doesn't take the rest with it. */
  const uploadPending = async (taskId: string, projectIdForFiles: string) => {
    for (const { file, description } of pendingFiles) {
      await uploadAttachment.mutateAsync({
        file,
        args: { projectId: projectIdForFiles, taskId, description, clientVisible: false },
      })
    }
  }

  const handleSubmit = async () => {
    if (!selectedProject) { toast('Choose a project', 'error'); return }
    if (!effectiveService) { toast('Choose a service', 'error'); return }
    if (!title.trim()) { toast('Task title is required', 'error'); return }
    if (!description.trim()) { toast('A description is required', 'error'); return }
    if (!dueAt) { toast('A deadline is required', 'error'); return }
    if (!effectiveStatus) { toast('Statuses are still loading — try again in a moment', 'error'); return }
    const onSuccess = () => { toast(isEdit ? 'Task updated' : 'Task created', 'success'); dismiss() }
    const onError = (e: unknown) => toast(e instanceof Error ? e.message : 'Save failed', 'error')

    // A task must hang off a real project_service row, so a service the project
    // does not have yet is added first and the task points at the new block.
    let serviceBlockId = effectiveService
    if (pendingNewService) {
      try {
        const block = await addService.mutateAsync({
          projectId: selectedProject,
          serviceId: effectiveService.slice(NEW_SERVICE.length),
        })
        serviceBlockId = block.id
      } catch (e) {
        onError(e)
        return
      }
    }

    if (isEdit) {
      updateTask.mutate(
        {
          id: task.id,
          updates: {
            title: title.trim(),
            // Both halves together: editing the plain mirror here would otherwise
            // leave the rich doc stale and the task view showing the old text.
            description: description.trim(),
            doc: toDbDoc(descDoc),
            stage_id: stageId || null,
            priority, status: effectiveStatus, due_date: dueAt, client_visible: clientVisible,
            estimated_minutes: estimatedMinutes,
          },
        },
        {
          onSuccess: () => {
            recordMentions(task.id, task.project_id)
            const moved = serviceBlockId !== task.project_service_id
            const afterAssignees = () => {
              // Moving last: the field edits above are scoped to the task, while
              // this re-homes it (and its files) under another project.
              if (!moved) { onSuccess(); return }
              moveTask.mutate(
                {
                  taskId: task.id,
                  projectServiceId: serviceBlockId,
                  stageId: stageId || null,
                  fromProjectId: task.project_id,
                },
                { onSuccess, onError },
              )
            }
            setAssignees.mutate(
              { taskId: task.id, profileIds: assigneeIds, projectId: task.project_id },
              {
                onSuccess: () => setReviewers.mutate(
                  { taskId: task.id, profileIds: reviewerIds, projectId: task.project_id },
                  { onSuccess: afterAssignees, onError },
                ),
                onError,
              },
            )
          },
          onError,
        },
      )
    } else {
      createTask.mutate(
        {
          project_id: selectedProject,
          project_service_id: serviceBlockId,
          title: title.trim(),
          description: description.trim(),
          doc: toDbDoc(descDoc),
          stage_id: stageId || null,
          assignee_id: assigneeIds[0] ?? null,
          priority, status: effectiveStatus, due_date: dueAt, client_visible: clientVisible,
          estimated_minutes: estimatedMinutes,
        },
        {
          onSuccess: async (row) => {
            recordMentions(row.id, selectedProject)
            try {
              await uploadPending(row.id, selectedProject)
            } catch (e) {
              // The task is already saved; say what failed rather than pretending.
              onError(new Error(e instanceof Error ? `Task created, but a file failed to upload: ${e.message}` : 'Task created, but a file failed to upload'))
              dismiss()
              return
            }
            const withReviewers = () => {
              if (reviewerIds.length === 0) { onSuccess(); return }
              setReviewers.mutate(
                { taskId: row.id, profileIds: reviewerIds, projectId: selectedProject },
                { onSuccess, onError },
              )
            }
            if (assigneeIds.length) {
              setAssignees.mutate(
                { taskId: row.id, profileIds: assigneeIds, projectId: selectedProject },
                { onSuccess: withReviewers, onError },
              )
            } else withReviewers()
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
        {/* Always offered, even inside a project: stages and assignable people are
            per service, so this is the field that decides both. */}
        {serviceOptions.length > 0 && (
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
          <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">
            Description <span className="text-brand-red">*</span>
          </label>
          <div className="min-h-[76px] w-full rounded-md border border-border-default bg-surface-inset px-3 py-2 focus-within:border-border-focus focus-within:shadow-ring-focus">
            <RichEditor
              value={descDoc}
              onChange={setDescDoc}
              mentionItems={assignablePeople}
              placeholder="What does done look like? Type / for commands, @ to mention"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Stage</label>
            <Select value={stageId} onChange={setStageId} options={stageOptions} placeholder="No stage" />
          </div>
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Assignees</label>
            <MultiSelectPeople value={assigneeIds} onChange={setAssigneeIds} options={assignablePeople} closeOnSelect />
          </div>
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Reviewers</label>
            <MultiSelectPeople value={reviewerIds} onChange={setReviewerIds} options={assignablePeople} closeOnSelect />
          </div>
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Priority</label>
            <Select value={priority} onChange={(v) => { if (isPriority(v)) setPriority(v) }} options={priorityOptions} />
          </div>
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Status</label>
            <Select value={effectiveStatus} onChange={setStatus} options={statusOptions} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">
            Deadline <span className="text-brand-red">*</span>
          </label>
          <div className="flex gap-2">
            <DatePicker value={dueDay} onChange={setDueDay} placeholder="Pick a date" className="flex-1" />
            <TimePicker value={dueTime} onChange={setDueTime} step={15} disabled={!dueDay} className="w-36" />
          </div>
        </div>
        {/* Documents. On a new task these wait for the row to exist; on an
            existing one the Files tab already owns them. */}
        {!isEdit && (
          <div className="space-y-2">
            <label className="block text-label font-ui font-semibold text-text-2 uppercase tracking-wider">
              Documents
              {pendingFiles.length > 0 && (
                <span className="ml-1.5 font-mono text-[10px] normal-case tracking-normal text-text-4">
                  {pendingFiles.length} file{pendingFiles.length === 1 ? '' : 's'}
                </span>
              )}
            </label>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
            />

            {/* A drop target rather than a lone button: files usually arrive by
                drag, and it gives the empty state something to say. */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
              className={cn(
                'flex w-full flex-col items-center gap-1 rounded-md border border-dashed px-3 py-4 transition-colors',
                dragging
                  ? 'border-brand-red bg-brand-red/5'
                  : 'border-border-default bg-surface-inset hover:border-border-strong',
              )}
            >
              <Paperclip size={15} className="text-text-4" />
              <span className="font-ui text-[12.5px] text-text-2">
                <span className="font-semibold text-text-1">Choose files</span> or drop them here
              </span>
              <span className="font-ui text-[11px] text-text-4">Add a note to each so the next person knows what it is</span>
            </button>

            {pendingFiles.length > 0 && (
              <div className="space-y-1.5">
                {pendingFiles.map((entry, i) => (
                  <div key={`${entry.file.name}-${i}`} className="rounded-md border border-border-default bg-surface-1 p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-surface-2 text-text-3">
                        <Paperclip size={12} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-ui text-[12.5px] text-text-1">{entry.file.name}</span>
                        <span className="block font-mono text-[10px] text-text-4">{formatFileSize(entry.file.size)}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        aria-label={`Remove ${entry.file.name}`}
                        className="flex size-7 shrink-0 items-center justify-center rounded-sm text-text-4 transition-colors hover:bg-error/10 hover:text-error"
                      >
                        <XIcon size={13} />
                      </button>
                    </div>
                    <input
                      value={entry.description}
                      onChange={(e) => setPendingFiles((prev) => prev.map((f, idx) => (idx === i ? { ...f, description: e.target.value } : f)))}
                      placeholder="What is this file? (optional)"
                      className="mt-2 w-full rounded-sm border border-border-default bg-surface-inset px-2.5 py-1.5 font-ui text-[12px] text-text-1 outline-none transition-colors placeholder:text-text-4 hover:border-border-strong focus:border-border-focus"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Time estimate</label>
          <DurationInput value={estimatedMinutes} onChange={setEstimatedMinutes} />
          <p className="font-ui text-[11px] text-text-4">How much work this is, separate from when it&rsquo;s scheduled.</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Track time</label>
          {isEdit ? (
            <TaskTimeTracker taskId={task.id} estimatedMinutes={estimatedMinutes} />
          ) : (
            // Time is logged against a task that exists, so there is nothing to
            // attach an entry to until this form is saved.
            <p className="rounded-md border border-dashed border-border-default bg-surface-inset px-3 py-2.5 font-ui text-[12px] text-text-4">
              Available once the task is created, open it to start a timer or log time.
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
