import { useMemo, useState, type ReactNode } from 'react'
import type { JSONContent } from '@tiptap/react'
import {
  Plus, Trash2, Send, CheckCircle2, MessageSquare, ListChecks, RotateCcw, Pencil,
  CircleDot, UserRound, CalendarDays, Flag, Layers, Eye, Paperclip, Bell, BellOff, Timer, Clock, History,
  CornerUpRight,
  type LucideIcon, CheckCheck,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { DocEditor } from '../../components/editor/DocEditor'
import { RichEditor } from '../../components/editor/RichEditor'
import { RichRenderer } from '../../components/editor/RichRenderer'
import { docToPlainText, extractMentionIds, toDbDoc, fromDbDoc, plainTextToDoc } from '../../lib/richText'
import { useSyncMentions } from '../../hooks/useMentions'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { MultiSelectPeople } from '../../components/ui/MultiSelectPeople'
import { useSetTaskAssignees } from '../../hooks/useTaskAssignees'
import { useSetTaskReviewers } from '../../hooks/useTaskReviewers'
import { useTaskStatuses } from '../../hooks/useTaskStatuses'
import { DateTimeRangePicker } from '../../components/ui/DateTimeRangePicker'
import { DurationInput } from '../../components/ui/DurationInput'
import { TaskTimeTracker } from '../../components/shared/TaskTimeTracker'
import { Toggle } from '../../components/ui/Toggle'
import { Avatar } from '../../components/ui/Avatar'
import { PersonLink } from '../../components/shared/PersonLink'
import { Skeleton } from '../../components/ui/Skeleton'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ImpactSummary } from '../../components/ui/ImpactSummary'
import { ServiceChip } from '../../components/shared/ServiceChip'
import { SaveIndicator } from '../../components/shared/SaveIndicator'
import { AttachmentUploader } from '../../components/shared/AttachmentUploader'
import { useToast } from '../../components/ui/toast-context'
import { useSaveStatus } from '../../hooks/useSaveStatus'
import { formatRelativeTime, PRIORITY_LABELS } from '../../lib/utils'
import { useTask, useUpdateTask, useDeleteTask, useTaskDeleteImpact } from '../../hooks/useTasks'
import { useStages } from '../../hooks/useStages'
import { useProject } from '../../hooks/useProjects'
import type { PersonMini } from '../../api/projects'
import { useProjectServiceMembers } from '../../hooks/useProjectServices'
import { usePeople } from '../../hooks/usePeople'
import { ON_SERVICE, NOT_ON_SERVICE } from '../../constants/pickerGroups'
import { useProjectFiles, useTaskAttachments } from '../../hooks/useAttachments'
import { fileKind } from '../../lib/attachment'
import { useSubtasks, useCreateSubtask, useToggleSubtask, useDeleteSubtask } from '../../hooks/useSubtasks'
import { useComments, useCreateComment, useUpdateComment, useDeleteComment } from '../../hooks/useComments'
import { useRealtimeComments } from '../../hooks/realtime/useRealtimeComments'
import { useRealtimeTaskActivity } from '../../hooks/realtime/useRealtimeTaskActivity'
import { useTaskActivity } from '../../hooks/useAuditLog'
import { useTaskWatch } from '../../hooks/useWatchers'
import { useAuthContext } from '../../context/AuthContext'
import { useCanAccess } from '../../hooks/useRoleFlags'
import { MoveTaskModal } from '../../components/shared/MoveTaskModal'
import { describeTaskActivity } from '../../lib/taskActivity'
import type { Priority } from '../../types'

const PRIORITY_ORDER: Priority[] = ['critical', 'high', 'medium', 'low']
const PRIORITY_DOTS: Record<Priority, string> = { critical: '#F4364C', high: '#F59E0B', medium: '#60A5FA', low: '#8A8A8A' }
const isPriority = (v: string): v is Priority => (PRIORITY_ORDER as string[]).includes(v)

/**
 * Click-to-rename heading. Saves on Enter or blur, reverts on Escape, and never
 * writes an empty title (the column is NOT NULL) or an unchanged one.
 */
