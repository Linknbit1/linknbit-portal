import { useState } from 'react'
import { Trash2, Pencil, Check, Repeat, CalendarClock, Building2, User } from 'lucide-react'
import { Drawer } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Avatar } from '../../components/ui/Avatar'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/toast-context'
import { ChannelChip } from '../../components/shared/BdChips'
import { TASK_STATUS_CONFIG, TASK_STATUS_ORDER, TASK_PRIORITY_CONFIG } from '../../constants/bd'
import { useBd } from '../../context/BdPrototypeContext'
import { cn } from '../../lib/cn'
import { formatDate, getDaysUntil } from '../../lib/utils'
import type { BdTask, BdTaskStatus } from '../../types'

const RECURRENCE_LABEL: Record<string, string> = {
  once: 'One-off',
  daily: 'Repeats daily',
  weekly: 'Repeats weekly',
  monthly: 'Repeats monthly',
}

interface TaskDrawerProps {
  task: BdTask | null
  onClose: () => void
  onEdit: (task: BdTask) => void
  /** Opens the linked lead in the pipeline drawer. */
  onOpenLead?: (leadId: string) => void
}

export function TaskDrawer({ task, onClose, onEdit, onOpenLead }: TaskDrawerProps) {
  const toast = useToast()
  const { moveTaskStatus, toggleChecklistItem, deleteTask } = useBd()
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!task) return null

  const done = task.checklist.filter((c) => c.done).length
  const overdue = task.dueDate && task.status !== 'done' && getDaysUntil(task.dueDate) < 0
  const priority = TASK_PRIORITY_CONFIG[task.priority]

  return (
    <>
      <Drawer
        open={!!task}
        onClose={onClose}
        width={520}
        title={<span className="min-w-0 truncate">{task.title}</span>}
        footer={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" iconLeft={<Pencil size={14} />} onClick={() => onEdit(task)}>
              Edit
            </Button>
            {task.status !== 'done' && (
              <Button
                size="sm"
                iconLeft={<Check size={15} />}
                onClick={() => { moveTaskStatus(task.id, 'done'); toast('Task completed', 'success'); onClose() }}
              >
                Mark done
              </Button>
            )}
            <button
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete task"
              className="ml-auto flex size-8 items-center justify-center rounded-sm text-text-4 transition-colors hover:bg-error/10 hover:text-error"
            >
              <Trash2 size={15} />
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-5 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={task.status}
              onChange={(v) => {
                moveTaskStatus(task.id, v as BdTaskStatus)
                toast(`Moved to ${TASK_STATUS_CONFIG[v as BdTaskStatus].label}`, 'success')
              }}
              size="sm"
              className="w-36"
              options={TASK_STATUS_ORDER.map((s) => ({ value: s, label: TASK_STATUS_CONFIG[s].label }))}
            />
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 font-ui text-[10px] font-semibold uppercase tracking-[0.04em]',
                priority.classes,
              )}
            >
              {priority.label}
            </span>
            {task.channel && <ChannelChip channel={task.channel} />}
          </div>

          {task.description && (
            <p className="font-ui text-body-sm/relaxed text-text-2">{task.description}</p>
          )}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 border-y border-border-subtle py-4">
            <div>
              <dt className="font-ui text-[10.5px] uppercase tracking-wider text-text-4">Assignee</dt>
              <dd className="mt-1 flex items-center gap-2">
                <Avatar name={task.assigneeName} size="xs" />
                <span className="truncate font-ui text-[12.5px] text-text-2">{task.assigneeName}</span>
              </dd>
            </div>
            <div>
              <dt className="font-ui text-[10.5px] uppercase tracking-wider text-text-4">Due</dt>
              <dd className={cn('mt-1 flex items-center gap-1.5 font-mono text-[12.5px]', overdue ? 'text-error' : 'text-text-2')}>
                <CalendarClock size={12} />
                {task.dueDate ? formatDate(task.dueDate) : '—'}
              </dd>
            </div>
            <div>
              <dt className="font-ui text-[10.5px] uppercase tracking-wider text-text-4">Repeats</dt>
              <dd className="mt-1 flex items-center gap-1.5 font-ui text-[12.5px] text-text-2">
                <Repeat size={12} className="text-text-4" />
                {RECURRENCE_LABEL[task.recurrence]}
              </dd>
            </div>
            <div>
              <dt className="font-ui text-[10.5px] uppercase tracking-wider text-text-4">Created by</dt>
              <dd className="mt-1 flex items-center gap-1.5 font-ui text-[12.5px] text-text-2">
                <User size={12} className="text-text-4" />
                {task.createdBy}
              </dd>
            </div>
          </dl>

          {task.leadCompany && (
            <button
              type="button"
              onClick={() => task.leadId && onOpenLead?.(task.leadId)}
              disabled={!onOpenLead}
              className={cn(
                'flex items-center gap-2.5 rounded-md border border-border-default bg-surface-2 px-3 py-2.5 text-left transition-colors',
                onOpenLead ? 'hover:border-border-strong' : 'cursor-default',
              )}
            >
              <Building2 size={14} className="shrink-0 text-text-4" />
              <span className="min-w-0 flex-1">
                <span className="block font-ui text-[10.5px] uppercase tracking-wider text-text-4">Linked lead</span>
                <span className="block truncate font-ui text-[13px] text-text-1">{task.leadCompany}</span>
              </span>
            </button>
          )}

          {task.checklist.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="font-ui text-[11px] font-semibold uppercase tracking-widest text-text-3">Checklist</span>
                <span className="font-mono text-[11.5px] tabular-nums text-text-4">
                  {done}/{task.checklist.length}
                </span>
              </div>
              <ProgressBar value={done} max={task.checklist.length} size="xs" variant={done === task.checklist.length ? 'success' : 'default'} />
              <ul className="flex flex-col gap-1">
                {task.checklist.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => toggleChecklistItem(task.id, item.id)}
                      className="flex w-full items-center gap-2.5 rounded-sm p-2 text-left transition-colors hover:bg-surface-2"
                    >
                      <span
                        className={cn(
                          'flex size-4 shrink-0 items-center justify-center rounded-xs border transition-colors',
                          item.done ? 'border-success bg-success text-bg-base' : 'border-border-strong',
                        )}
                      >
                        {item.done && <Check size={10} strokeWidth={3} />}
                      </span>
                      <span className={cn('min-w-0 flex-1 font-ui text-[12.5px]', item.done ? 'text-text-4 line-through' : 'text-text-2')}>
                        {item.label}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Drawer>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => { deleteTask(task.id); setConfirmDelete(false); onClose(); toast('Task deleted', 'info') }}
        title="Delete this task?"
        message={task.title}
        confirmLabel="Delete task"
      />
    </>
  )
}
