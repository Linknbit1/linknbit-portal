import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Avatar } from '../ui/Avatar'
import { PriorityChip } from './PriorityChip'
import { ServiceChip } from './ServiceChip'
import { useUpdateTaskStatus } from '../../hooks/useTasks'
import { useToast } from '../ui/toast-context'
import { formatDate, isOverdue } from '../../lib/utils'
import type { TaskListItem } from '../../api/tasks'
import type { TaskStatus } from '../../types'

interface Column {
  key: string
  label: string
  /** Statuses that land in this column. */
  statuses: TaskStatus[]
  /** Canonical status applied when a card is dropped here. */
  set: TaskStatus
}

const COLUMNS: Column[] = [
  { key: 'todo', label: 'To Do', statuses: ['backlog', 'todo'], set: 'todo' },
  { key: 'in_progress', label: 'In Progress', statuses: ['in_progress'], set: 'in_progress' },
  { key: 'review', label: 'Review', statuses: ['review'], set: 'review' },
  { key: 'done', label: 'Done', statuses: ['approved', 'completed'], set: 'completed' },
  { key: 'blocked', label: 'Blocked', statuses: ['blocked'], set: 'blocked' },
]

interface TaskBoardProps {
  tasks: TaskListItem[]
  onOpenTask: (id: string) => void
  /** Show the project name + service on each card (for the cross-project board). */
  showProject?: boolean
}

export function TaskBoard({ tasks, onOpenTask, showProject }: TaskBoardProps) {
  const toast = useToast()
  const updateStatus = useUpdateTaskStatus()
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const handleDrop = (col: Column) => {
    setDragOver(null)
    const id = dragId
    setDragId(null)
    if (!id) return
    const task = tasks.find((t) => t.id === id)
    if (!task || task.status === col.set) return
    updateStatus.mutate(
      { id, status: col.set, projectId: task.project_id },
      { onError: (e) => toast(e instanceof Error ? e.message : 'Could not move task', 'error') },
    )
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {COLUMNS.map((col) => {
        const items = tasks.filter((t) => (col.statuses as string[]).includes(t.status))
        return (
          <div
            key={col.key}
            onDragOver={(e) => { e.preventDefault(); setDragOver(col.key) }}
            onDragLeave={() => setDragOver((c) => (c === col.key ? null : c))}
            onDrop={() => handleDrop(col)}
            className={cn(
              'w-64 shrink-0 rounded-lg border p-2.5 transition-colors',
              dragOver === col.key ? 'border-brand-red bg-brand-red/5' : 'border-border-default bg-surface-1/60',
            )}
          >
            <div className="flex items-center justify-between px-1 pb-2">
              <span className="font-ui font-semibold text-[12px] text-text-2">{col.label}</span>
              <span className="font-mono text-[10.5px] text-text-4">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={() => setDragId(t.id)}
                  onDragEnd={() => { setDragId(null); setDragOver(null) }}
                  onClick={() => onOpenTask(t.id)}
                  className={cn(
                    'bg-surface-1 border border-border-default rounded-md p-3 cursor-pointer hover:border-border-strong transition-colors',
                    dragId === t.id && 'opacity-50',
                  )}
                >
                  {showProject && t.project && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <ServiceChip service={t.project.service_type} showDot={false} />
                      <span className="font-ui text-[10.5px] text-text-4 truncate">{t.project.name}</span>
                    </div>
                  )}
                  <p className="font-ui font-medium text-body-sm/snug text-text-1">{t.title}</p>
                  <div className="flex items-center justify-between mt-2.5 gap-2">
                    <PriorityChip priority={t.priority} />
                    <div className="flex items-center gap-1.5">
                      {t.due_date && (
                        <span className={cn('flex items-center gap-1 font-mono text-[10px]', isOverdue(t.due_date) && t.status !== 'completed' ? 'text-error' : 'text-text-4')}>
                          {isOverdue(t.due_date) && t.status !== 'completed' && <AlertCircle size={10} />}
                          {formatDate(t.due_date)}
                        </span>
                      )}
                      {t.assignee
                        ? <Avatar name={t.assignee.name} src={t.assignee.avatar_url ?? undefined} size="xs" />
                        : <span className="size-6 rounded-full border border-dashed border-border-strong shrink-0" />}
                    </div>
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="text-center text-[11px] text-text-4 py-4">Empty</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
