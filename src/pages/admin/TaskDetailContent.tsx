import { useState, type ReactNode } from 'react'
import type { JSONContent } from '@tiptap/react'
import { Plus, Trash2, Send, CheckCircle2, Archive, MessageSquare, ListChecks, RotateCcw } from 'lucide-react'
import { cn } from '../../lib/cn'
import { DocEditor } from '../../components/editor/DocEditor'
import { RichEditor } from '../../components/editor/RichEditor'
import { RichRenderer } from '../../components/editor/RichRenderer'
import { docToPlainText, extractMentionIds, toDbDoc, fromDbDoc } from '../../lib/richText'
import { useSyncMentions } from '../../hooks/useMentions'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { MultiSelectPeople } from '../../components/ui/MultiSelectPeople'
import { useSetTaskAssignees } from '../../hooks/useTaskAssignees'
import { DatePicker } from '../../components/ui/DatePicker'
import { Toggle } from '../../components/ui/Toggle'
import { Avatar } from '../../components/ui/Avatar'
import { PersonLink } from '../../components/shared/PersonLink'
import { Skeleton } from '../../components/ui/Skeleton'
import { ServiceChip } from '../../components/shared/ServiceChip'
import { StatusChip } from '../../components/shared/StatusChip'
import { PriorityChip } from '../../components/shared/PriorityChip'
import { AttachmentUploader } from '../../components/shared/AttachmentUploader'
import { useToast } from '../../components/ui/toast-context'
import { formatRelativeTime, PRIORITY_LABELS, STATUS_LABELS } from '../../lib/utils'
import { useTask, useUpdateTask, useDeleteTask } from '../../hooks/useTasks'
import { useStages } from '../../hooks/useStages'
import { useProjectMembers } from '../../hooks/useProjectMembers'
import { useSubtasks, useCreateSubtask, useToggleSubtask, useDeleteSubtask } from '../../hooks/useSubtasks'
import { useComments, useCreateComment } from '../../hooks/useComments'
import { useRealtimeComments } from '../../hooks/realtime/useRealtimeComments'
import type { Priority, TaskStatus } from '../../types'

const STATUS_ORDER: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'approved', 'completed', 'blocked']
const PRIORITY_ORDER: Priority[] = ['critical', 'high', 'medium', 'low']
const PRIORITY_DOTS: Record<Priority, string> = { critical: '#F4364C', high: '#F59E0B', medium: '#60A5FA', low: '#7A8597' }
const isStatus = (v: string): v is TaskStatus => (STATUS_ORDER as string[]).includes(v)
const isPriority = (v: string): v is Priority => (PRIORITY_ORDER as string[]).includes(v)

interface TaskDetailContentProps {
  taskId: string
  onClosed?: () => void
  /** Two-column layout (comments + files on the right) for the expanded drawer / full page. */
  wide?: boolean
}

