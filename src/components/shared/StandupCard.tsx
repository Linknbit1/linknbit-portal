import { AlertTriangle, PencilLine } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { PersonLink } from './PersonLink'
import { ServiceChip } from './ServiceChip'
import { formatRelativeTime } from '../../lib/utils'
import { fmtMinutes } from '../../lib/standup'
import type { StandupDetail } from '../../api/standups'
import { RichRenderer } from '../editor/RichRenderer'
import { fromDbDoc } from '../../lib/richText'

interface StandupCardProps {
  standup: StandupDetail
  /** Own-history view: the person is implied, so the avatar row shows the date instead. */
  showPerson?: boolean
}

/** One person's day: their entries, time logged and blockers. Shared by the team board and history. */
export function StandupCard({ standup, showPerson = true }: StandupCardProps) {
  const total = standup.entries.reduce((sum, e) => sum + e.minutes_spent, 0)
  const dayLabel = new Date(`${standup.standup_date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  })

  return (
    <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
        {showPerson && (
          <Avatar name={standup.profile?.name ?? '?'} src={standup.profile?.avatar_url ?? undefined} size="sm" personId={standup.profile?.id} />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-ui font-semibold text-[13px] text-text-1 truncate">
            {showPerson
              ? <PersonLink personId={standup.profile?.id}>{standup.profile?.name ?? 'Unknown'}</PersonLink>
              : dayLabel}
          </p>
          <p className="font-mono text-[10px] text-text-4">
            {showPerson ? formatRelativeTime(standup.submitted_at) : `Submitted ${formatRelativeTime(standup.submitted_at)}`}
            {' · '}{fmtMinutes(total)} logged
          </p>
        </div>
        {standup.edit_count > 0 && (
          <span
            className="inline-flex items-center gap-1 font-mono text-[10px] text-text-4"
            title={standup.edited_at ? `Last edited ${formatRelativeTime(standup.edited_at)}` : 'Edited'}
          >
            <PencilLine size={11} /> edited
          </span>
        )}
        {standup.is_late && <Badge variant="warning">Late</Badge>}
      </div>

      <div className="divide-y divide-border-subtle">
        {standup.entries.map((e) => {
          // Prefer the live project/task name; fall back to the snapshot captured
          // at submission so a deleted project/task still shows in the backlog.
          const projectLabel = e.project?.name ?? e.project_name ?? 'Project'
          const projectGone = !e.project && !!e.project_name
          const taskLabel = e.task?.title ?? e.task_name
          const taskGone = !e.task && !!e.task_name
          return (
          <div key={e.id} className="px-4 py-3 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              {e.task?.project_service?.service && <ServiceChip service={e.task.project_service.service.slug} />}
              <span className="font-ui font-semibold text-[12.5px] text-text-1">{projectLabel}</span>
              {projectGone && <span className="font-mono text-[10px] text-text-4" title="This project has been deleted">(deleted)</span>}
              {taskLabel && (
                <span className="font-ui text-[11.5px] text-text-3 truncate">
                  · {taskLabel}{taskGone && <span className="text-text-4" title="This task has been deleted"> (deleted)</span>}
                </span>
              )}
              <span className="ml-auto font-mono text-[11px] text-text-3 shrink-0">{fmtMinutes(e.minutes_spent)}</span>
            </div>
            {/* Formatted when it was written that way; the plain mirror covers
                every standup submitted before rich text existed. */}
            {e.work_done_doc ? (
              <RichRenderer doc={fromDbDoc(e.work_done_doc)} className="font-ui text-[13px] text-text-2" />
            ) : (
              <p className="font-ui text-[13px] text-text-2 whitespace-pre-wrap">{e.work_done}</p>
            )}
            {e.blocker && (
              <p className="flex items-start gap-1.5 font-ui text-[12.5px] text-warning bg-warning/8 border border-warning/20 rounded-md px-2.5 py-1.5">
                <AlertTriangle size={12} className="shrink-0 mt-0.5" /> <span>{e.blocker}</span>
              </p>
            )}
          </div>
          )
        })}
      </div>

      {standup.notes && (
        <div className="px-4 py-2.5 border-t border-border-subtle bg-surface-2/40">
          <p className="font-mono text-[10px] uppercase tracking-wider text-text-4 mb-1">Notes</p>
          <p className="font-ui text-[12.5px] text-text-2 whitespace-pre-wrap">{standup.notes}</p>
        </div>
      )}
    </div>
  )
}
