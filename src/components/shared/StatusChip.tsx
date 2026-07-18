import { cn } from '../../lib/cn'
import type { TaskStatus, ProjectStatus, ApprovalStatus } from '../../types'

const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; classes: string }> = {
  backlog:     { label: 'Backlog',      classes: 'bg-surface-3 text-text-3 border-border-default' },
  todo:        { label: 'To Do',        classes: 'bg-surface-2 text-text-3 border-border-default' },
  in_progress: { label: 'In Progress',  classes: 'bg-[rgba(34,197,94,0.12)] text-[#22C55E] border-[rgba(34,197,94,0.3)]' },
  review:      { label: 'Review',       classes: 'bg-[rgba(59,130,246,0.12)] text-[#60A5FA] border-[rgba(59,130,246,0.3)]' },
  approved:    { label: 'Approved',     classes: 'bg-[rgba(34,197,94,0.12)] text-[#22C55E] border-[rgba(34,197,94,0.3)]' },
  completed:   { label: 'Completed',    classes: 'bg-[rgba(122,133,151,0.15)] text-text-2 border-border-default' },
  blocked:     { label: 'Blocked',      classes: 'bg-[rgba(244,54,76,0.1)] text-[#F4364C] border-[rgba(244,54,76,0.3)]' },
}

const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; classes: string }> = {
  in_progress:     { label: 'In Progress',     classes: 'bg-[rgba(34,197,94,0.12)] text-[#22C55E] border-[rgba(34,197,94,0.3)]' },
  blocked:         { label: 'Blocked',         classes: 'bg-[rgba(244,54,76,0.1)] text-[#F4364C] border-[rgba(244,54,76,0.3)]' },
  awaiting_client: { label: 'Awaiting Client', classes: 'bg-[rgba(245,158,11,0.12)] text-[#F59E0B] border-[rgba(245,158,11,0.3)]' },
  completed:       { label: 'Completed',       classes: 'bg-[rgba(122,133,151,0.15)] text-text-2 border-border-default' },
  on_hold:         { label: 'On Hold',         classes: 'bg-surface-3 text-text-3 border-border-default' },
}

const APPROVAL_STATUS_CONFIG: Record<ApprovalStatus, { label: string; classes: string }> = {
  pending:            { label: 'Pending',            classes: 'bg-[rgba(245,158,11,0.12)] text-[#F59E0B] border-[rgba(245,158,11,0.3)]' },
  approved:           { label: 'Approved',           classes: 'bg-[rgba(34,197,94,0.12)] text-[#22C55E] border-[rgba(34,197,94,0.3)]' },
  revision_requested: { label: 'Revision Requested', classes: 'bg-[rgba(251,191,36,0.12)] text-[#FCD34D] border-[rgba(251,191,36,0.3)]' },
  rejected:           { label: 'Rejected',           classes: 'bg-[rgba(244,54,76,0.1)] text-[#F4364C] border-[rgba(244,54,76,0.3)]' },
}

interface StatusChipProps {
  // Accepts a raw string (DB columns are `text`); unknown values render nothing.
  status: TaskStatus | ProjectStatus | ApprovalStatus | string
  type?: 'task' | 'project' | 'approval'
  className?: string
}

export function StatusChip({ status, type = 'task', className }: StatusChipProps) {
  const configs = type === 'project' ? PROJECT_STATUS_CONFIG : type === 'approval' ? APPROVAL_STATUS_CONFIG : TASK_STATUS_CONFIG
  const config = (configs as Record<string, { label: string; classes: string }>)[status]
  if (!config) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 py-0.75 px-2.25 rounded-full font-ui font-semibold text-[10.5px] uppercase tracking-[0.04em] leading-[1.4] whitespace-nowrap border',
        config.classes,
        className,
      )}
    >
      <span className="size-1.25 rounded-full bg-current shrink-0" />
      {config.label}
    </span>
  )
}