function EditableTitle({ value, onSave }: { value: string; onSave: (next: string) => void }) {
  const [editing, setEditing] = useState(false)
  // Seeded when editing starts rather than synced from `value`, so a rename by
  // someone else can't overwrite what this user is typing — and the read-only
  // branch renders `value` directly, so it still reflects those changes.
  const [draft, setDraft] = useState('')

  const commit = () => {
    setEditing(false)
    const next = draft.trim()
    if (!next || next === value) return
    onSave(next)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') setEditing(false)
        }}
        aria-label="Task name"
        className="w-full rounded-sm border border-border-focus bg-surface-inset px-2 py-1 font-display text-[18px] font-bold text-text-1 outline-none"
      />
    )
  }

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true) }}
      title="Rename task"
      className="group flex w-full items-start gap-2 rounded-sm px-2 py-1 -mx-2 text-left transition-colors hover:bg-surface-2"
    >
      <h2 className="font-display text-[18px] font-bold text-text-1">{value}</h2>
      {/* Visible on touch, where there is no hover to reveal it. */}
      <Pencil size={13} className="mt-1.5 shrink-0 text-text-4 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100" />
    </button>
  )
}

/** A ClickUp-style property row: icon + label on the left, control on the right. */
function PropertyRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-9 items-center gap-3 py-0.5">
      <span className="flex w-28 shrink-0 items-center gap-1.5 font-ui text-[12.5px] text-text-3">
        <Icon size={13} className="shrink-0 text-text-4" /> {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

/** Subtle "Add subtask" / "Attach file" row that reveals its section. */
function ActionRow({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="-mx-2 flex items-center gap-2 rounded-sm px-2 py-1.5 font-ui text-[12.5px] text-text-3 transition-colors hover:bg-surface-2 hover:text-text-1"
    >
      <Icon size={14} className="text-text-4" /> {label}
    </button>
  )
}

interface TaskDetailContentProps {
  taskId: string
  onClosed?: () => void
  /**
   * Fill the parent's height and scroll the two columns independently — what the
   * drawer wants. The full page leaves it off and scrolls normally instead.
   */
  fill?: boolean
}

export function TaskDetailContent({ taskId, onClosed, fill }: TaskDetailContentProps) {
  const toast = useToast()
  const { saveState, markSaving, markSaved, markFailed } = useSaveStatus()
  const { data: task, isLoading } = useTask(taskId)
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { data: deleteImpact, isLoading: deleteImpactLoading } = useTaskDeleteImpact(confirmDelete ? taskId : undefined)
  useRealtimeComments(taskId)
  useRealtimeTaskActivity(taskId)

  const projectId = task?.project_id
  const { data: stages = [] } = useStages(projectId)
  const { data: allMembers = [] } = useProjectServiceMembers(projectId)
  // Everyone internal, so somebody can be put on a task before they are staffed
  // — the same offer the create form makes.
  const { data: people = [] } = usePeople()
  const { data: taskStatuses = [] } = useTaskStatuses()
  // Only for the mention list: a project's managers are taggable on its tasks.
  const { data: project } = useProject(projectId)
  // Assignable people are the ones staffed on this task's service, not the whole project.
  const members = useMemo(
    () => allMembers.filter((m) => m.project_service_id === task?.project_service_id),
    [allMembers, task?.project_service_id],
  )

  /**
   * Who can be tagged here: the people staffed on this service, plus whoever
   * manages the project.
   *
   * A manager is not necessarily staffed on any service of the project they
   * run, so without this the one person who answers for the work could not be
   * pulled into a conversation about it.
   */
  const mentionPeople = useMemo(() => {
    // PersonMini is all the editor needs, and it is the common shape between a
    // service member and a manager.
    const byId = new Map<string, PersonMini>(
      members.map((m) => [m.id, { id: m.id, name: m.name, avatar_url: m.avatar_url }]),
    )
    for (const m of project?.managers ?? []) {
      if (!byId.has(m.id) && m.is_active !== false) {
        byId.set(m.id, { id: m.id, name: m.name, avatar_url: m.avatar_url })
      }
    }
    return [...byId.values()]
  }, [members, project?.managers])

  /**
   * Who the assignee and reviewer pickers offer, in three bands.
   *
   * The staffed members first, then everyone else internal, then anyone already
   * on the task who has since left.
   *
   * The middle band is the same offer the create form makes, and it was missing
   * here — so a task could be given to somebody outside the service while being
   * written, and never afterwards. Picking one of them staffs them onto the
   * service as the link is written (fn_staff_service_on_task_link), exactly as
   * choosing a service the project does not run adds the service.
   *
   * The last band is not an offer at all: a leaver's id stays in `value`, and
   * without a matching option the field would read "Unassigned" while the row
   * still exists — the task would look like nobody's problem instead of
   * somebody's to hand over.
   */
  const assigneeOptions = useMemo(() => {
    const staffed = members.map((m) => ({
      id: m.id, name: m.name, avatar_url: m.avatar_url, group: ON_SERVICE,
    }))
    const staffedIds = new Set(staffed.map((m) => m.id))
    const unstaffed = people
      .filter((p) => p.is_active && !staffedIds.has(p.id))
      .map((p) => ({ id: p.id, name: p.name, avatar_url: p.avatar_url, group: NOT_ON_SERVICE }))
    const known = new Set([...staffedIds, ...unstaffed.map((p) => p.id)])
    const departed = [...(task?.assignees ?? []), ...(task?.reviewers ?? [])]
      .filter((a) => a.is_active === false && !known.has(a.id))
      .map((a) => ({ id: a.id, name: a.name, avatar_url: a.avatar_url, departed: true }))
    return [...staffed, ...unstaffed, ...departed]
  }, [members, people, task?.assignees, task?.reviewers])
  const { data: projectFiles = [] } = useProjectFiles(projectId)
  const fileItems = useMemo(() => projectFiles.map((f) => ({
    id: f.id, name: f.file_name, kind: f.kind === 'link' ? 'link' : fileKind(f.mime_type, f.file_name),
  })), [projectFiles])
  const { data: subtasks = [] } = useSubtasks(taskId)
  const { data: comments = [] } = useComments(taskId)
  const createSubtask = useCreateSubtask()
  const toggleSubtask = useToggleSubtask()
  const deleteSubtask = useDeleteSubtask()
  const createComment = useCreateComment()
  const updateComment = useUpdateComment()
  const deleteComment = useDeleteComment()
  const syncMentions = useSyncMentions()
  const setAssignees = useSetTaskAssignees()
  const setReviewers = useSetTaskReviewers()

  // Assignees and the creator are subscribed server-side without a row, so the
  // bell has to reflect that before the user has ever touched it.
  const { profile } = useAuthContext()
  const implicitlySubscribed = !!profile
    && (task?.assignees.some((a) => a.id === profile.id) || task?.created_by === profile.id)
  const watch = useTaskWatch(taskId, !!implicitlySubscribed)

  const [newSubtask, setNewSubtask] = useState('')
  const [commentDoc, setCommentDoc] = useState<JSONContent | null>(null)
  // Which comment is open for editing, and its working copy.
  const [editingComment, setEditingComment] = useState<{ id: string; doc: JSONContent | null } | null>(null)
  const [pendingCommentDelete, setPendingCommentDelete] = useState<string | null>(null)
  const [composerKey, setComposerKey] = useState(0)
  const [commentInternal, setCommentInternal] = useState(true)
  // Sections start collapsed behind a quick-action row, but open on their own
  // once the task actually has something in them.
  const [subtasksOpen, setSubtasksOpen] = useState(false)
  const [filesOpen, setFilesOpen] = useState(false)
  const [railTab, setRailTab] = useState<'comments' | 'activity'>('comments')
  const [moving, setMoving] = useState(false)
  const canMoveTask = useCanAccess('can_manage_projects')
  const canModerateComments = useCanAccess('can_moderate_comments')
  const canSignOff = useCanAccess('can_approve_tasks')

  const { data: activity = [] } = useTaskActivity(taskId)
  const { data: taskFiles = [] } = useTaskAttachments(taskId)

  // Resolves the ids inside audit rows (assignee, stage) to readable names.
  const activityNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of allMembers) map.set(m.id, m.name)
    for (const s of stages) map.set(s.id, s.name)
    return map
  }, [allMembers, stages])

  /** Comments and audit events on one timeline, oldest first (composer sits below). */
  /**
   * Comments read oldest-first like a conversation, with the composer beneath.
   * Field changes read newest-first: merged into one list they were appended at
   * the bottom, so a fresh priority change landed below the fold and looked like
   * it had not been recorded at all.
   */
  const commentFeed = useMemo(
    () => [...comments].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [comments],
  )
  const eventFeed = useMemo(
    () => describeTaskActivity(activity, activityNames).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [activity, activityNames],
  )

  const showSubtasks = subtasksOpen || subtasks.length > 0
  const showFiles = filesOpen || taskFiles.length > 0

  if (isLoading) return <div className="p-5 space-y-3"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-24" /><Skeleton className="h-32" /></div>
  // Deliberately one message for "gone" and "not yours": task visibility is
  // assignment-based now, so a mention can hand somebody a link to a task they
  // cannot open, and saying which of the two it is would confirm it exists.
  if (!task) {
    return (
      <div className="p-8 text-center font-ui text-[13px] text-text-3">
        This task is not available. It may have been deleted, or it may not be one you have access to.
      </div>
    )
  }

  // Every property here saves on change, so each write reports into the header
  // badge — otherwise an edit landing (or failing) is invisible.
  const patch = (updates: Parameters<typeof updateTask.mutate>[0]['updates']) => {
    markSaving()
    updateTask.mutate({ id: task.id, updates }, {
      onSuccess: () => markSaved(),
      onError: (e) => { markFailed(); toast(e instanceof Error ? e.message : 'Update failed', 'error') },
    })
  }

  const stageOptions = [{ value: '', label: 'No stage' }, ...stages.map((s) => ({ value: s.id, label: s.name }))]
  const statusOptions = taskStatuses
    .filter((s) => canSignOff || !s.is_signoff || s.key === task?.status)
    .map((s) => ({ value: s.key, label: s.label }))
  const priorityOptions = PRIORITY_ORDER.map((p) => ({ value: p, label: PRIORITY_LABELS[p], dot: PRIORITY_DOTS[p] }))

  const addSubtask = () => {
    if (!newSubtask.trim()) return
    createSubtask.mutate({ taskId, title: newSubtask.trim() }, { onError: (e) => toast(e instanceof Error ? e.message : 'Failed', 'error') })
    setNewSubtask('')
  }

  const saveCommentEdit = () => {
    if (!editingComment) return
    const doc = editingComment.doc
    updateComment.mutate(
      { id: editingComment.id, taskId, args: { content: docToPlainText(doc), doc: toDbDoc(doc) } },
      {
        onSuccess: () => setEditingComment(null),
        onError: (e) => toast(e instanceof Error ? e.message : 'Could not save the edit', 'error'),
      },
    )
  }

  const removeComment = (id: string) => {
    deleteComment.mutate({ id, taskId }, {
      onSuccess: () => { toast('Comment deleted', 'success'); setPendingCommentDelete(null) },
      onError: (e) => toast(e instanceof Error ? e.message : 'Could not delete the comment', 'error'),
    })
  }

  const sendComment = () => {
    const content = docToPlainText(commentDoc)
    if (!content.trim()) return
    createComment.mutate(
      { taskId, args: { content, doc: toDbDoc(commentDoc), isInternal: commentInternal } },
      {
        onSuccess: (row) => {
          syncMentions.mutate({ sourceType: 'comment', sourceId: row.id, projectId: task.project_id, profileIds: extractMentionIds(commentDoc) })
          setCommentDoc(null)
          setComposerKey((k) => k + 1)
        },
        onError: (e) => toast(e instanceof Error ? e.message : 'Failed', 'error'),
      },
    )
  }

  const isDone = task.status === 'completed' || task.status === 'approved'
  const toggleComplete = () => {
    if (!isDone && !canSignOff) {
      toast('Only a project manager or team lead can mark a task complete', 'error')
      return
    }
    patch({ status: isDone ? 'in_progress' : 'completed' })
    toast(isDone ? 'Task reopened' : 'Task marked complete', 'success')
  }

  const confirmTaskDelete = () => {
    deleteTask.mutate({ id: task.id, projectId: task.project_id }, {
      onSuccess: () => { toast('Task deleted', 'success'); setConfirmDelete(false); onClosed?.() },
      onError: (e) => toast(e instanceof Error ? e.message : 'Failed', 'error'),
    })
  }

  return (
    // Two independently scrolling panes only make sense side by side. Stacked on
    // mobile the whole thing scrolls as one column — otherwise the shrink-0
    // activity rail claims the full height and collapses the fields above it.
    <div className={cn('flex flex-col lg:flex-row', fill && 'h-full min-h-0 overflow-y-auto lg:overflow-hidden')}>
      {/* ── Main column ───────────────────────────────────────────────── */}
      <div className={cn('min-w-0 flex-1 space-y-5 p-4 sm:p-5 lg:p-6', fill && 'lg:overflow-y-auto')}>
      {/* Header */}
      <div className="space-y-2">
        <div className="flex min-h-5 items-center gap-2 flex-wrap">
          {canMoveTask ? (
            <button
              onClick={() => setMoving(true)}
              title="Move this task to another project"
              className="group/loc -mx-1 flex min-w-0 items-center gap-2 rounded-sm px-1 py-0.5 transition-colors hover:bg-surface-2"
            >
              {task.project_service?.service && <ServiceChip service={task.project_service.service.slug} />}
              {task.project?.name && <span className="truncate font-ui text-[12px] text-text-3 group-hover/loc:text-text-1">{task.project.name}</span>}
              <CornerUpRight size={11} className="shrink-0 text-text-4 opacity-0 transition-opacity group-hover/loc:opacity-100" />
            </button>
          ) : (
            <>
              {task.project_service?.service && <ServiceChip service={task.project_service.service.slug} />}
              {task.project?.name && <span className="font-ui text-[12px] text-text-3">{task.project.name}</span>}
            </>
          )}
          <SaveIndicator state={saveState} className="ml-auto" />
        </div>
        <EditableTitle value={task.title} onSave={(title) => patch({ title })} />
      </div>

      {/* Properties — label on the left, control on the right, two columns */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-0.5 sm:grid-cols-2">
        <PropertyRow icon={CircleDot} label="Status">
          <Select value={task.status} onChange={(v) => patch({ status: v })} options={statusOptions} size="sm" />
        </PropertyRow>
        <PropertyRow icon={UserRound} label="Assignees">
          <MultiSelectPeople
            value={task.assignees.map((a) => a.id)}
            onChange={(ids) => {
              markSaving()
              setAssignees.mutate(
                {
                  taskId: task.id,
                  profileIds: ids,
                  projectId: task.project_id,
                  // Resolved here so the picker updates on click; the save then
                  // catches up in the background.
                  people: ids.flatMap((id) => {
                    // The full option list, not just the staffed members: someone
                    // picked from outside the service would otherwise vanish from
                    // the chips until the refetch landed.
                    const m = assigneeOptions.find((p) => p.id === id)
                    return m ? [{ id: m.id, name: m.name, avatar_url: m.avatar_url }] : []
                  }),
                },
                {
                  onSuccess: () => markSaved(),
                  onError: (e) => { markFailed(); toast(e instanceof Error ? e.message : 'Failed', 'error') },
                },
              )
            }}
            options={assigneeOptions}
            size="sm"
            closeOnSelect
          />
        </PropertyRow>
        <PropertyRow icon={CheckCheck} label="Reviewers">
          <MultiSelectPeople
            value={task.reviewers.map((r) => r.id)}
            onChange={(ids) => {
              markSaving()
              setReviewers.mutate(
                { taskId: task.id, profileIds: ids, projectId: task.project_id },
                {
                  onSuccess: () => markSaved(),
                  onError: (e) => { markFailed(); toast(e instanceof Error ? e.message : 'Failed', 'error') },
                },
              )
            }}
            options={assigneeOptions}
            size="sm"
            closeOnSelect
          />
        </PropertyRow>
        <PropertyRow icon={CalendarDays} label="Schedule">
          <DateTimeRangePicker
            start={task.start_date}
            end={task.due_date}
            // Both halves in one patch, so the activity log records a single edit.
            onChange={({ start, end }) => patch({ start_date: start, due_date: end })}
          />
        </PropertyRow>
        <PropertyRow icon={Timer} label="Time estimate">
          <DurationInput
            value={task.estimated_minutes}
            onChange={(minutes) => patch({ estimated_minutes: minutes })}
          />
        </PropertyRow>
        <PropertyRow icon={Flag} label="Priority">
          <Select value={task.priority} onChange={(v) => { if (isPriority(v)) patch({ priority: v }) }} options={priorityOptions} size="sm" />
        </PropertyRow>
        <PropertyRow icon={Layers} label="Stage">
          <Select value={task.stage_id ?? ''} onChange={(v) => patch({ stage_id: v || null })} options={stageOptions} size="sm" />
        </PropertyRow>
        <PropertyRow icon={Eye} label="Client visible">
          <div className="flex h-9 items-center"><Toggle checked={task.client_visible} onChange={(v) => patch({ client_visible: v })} /></div>
        </PropertyRow>
      </div>

      {/* Time tracking — a widget, not a property, so it gets its own full-width
          block rather than being squeezed into a label/control row. */}
      <section className="space-y-2.5 rounded-lg border border-border-default bg-surface-2/25 p-4">
        <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider flex items-center gap-1.5">
          <Clock size={13} /> Time tracking
        </label>
        <TaskTimeTracker taskId={task.id} estimatedMinutes={task.estimated_minutes} />
      </section>

      {/* Description — chromeless until hovered/focused, like ClickUp */}
      <div className="-mx-3 rounded-md border border-transparent px-3 py-2 transition-colors hover:border-border-default focus-within:border-border-focus focus-within:bg-surface-inset">
        <DocEditor
          key={task.id}
          // Descriptions typed in the task form only ever wrote `description`,
          // so fall back to it when there is no rich doc yet — otherwise this
          // editor looks empty on a task that plainly has a description.
          value={task.doc ?? toDbDoc(plainTextToDoc(task.description ?? ''))}
          // `description` is the plain-text mirror of `doc` — it feeds the task
          // form, board card excerpts and the activity feed, none of which can
          // read ProseMirror JSON. Writing only `doc` left all three blank.
          onSave={(doc) => patch({ doc, description: docToPlainText(fromDbDoc(doc)) || null })}
          mentionItems={mentionPeople}
          fileItems={fileItems}
          source={{ type: 'task', id: task.id, projectId: task.project_id }}
          placeholder="Add description… type / for commands, @ to mention"
        />
      </div>

      {/* Quick actions — reveal the section they belong to */}
      {(!showSubtasks || !showFiles) && (
        <div className="flex flex-col items-start gap-0.5">
          {!showSubtasks && <ActionRow icon={ListChecks} label="Add subtask" onClick={() => setSubtasksOpen(true)} />}
          {!showFiles && <ActionRow icon={Paperclip} label="Attach file" onClick={() => setFilesOpen(true)} />}
        </div>
      )}

      {/* Subtasks */}
      {showSubtasks && (
      <div className="space-y-2">
        <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider flex items-center gap-1.5"><ListChecks size={13} /> Subtasks</label>
        {subtasks.map((s) => (
          <div key={s.id} className="flex items-center gap-2.5 group">
            <button
              onClick={() => toggleSubtask.mutate({ id: s.id, completed: !s.completed, taskId })}
              className={cnCheck(s.completed)}
              aria-label={s.completed ? 'Mark incomplete' : 'Mark complete'}
            >
              {s.completed && <CheckCircle2 size={13} />}
            </button>
            <span className={s.completed ? 'flex-1 font-ui text-[13px] text-text-4 line-through' : 'flex-1 font-ui text-[13px] text-text-1'}>{s.title}</span>
            <button onClick={() => deleteSubtask.mutate({ id: s.id, taskId })} className="size-6 rounded-sm flex items-center justify-center text-text-4 hover:text-error opacity-0 group-hover:opacity-100" aria-label="Delete subtask"><Trash2 size={12} /></button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <input
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addSubtask() }}
            placeholder="Add a subtask…"
            className="flex-1 bg-surface-inset border border-border-default rounded-md px-3 h-8 font-ui text-[12.5px] text-text-1 placeholder:text-text-3 focus:outline-none focus:border-border-focus"
          />
          <button onClick={addSubtask} className="size-8 rounded-sm bg-surface-2 border border-border-default flex items-center justify-center text-text-2 hover:text-text-1" aria-label="Add"><Plus size={14} /></button>
        </div>
      </div>
      )}

      {/* Files */}
      {showFiles && (
        <div className="space-y-2">
          <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider flex items-center gap-1.5"><Paperclip size={13} /> Files</label>
          <AttachmentUploader projectId={task.project_id} taskId={task.id} />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-border-subtle pt-4">
        <Button size="sm" variant={isDone ? 'secondary' : 'primary'} iconLeft={isDone ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />} onClick={toggleComplete}>{isDone ? 'Reopen' : 'Mark complete'}</Button>
        <Button
          size="sm"
          variant={watch.isSubscribed ? 'primary' : 'secondary'}
          iconLeft={watch.isSubscribed ? <Bell size={14} /> : <BellOff size={14} />}
          loading={watch.isPending}
          onClick={() => watch.toggle()}
          title={watch.isSubscribed
            ? 'You get status, priority and due-date updates for this task'
            : 'Muted, only @mentions will reach you'}
        >
          {watch.isSubscribed ? 'Notifying' : 'Muted'}
        </Button>
        <Button size="sm" variant="danger" iconLeft={<Trash2 size={14} />} onClick={() => setConfirmDelete(true)} loading={deleteTask.isPending}>Delete</Button>
      </div>
      </div>

      {/* ── Activity rail ─────────────────────────────────────────────── */}
      <aside className={cn(
        // shrink-0 only from lg, where the rail is a fixed-width sibling. Keeping
        // it on mobile is what let a long feed squeeze the main column to nothing.
        'flex w-full flex-col border-t border-border-default bg-bg-base/40 lg:w-96 lg:shrink-0 xl:w-105 lg:border-l lg:border-t-0',
        fill && 'lg:min-h-0',
      )}>
        {/* Two panes, not one merged stream: a comment and a field change are
            different kinds of record, and mixing them hid both. */}
        <div className="flex shrink-0 items-center gap-1 border-b border-border-default px-3 py-2">
          {([
            { key: 'comments' as const, label: 'Comments', icon: MessageSquare, count: comments.length },
            { key: 'activity' as const, label: 'Activity', icon: History, count: eventFeed.length },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setRailTab(t.key)}
              aria-pressed={railTab === t.key}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 font-ui text-[12.5px] font-semibold transition-colors',
                railTab === t.key ? 'bg-surface-2 text-text-1' : 'text-text-3 hover:text-text-1',
              )}
            >
              <t.icon size={13} /> {t.label}
              {t.count > 0 && (
                <span className="rounded-sm bg-surface-3 px-1.5 font-mono text-[10px] font-bold text-text-3">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {railTab === 'comments' ? (
          <div className={cn('flex-1 space-y-4 p-4', fill && 'lg:overflow-y-auto')}>
            {commentFeed.length === 0 && (
              <p className="py-8 text-center font-ui text-[12.5px] text-text-4">No comments yet.</p>
            )}
            {commentFeed.map((c) => {
              // Matches p_comments_update / p_comments_delete exactly, so the
              // buttons never appear where the database would refuse.
              const mine = !!profile && c.author_id === profile.id
              const canEdit = mine
              const canRemove = mine || canModerateComments
              const isEditing = editingComment?.id === c.id
              const edited = c.updated_at && c.updated_at !== c.created_at

              return (
                <div key={c.id} className="group/comment flex gap-2.5">
                  <Avatar name={c.author?.name ?? '?'} src={c.author?.avatar_url ?? undefined} size="sm" personId={c.author?.id} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <PersonLink personId={c.author?.id} className="font-ui text-[12.5px] font-semibold text-text-1">{c.author?.name ?? 'Unknown'}</PersonLink>
                      <span className="font-mono text-[10px] text-text-4">{formatRelativeTime(c.created_at)}</span>
                      {edited && <span className="font-mono text-[10px] text-text-4" title={`Edited ${formatRelativeTime(c.updated_at)}`}>(edited)</span>}
                      {!c.is_internal && <span className="font-ui text-[9.5px] font-semibold uppercase text-service-mkt">Client</span>}

                      {!isEditing && (canEdit || canRemove) && (
                        <span className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/comment:opacity-100">
                          {canEdit && (
                            <button
                              onClick={() => setEditingComment({ id: c.id, doc: fromDbDoc(c.doc) })}
                              aria-label="Edit comment"
                              className="flex size-6 items-center justify-center rounded-sm text-text-4 transition-colors hover:bg-surface-3 hover:text-text-1"
                            >
                              <Pencil size={11} />
                            </button>
                          )}
                          {canRemove && (
                            <button
                              onClick={() => setPendingCommentDelete(c.id)}
                              aria-label="Delete comment"
                              className="flex size-6 items-center justify-center rounded-sm text-text-4 transition-colors hover:bg-error/10 hover:text-error"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </span>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="mt-1.5 space-y-2">
                        <div className="rounded-md border border-border-default bg-surface-inset px-2.5 py-1.5">
                          <RichEditor
                            value={editingComment.doc}
                            onChange={(doc) => setEditingComment((prev) => (prev ? { ...prev, doc } : prev))}
                            mentionItems={mentionPeople}
                            compact
                            onSubmit={saveCommentEdit}
                            placeholder="Edit your comment…"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={saveCommentEdit} loading={updateComment.isPending}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingComment(null)} disabled={updateComment.isPending}>Cancel</Button>
                        </div>
                      </div>
                    ) : c.doc ? (
                      <RichRenderer doc={fromDbDoc(c.doc)} className="font-ui text-[13px] text-text-2" />
                    ) : (
                      <p className="whitespace-pre-wrap font-ui text-[13px] text-text-2">{c.content}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          // Newest first, so the change you just made is the top line.
          <div className={cn('flex-1 space-y-3 p-4', fill && 'lg:overflow-y-auto')}>
            {eventFeed.length === 0 && (
              <p className="py-8 text-center font-ui text-[12.5px] text-text-4">No changes recorded yet.</p>
            )}
            {eventFeed.map((entry) => (
              <div key={entry.id} className="flex gap-2.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-border-strong" />
                <p className="min-w-0 flex-1 font-ui text-[12px] text-text-3">
                  <PersonLink personId={entry.actorId ?? undefined} className="font-semibold text-text-2">{entry.actorName}</PersonLink>
                  {' '}{entry.text}
                  <span className="ml-1.5 font-mono text-[10px] text-text-4">{formatRelativeTime(entry.createdAt)}</span>
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Composer belongs to comments only. */}
        <div className={cn('shrink-0 space-y-2 border-t border-border-default p-3', railTab !== 'comments' && 'hidden')}>
          <div className="min-h-16 rounded-md border border-border-default bg-surface-inset px-3 py-2 focus-within:border-border-focus">
            <RichEditor
              key={composerKey}
              value={null}
              onChange={setCommentDoc}
              compact
              onSubmit={sendComment}
              mentionItems={mentionPeople}
              fileItems={fileItems}
              placeholder="Write a comment… @ to mention, # to attach a file"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="flex cursor-pointer items-center gap-2">
              <Toggle checked={!commentInternal} onChange={(v) => setCommentInternal(!v)} size="sm" />
              <span className="font-ui text-[12px] text-text-3">Visible to client</span>
            </label>
            <Button size="sm" iconLeft={<Send size={13} />} onClick={sendComment} loading={createComment.isPending}>Send</Button>
          </div>
        </div>
      </aside>
      {moving && (
        <MoveTaskModal
          taskId={task.id}
          taskTitle={task.title}
          currentProjectId={task.project_id}
          currentProjectName={task.project?.name ?? 'this project'}
          currentServiceId={task.project_service_id}
          currentServiceName={task.project_service?.service?.name}
          onClose={() => setMoving(false)}
        />
      )}
      <ConfirmDialog
        open={!!pendingCommentDelete}
        danger
        title="Delete comment?"
        confirmLabel="Delete comment"
        isPending={deleteComment.isPending}
        message="The comment will be removed for everyone. This can't be undone."
        onConfirm={() => pendingCommentDelete && removeComment(pendingCommentDelete)}
        onClose={() => setPendingCommentDelete(null)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete task?"
        message={
          <ImpactSummary
            lead={<><strong className="text-text-1">{task.title}</strong> will be deleted after confirmation.</>}
            loading={deleteImpactLoading}
            counts={[
              { label: 'Comments', value: deleteImpact?.comments },
              { label: 'Attachments', value: deleteImpact?.attachments },
              { label: 'Subtasks', value: deleteImpact?.subtasks },
              { label: 'Assignees', value: deleteImpact?.assignees },
            ]}
            note="Comments, attachments, subtasks, and assignee links will be removed before the task leaves active lists."
          />
        }
        confirmLabel="Delete task"
        danger
        isPending={deleteTask.isPending || deleteImpactLoading}
        onConfirm={confirmTaskDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}



function cnCheck(completed: boolean): string {
  return completed
    ? 'size-4.5 bg-success/20 text-success border border-success/40 flex items-center justify-center shrink-0'
    : 'size-4.5 bg-surface-inset border border-border-strong flex items-center justify-center shrink-0 hover:border-text-3'
}
