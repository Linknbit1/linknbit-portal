import { cn } from '../../lib/cn'
import type { TaskStatus, ProjectStatus, ApprovalStatus } from '../../types'

const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; classes: string }> = {
  backlog: { label: 'Backlog', classes: 'bg-surface-3 text-text-3 border border-border-default' },
  todo: { label: 'To Do', classes: 'bg-surface-2 text-text-2 border border-border-default' },
  in_progress: { label: 'In Progress', classes: 'bg-info/10 text-info border border-info/30' },
  review: { label: 'Review', classes: 'bg-service-design/10 text-service-design border border-service-design/30' },
  approved: { label: 'Approved', classes: 'bg-success/10 text-success border border-success/30' },
  completed: { label: 'Completed', classes: 'bg-success/10 text-success border border-success/30' },
  blocked: { label: 'Blocked', classes: 'bg-error/10 text-error border border-error/30' },
}

const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; classes: string }> = {
  in_progress: { label: 'In Progress', classes: 'bg-info/10 text-info border border-info/30' },
  blocked: { label: 'Blocked', classes: 'bg-error/10 text-error border border-error/30' },
  awaiting_client: { label: 'Awaiting Client', classes: 'bg-warning/10 text-warning border border-warning/30' },
  completed: { label: 'Completed', classes: 'bg-success/10 text-success border border-success/30' },
  on_hold: { label: 'On Hold', classes: 'bg-surface-3 text-text-3 border border-border-default' },
}

const APPROVAL_STATUS_CONFIG: Record<ApprovalStatus, { label: string; classes: string }> = {
  pending: { label: 'Pending', classes: 'bg-warning/10 text-warning border border-warning/30' },
  approved: { label: 'Approved', classes: 'bg-success/10 text-success border border-success/30' },
  revision_requested: { label: 'Revision Requested', classes: 'bg-service-mkt/10 text-service-mkt border border-service-mkt/30' },
  rejected: { label: 'Rejected', classes: 'bg-error/10 text-error border border-error/30' },
}

interface StatusChipProps {
  status: TaskStatus | ProjectStatus | ApprovalStatus
  type?: 'task' | 'project' | 'approval'
  size?: 'sm' | 'md'
  className?: string
}

export function StatusChip({ status, type = 'task', size = 'sm', className }: StatusChipProps) {
  const configs = type === 'project' ? PROJECT_STATUS_CONFIG : type === 'approval' ? APPROVAL_STATUS_CONFIG : TASK_STATUS_CONFIG
  const config = (configs as Record<string, { label: string; classes: string }>)[status]
  if (!config) return null

  return (
    <span
      className={cn(
        'inline-flex items-center font-ui font-semibold rounded-xs',
        size === 'sm' ? 'text-caption px-1.5 py-0.5' : 'text-body-sm px-2.5 py-1',
        config.classes,
        className,
      )}
    >
      {config.label}
    </span>
  )
}
