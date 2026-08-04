import { Trash2, MessageSquare, Paperclip, GitBranch, CalendarDays } from 'lucide-react'
import { AvatarGroup } from '../ui/Avatar'
import { ServiceChip } from './ServiceChip'
import { StatusChip } from './StatusChip'
import { PriorityChip } from './PriorityChip'
import { cn } from '../../lib/cn'
import { formatDate, isOverdue } from '../../lib/utils'
import type { TaskListItem } from '../../api/tasks'

interface TaskCardProps {
  task: TaskListItem
  onOpen: (id: string) => void
  /** Omitted where the surface has no delete affordance (e.g. the project pipeline). */
  onDelete?: (task: TaskListItem) => void
  /** Service chip + project name. Off inside a single project, where both are implied. */
  showProject?: boolean
}

/** Card rendering of a task — the default list unit for tasks across the portal. */
export function TaskCard({ task: t, onOpen, onDelete, showProject = true }: TaskCardProps) {
  const overdue = !!t.due_date && isOverdue(t.due_date) && t.status !== 'completed' && t.status !== 'approved'
  const meta: { icon: typeof MessageSquare; count: number; label: string }[] = [
    { icon: GitBranch, count: t.subtask_count, label: 'subtasks' },
    { icon: MessageSquare, count: t.comment_count, label: 'comments' },
    { icon: Paperclip, count: t.attachment_count, label: 'attachments' },
  ]
  const shownMeta = meta.filter((m) => m.count > 0)

  return (
    <article
      onClick={() => onOpen(t.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(t.id) } }}
      aria-label={t.title}
      className="group flex cursor-pointer flex-col gap-3 rounded-lg border border-border-default bg-surface-1 p-4 shadow-sm transition-colors hover:border-border-strong focus:outline-none focus-visible:border-border-focus"
    >
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <PriorityChip priority={t.priority} />
          <StatusChip status={t.status} />
        </div>
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(t) }}
            className="-mt-0.5 -mr-1 size-7 shrink-0 rounded-sm inline-flex items-center justify-center text-text-4 opacity-0 transition-opacity hover:bg-error/10 hover:text-error focus-visible:opacity-100 group-hover:opacity-100"
            aria-label={`Delete ${t.title}`}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <p className="font-ui text-[13.5px] font-semibold leading-snug text-text-1 line-clamp-2">{t.title}</p>

      {showProject && (
        <div className="flex items-center gap-2 min-w-0">
          {t.project_service?.service && <ServiceChip service={t.project_service.service.slug} showDot={false} />}
          <span className="truncate font-ui text-[11.5px] text-text-3">{t.project?.name ?? 'No project'}</span>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
        {t.assignees.length > 0 ? (
          <div onClick={(e) => e.stopPropagation()}>
            <AvatarGroup users={t.assignees.map((a) => ({ id: a.id, name: a.name, avatarUrl: a.avatar_url ?? undefined }))} max={3} size="xs" linkToProfile />
          </div>
        ) : (
          <span className="font-ui text-[11.5px] text-text-4">Unassigned</span>
        )}
        <span className={cn('flex shrink-0 items-center gap-1.5 font-mono text-[11px]', overdue ? 'text-error' : 'text-text-3')}>
          <CalendarDays size={12} />
          {t.due_date ? formatDate(t.due_date) : '—'}
        </span>
      </div>

      {shownMeta.length > 0 && (
        <div className="flex items-center gap-3 text-text-4">
          {shownMeta.map((m) => (
            <span key={m.label} className="flex items-center gap-1 font-mono text-[10.5px]" title={`${m.count} ${m.label}`}>
              <m.icon size={11} /> {m.count}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}