export function TaskDetailContent({ taskId, onClosed, wide }: TaskDetailContentProps) {
  const toast = useToast()
  const { data: task, isLoading } = useTask(taskId)
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  useRealtimeComments(taskId)

  const projectId = task?.project_id
  const { data: stages = [] } = useStages(projectId)
  const { data: members = [] } = useProjectMembers(projectId)
  const { data: subtasks = [] } = useSubtasks(taskId)
  const { data: comments = [] } = useComments(taskId)
  const createSubtask = useCreateSubtask()
  const toggleSubtask = useToggleSubtask()
  const deleteSubtask = useDeleteSubtask()
  const createComment = useCreateComment()
  const syncMentions = useSyncMentions()
  const setAssignees = useSetTaskAssignees()

  const [newSubtask, setNewSubtask] = useState('')
  const [commentDoc, setCommentDoc] = useState<JSONContent | null>(null)
  const [composerKey, setComposerKey] = useState(0)
  const [commentInternal, setCommentInternal] = useState(true)

  if (isLoading) return <div className="p-5 space-y-3"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-24" /><Skeleton className="h-32" /></div>
  if (!task) return <div className="p-8 text-center font-ui text-text-3">Task not found.</div>

  const patch = (updates: Parameters<typeof updateTask.mutate>[0]['updates']) =>
    updateTask.mutate({ id: task.id, updates }, { onError: (e) => toast(e instanceof Error ? e.message : 'Update failed', 'error') })

  const stageOptions = [{ value: '', label: 'No stage' }, ...stages.map((s) => ({ value: s.id, label: s.name }))]
  const statusOptions = STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABELS[s] }))
  const priorityOptions = PRIORITY_ORDER.map((p) => ({ value: p, label: PRIORITY_LABELS[p], dot: PRIORITY_DOTS[p] }))

  const addSubtask = () => {
    if (!newSubtask.trim()) return
    createSubtask.mutate({ taskId, title: newSubtask.trim() }, { onError: (e) => toast(e instanceof Error ? e.message : 'Failed', 'error') })
    setNewSubtask('')
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
    patch({ status: isDone ? 'in_progress' : 'completed' })
    toast(isDone ? 'Task reopened' : 'Task marked complete', 'success')
  }

  const archive = () => {
    deleteTask.mutate({ id: task.id, projectId: task.project_id }, {
      onSuccess: () => { toast('Task archived', 'success'); onClosed?.() },
      onError: (e) => toast(e instanceof Error ? e.message : 'Failed', 'error'),
    })
  }

  return (
    <div className={cn('p-5', wide ? 'grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start' : 'flex flex-col gap-5')}>
      <div className={wide ? 'space-y-5 min-w-0' : 'contents'}>
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <ServiceChip service={task.project?.service_type ?? task.service_type ?? ''} />
          {task.project?.name && <span className="font-ui text-[12px] text-text-3">{task.project.name}</span>}
        </div>
        <h2 className="font-display font-bold text-[18px] text-text-1">{task.title}</h2>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <Select value={task.status} onChange={(v) => { if (isStatus(v)) patch({ status: v }) }} options={statusOptions} size="sm" />
        </Field>
        <Field label="Priority">
          <Select value={task.priority} onChange={(v) => { if (isPriority(v)) patch({ priority: v }) }} options={priorityOptions} size="sm" />
        </Field>
        <Field label="Assignees">
          <MultiSelectPeople
            value={task.assignees.map((a) => a.id)}
            onChange={(ids) => setAssignees.mutate(
              { taskId: task.id, profileIds: ids, projectId: task.project_id },
              { onError: (e) => toast(e instanceof Error ? e.message : 'Failed', 'error') },
            )}
            options={members.map((m) => ({ id: m.id, name: m.name, avatar_url: m.avatar_url }))}
            size="sm"
          />
        </Field>
        <Field label="Stage">
          <Select value={task.stage_id ?? ''} onChange={(v) => patch({ stage_id: v || null })} options={stageOptions} size="sm" />
        </Field>
        <Field label="Due date">
          <DatePicker value={task.due_date ? task.due_date.slice(0, 10) : ''} onChange={(v) => patch({ due_date: v ? new Date(`${v}T00:00:00`).toISOString() : null })} />
        </Field>
        <Field label="Client visible">
          <div className="h-9 flex items-center"><Toggle checked={task.client_visible} onChange={(v) => patch({ client_visible: v })} /></div>
        </Field>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Description</label>
        <div className="bg-surface-inset border border-border-default rounded-md px-3 py-2 min-h-20 focus-within:border-border-focus">
          <DocEditor
            key={task.id}
            value={task.doc}
            onSave={(doc) => patch({ doc })}
            mentionItems={members}
            source={{ type: 'task', id: task.id, projectId: task.project_id }}
            placeholder="Add a description… type / for commands, @ to mention"
          />
        </div>
      </div>

      {/* Subtasks */}
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

      </div>
      <div className={wide ? 'space-y-5 min-w-0' : 'contents'}>
      {/* Files */}
      <div className="space-y-2">
        <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Files</label>
        <AttachmentUploader projectId={task.project_id} taskId={task.id} />
      </div>

      {/* Comments */}
      <div className="space-y-2.5">
        <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider flex items-center gap-1.5"><MessageSquare size={13} /> Comments</label>
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <Avatar name={c.author?.name ?? '?'} src={c.author?.avatar_url ?? undefined} size="sm" personId={c.author?.id} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <PersonLink personId={c.author?.id} className="font-ui font-semibold text-[12.5px] text-text-1">{c.author?.name ?? 'Unknown'}</PersonLink>
                <span className="font-mono text-[10px] text-text-4">{formatRelativeTime(c.created_at)}</span>
                {!c.is_internal && <span className="text-[9.5px] font-ui font-semibold uppercase text-service-mkt">Client</span>}
              </div>
              {c.doc
                ? <RichRenderer doc={fromDbDoc(c.doc)} className="font-ui text-[13px] text-text-2" />
                : <p className="font-ui text-[13px] text-text-2 whitespace-pre-wrap">{c.content}</p>}
            </div>
          </div>
        ))}
        <div className="space-y-2 pt-1">
          <div className="bg-surface-inset border border-border-default rounded-md px-3 py-2 min-h-16 focus-within:border-border-focus">
            <RichEditor
              key={composerKey}
              value={null}
              onChange={setCommentDoc}
              compact
              onSubmit={sendComment}
              mentionItems={members}
              placeholder="Write a comment… @ to mention"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <Toggle checked={!commentInternal} onChange={(v) => setCommentInternal(!v)} size="sm" />
              <span className="font-ui text-[12px] text-text-3">Visible to client</span>
            </label>
            <Button size="sm" iconLeft={<Send size={13} />} onClick={sendComment} loading={createComment.isPending}>Send</Button>
          </div>
        </div>
      </div>

      </div>
      {/* Actions */}
      <div className={cn('flex items-center gap-2 pt-2 border-t border-border-subtle', wide && 'lg:col-span-2')}>
        <Button size="sm" variant={isDone ? 'secondary' : 'primary'} iconLeft={isDone ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />} onClick={toggleComplete}>{isDone ? 'Reopen' : 'Mark complete'}</Button>
        <Button size="sm" variant="danger" iconLeft={<Archive size={14} />} onClick={archive} loading={deleteTask.isPending}>Archive</Button>
        <div className="ml-auto"><StatusChip status={task.status} /></div>
        <PriorityChip priority={task.priority} />
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

function cnCheck(completed: boolean): string {
  return completed
    ? 'size-4.5 rounded-[5px] bg-success/20 text-success border border-success/40 flex items-center justify-center shrink-0'
    : 'size-4.5 rounded-[5px] bg-surface-inset border border-border-strong flex items-center justify-center shrink-0 hover:border-text-3'
}
