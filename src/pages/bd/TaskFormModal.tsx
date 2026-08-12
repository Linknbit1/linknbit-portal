import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { DatePicker } from '../../components/ui/DatePicker'
import { useToast } from '../../components/ui/toast-context'
import { CHANNEL_CONFIG, CHANNEL_ORDER } from '../../constants/bd'
import { useBd } from '../../context/BdPrototypeContext'
import { randomUUID } from '../../lib/uuid'
import { BD_REPS } from '../../data/bdMock'
import { cn } from '../../lib/cn'
import type { BdTask, BdTaskStatus, BdTaskPriority, BdTaskRecurrence, BdChannel } from '../../types'

const STATUSES: { value: BdTaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
]

const PRIORITIES: { value: BdTaskPriority; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

/** Standing outreach quotas repeat; one-off follow-ups don't. */
const RECURRENCES: { value: BdTaskRecurrence; label: string }[] = [
  { value: 'once', label: 'One-off' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

const NO_CHANNEL = '__none__'
const NO_LEAD = '__none__'

interface TaskFormModalProps {
  open: boolean
  task: BdTask | null
  /** Pre-selected status when created by the "add" button on a board column. */
  defaultStatus?: BdTaskStatus
  onClose: () => void
}

export function TaskFormModal({ open, task, defaultStatus = 'todo', onClose }: TaskFormModalProps) {
  const toast = useToast()
  const { leads, saveTask, viewerRepId, viewerName, canSeeAll } = useBd()

  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  // A rep who cannot see the whole department cannot assign work to anyone else.
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? viewerRepId)
  const [status, setStatus] = useState<BdTaskStatus>(task?.status ?? defaultStatus)
  const [priority, setPriority] = useState<BdTaskPriority>(task?.priority ?? 'medium')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [leadId, setLeadId] = useState(task?.leadId ?? NO_LEAD)
  const [channel, setChannel] = useState<string>(task?.channel ?? NO_CHANNEL)
  const [recurrence, setRecurrence] = useState<BdTaskRecurrence>(task?.recurrence ?? 'once')
  const [checklist, setChecklist] = useState(task?.checklist ?? [])
  const [newItem, setNewItem] = useState('')
  const [touched, setTouched] = useState(false)

  const titleError = touched && !title.trim() ? 'Give the task a title' : undefined

  const addChecklistItem = () => {
    const label = newItem.trim()
    if (!label) return
    setChecklist((c) => [...c, { id: randomUUID(), label, done: false }])
    setNewItem('')
  }

  const submit = () => {
    setTouched(true)
    if (!title.trim()) return
    const assignee = BD_REPS.find((r) => r.id === assigneeId)
    const lead = leads.find((l) => l.id === leadId)
    saveTask({
      id: task?.id ?? randomUUID(),
      title: title.trim(),
      description: description.trim() || undefined,
      assigneeId,
      assigneeName: assignee?.name ?? viewerName,
      status,
      priority,
      dueDate: dueDate || null,
      leadId: lead?.id,
      leadCompany: lead?.company,
      channel: channel === NO_CHANNEL ? undefined : (channel as BdChannel),
      recurrence,
      createdBy: task?.createdBy ?? viewerName,
      checklist,
    })
    toast(task ? 'Task updated' : 'Task created', 'success')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={task ? 'Edit task' : 'New task'}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit}>{task ? 'Save changes' : 'Create task'}</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={titleError}
          placeholder="Send 20 Upwork proposals this week"
          className="sm:col-span-2"
        />

        <div className="sm:col-span-2">
          <label htmlFor="task-description" className="mb-1.5 block font-ui text-[12px] font-medium text-text-2">
            Description <span className="text-text-4">— optional</span>
          </label>
          <textarea
            id="task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Any detail the assignee needs to start without asking…"
            className={cn(
              'w-full resize-y rounded-md border border-border-default bg-surface-inset px-3 py-2.5',
              'font-ui text-[13px] text-text-1 placeholder:text-text-4 focus:outline-none focus:shadow-ring-focus',
            )}
          />
        </div>

        <Select
          label="Assignee"
          value={assigneeId}
          onChange={setAssigneeId}
          options={
            canSeeAll
              ? BD_REPS.map((r) => ({ value: r.id, label: r.name }))
              : [{ value: viewerRepId, label: `${viewerName} (you)` }]
          }
        />
        <Select label="Status" value={status} onChange={(v) => setStatus(v as BdTaskStatus)} options={STATUSES} />

        <Select label="Priority" value={priority} onChange={(v) => setPriority(v as BdTaskPriority)} options={PRIORITIES} />
        <div>
          <p className="mb-1.5 font-ui text-[12px] font-medium text-text-2">Due date</p>
          <DatePicker value={dueDate} onChange={setDueDate} placeholder="No due date" />
        </div>

        <Select
          label="Linked lead"
          value={leadId}
          onChange={setLeadId}
          options={[{ value: NO_LEAD, label: 'Not linked' }, ...leads.map((l) => ({ value: l.id, label: l.company }))]}
        />
        <Select
          label="Channel"
          value={channel}
          onChange={setChannel}
          options={[
            { value: NO_CHANNEL, label: 'General' },
            ...CHANNEL_ORDER.map((c) => ({ value: c, label: CHANNEL_CONFIG[c].label })),
          ]}
        />

        <Select
          label="Repeats"
          value={recurrence}
          onChange={(v) => setRecurrence(v as BdTaskRecurrence)}
          options={RECURRENCES}
          className="sm:col-span-2"
        />

        {/* Checklist */}
        <div className="sm:col-span-2">
          <p className="mb-1.5 font-ui text-[12px] font-medium text-text-2">Checklist</p>
          {checklist.length > 0 && (
            <ul className="mb-2 flex flex-col gap-1.5">
              {checklist.map((item) => (
                <li key={item.id} className="flex items-center gap-2 rounded-sm border border-border-subtle bg-surface-2 px-2.5 py-1.5">
                  <span className="min-w-0 flex-1 truncate font-ui text-[12.5px] text-text-2">{item.label}</span>
                  <button
                    type="button"
                    onClick={() => setChecklist((c) => c.filter((i) => i.id !== item.id))}
                    aria-label={`Remove ${item.label}`}
                    className="flex size-5 items-center justify-center rounded-xs text-text-4 transition-colors hover:bg-error/10 hover:text-error"
                  >
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-2">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChecklistItem() } }}
              placeholder="Add a step…"
              className="flex-1"
            />
            <Button size="sm" variant="secondary" iconLeft={<Plus size={14} />} onClick={addChecklistItem}>
              Add
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
