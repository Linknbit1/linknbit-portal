import { useEffect, useMemo, useState } from 'react'
import { CheckSquare, ChevronRight, Clock, FolderKanban, Pencil, Search, Timer } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Skeleton } from '../ui/Skeleton'
import { PersonLink } from './PersonLink'
import { StatusChip } from './StatusChip'
import { useTimeEntries } from '../../hooks/useTimeEntries'
import {
  buildProjectBacklog, buildTaskBacklog, collectBacklogPeople, filterTimeEntries,
  type BacklogSegment, type ProjectBacklog, type TaskBacklog,
} from '../../lib/timeBacklog'
import { formatClock, formatMinutes } from '../../lib/duration'
import { formatStamp, formatStampTime } from '../../lib/utils'
import { cn } from '../../lib/cn'

/** Ticks only while something is running, so a settled backlog is static. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active])
  return now
}

const mins = (seconds: number) => formatMinutes(Math.round(seconds / 60))

/** "04 Aug, 09:00 AM → 10:30 AM", dropping the repeated date inside one day. */
function windowLabel(start: string, end: string | null): string {
  if (!end) return `${formatStamp(start)} → running`
  const sameDay = new Date(start).toDateString() === new Date(end).toDateString()
  return `${formatStamp(start)} → ${sameDay ? formatStampTime(end) : formatStamp(end)}`
}

type Person = { id: string; name: string; avatarUrl: string | null; seconds: number }

/** Who put the time in. Names on the left rail, avatars-only where space is tight. */
function People({ people, compact }: { people: Person[]; compact?: boolean }) {
  if (people.length === 0) return null

  if (compact) {
    return (
      <span className="flex -space-x-1.5">
        {people.slice(0, 4).map((p) => (
          <Avatar key={p.id} name={p.name} src={p.avatarUrl ?? undefined} size="xs" personId={p.id} />
        ))}
        {people.length > 4 && (
          <span className="flex size-6 items-center justify-center rounded-full border border-border-default bg-surface-2 font-mono text-[9px] text-text-3">
            +{people.length - 4}
          </span>
        )}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {people.map((p) => (
        <div key={p.id} className="flex items-center gap-2">
          <Avatar name={p.name} src={p.avatarUrl ?? undefined} size="xs" personId={p.id} />
          <PersonLink personId={p.id} className="min-w-0 flex-1 truncate font-ui text-[11.5px] text-text-2 hover:text-text-1">
            {p.name}
          </PersonLink>
          <span className="shrink-0 font-mono text-[11px] text-text-3">{mins(p.seconds)}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * One stretch of work. A manual entry says so, and says when it was typed in —
 * the gap between "worked 9-to-10" and "wrote that down three days later" is
 * the whole reason the distinction is recorded.
 */
function SegmentRow({ segment, now }: { segment: BacklogSegment; now: number }) {
  const { entry, running, idleBefore } = segment
  const seconds = running
    ? Math.max(0, Math.floor((now - new Date(entry.started_at).getTime()) / 1000))
    : segment.seconds
  const manual = entry.source === 'manual'

  return (
    <div className="border-t border-border-subtle first:border-0">
      {idleBefore !== null && (
        <p className="px-4 pt-2 font-mono text-[10px] text-text-4">paused {mins(idleBefore)}</p>
      )}
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-4 py-2">
        <span className="font-mono text-[11px] text-text-2">{windowLabel(entry.started_at, entry.ended_at)}</span>

        <span className={cn('font-mono text-[11px] font-semibold', running ? 'text-brand-red' : 'text-text-1')}>
          {running ? formatClock(seconds) : mins(seconds)}
        </span>

        {entry.profile && (
          <PersonLink personId={entry.profile.id} className="font-ui text-[11px] text-text-3 hover:text-text-1">
            {manual ? 'logged by' : 'timed by'} {entry.profile.name}
          </PersonLink>
        )}

        {manual && (
          <span
            className="inline-flex items-center gap-1 rounded-sm border border-warning/25 bg-warning/10 px-1.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-warning"
            title={`Entered by hand on ${formatStamp(entry.created_at)}`}
          >
            <Pencil size={8} /> added {formatStamp(entry.created_at)}
          </span>
        )}

        {entry.billable && (
          <span className="rounded-sm bg-success/10 px-1.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-success">
            Billable
          </span>
        )}

        {entry.note && <span className="w-full font-ui text-[11px] text-text-3">{entry.note}</span>}
      </div>
    </div>
  )
}

function TaskRow({ task, now, showProject }: { task: TaskBacklog; now: number; showProject: boolean }) {
  const [open, setOpen] = useState(false)
  const manualCount = task.segments.filter((s) => s.entry.source === 'manual').length

  return (
    <div className="border-b border-border-subtle last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2/40"
      >
        <ChevronRight size={13} className={cn('shrink-0 text-text-4 transition-transform', open && 'rotate-90')} />

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-ui text-[13px] font-medium text-text-1">{task.title}</span>
            <StatusChip status={task.status} />
            {task.running && (
              <span className="inline-flex items-center gap-1 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-brand-red">
                <Timer size={9} /> Running
              </span>
            )}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10.5px] text-text-4">
            {showProject && task.projectName && <span className="text-text-3">{task.projectName}</span>}
            <span>{task.segments.length} session{task.segments.length === 1 ? '' : 's'}</span>
            {manualCount > 0 && <span className="text-warning">{manualCount} added by hand</span>}
            <span>{task.lastEnd ? `last ${formatStamp(task.lastEnd)}` : 'in progress'}</span>
          </span>
        </span>

        <People people={task.people} compact />

        <span className="shrink-0 text-right">
          <span className="block font-mono text-[13px] font-semibold text-text-1">{mins(task.totalSeconds)}</span>
          {task.billableSeconds > 0 && (
            <span className="block font-mono text-[9.5px] text-success">{mins(task.billableSeconds)} billable</span>
          )}
        </span>
      </button>

      {open && (
        <div className="bg-surface-inset/50">
          {task.segments.map((s) => <SegmentRow key={s.entry.id} segment={s} now={now} />)}
        </div>
      )}
    </div>
  )
}

/**
 * A project and its tasks, side by side: what the project cost on the left,
 * where that time went on the right. The left rail is the answer people come
 * for; the task list is the working out.
 */
function ProjectCard({ group, now }: { group: ProjectBacklog; now: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-default bg-surface-1 lg:flex">
      {/* Left rail — project identity and its total. */}
      <div className="shrink-0 border-b border-border-default bg-surface-2/30 p-4 lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex items-start gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-2 text-text-3">
            <FolderKanban size={14} />
          </span>
          <h3 className="min-w-0 flex-1 font-display text-body/snug font-bold text-text-1">
            {group.projectName}
          </h3>
        </div>

        <p className="mt-3 font-display text-[26px] font-bold leading-none text-text-1">{mins(group.totalSeconds)}</p>
        <p className="mt-1 font-mono text-[10.5px] text-text-4">
          {group.taskCount} task{group.taskCount === 1 ? '' : 's'}
          {group.billableSeconds > 0 && <span className="text-success"> · {mins(group.billableSeconds)} billable</span>}
          {group.running && <span className="text-brand-red"> · running</span>}
        </p>

        {group.people.length > 0 && (
          <div className="mt-3.5 border-t border-border-subtle pt-3">
            <People people={group.people} />
          </div>
        )}
      </div>

      {/* Right — the tasks that time went into. */}
      <div className="min-w-0 flex-1">
        {group.tasks.map((t) => <TaskRow key={t.taskId} task={t} now={now} showProject={false} />)}
      </div>
    </div>
  )
}

/** Sessions shown on a task card before it asks to be expanded. */
const SESSION_PREVIEW_COUNT = 5

/**
 * The task-level twin of {@link ProjectCard}: what this one task cost on the
 * left, the sessions that add up to it on the right. Same shape as the project
 * view so "where did the time go" reads identically at both altitudes.
 */
function TaskCard({ task, now, showProject }: { task: TaskBacklog; now: number; showProject: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const manualCount = task.segments.filter((s) => s.entry.source === 'manual').length
  // Newest first here: a card is about one task, and the last thing that
  // happened to it is the thing being asked about.
  const ordered = useMemo(() => [...task.segments].reverse(), [task.segments])
  const visible = expanded ? ordered : ordered.slice(0, SESSION_PREVIEW_COUNT)

  return (
    <div className="overflow-hidden rounded-xl border border-border-default bg-surface-1 lg:flex">
      {/* Left rail — the task and its total. */}
      <div className="shrink-0 border-b border-border-default bg-surface-2/30 p-4 lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex items-start gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-2 text-text-3">
            <CheckSquare size={14} />
          </span>
          <h3 className="min-w-0 flex-1 font-display text-body/snug font-bold text-text-1">{task.title}</h3>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <StatusChip status={task.status} />
          {task.running && (
            <span className="inline-flex items-center gap-1 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-brand-red">
              <Timer size={9} /> Running
            </span>
          )}
        </div>

        <p className="mt-3 font-display text-[26px] font-bold leading-none text-text-1">{mins(task.totalSeconds)}</p>
        <p className="mt-1 font-mono text-[10.5px] text-text-4">
          {task.segments.length} session{task.segments.length === 1 ? '' : 's'}
          {task.billableSeconds > 0 && <span className="text-success"> · {mins(task.billableSeconds)} billable</span>}
          {manualCount > 0 && <span className="text-warning"> · {manualCount} by hand</span>}
        </p>
        {showProject && task.projectName && (
          <p className="mt-1 truncate font-mono text-[10.5px] text-text-3">{task.projectName}</p>
        )}

        {task.people.length > 0 && (
          <div className="mt-3.5 border-t border-border-subtle pt-3">
            <People people={task.people} />
          </div>
        )}
      </div>

      {/* Right — the sessions that add up to it. */}
      <div className="min-w-0 flex-1">
        {visible.map((s) => <SegmentRow key={s.entry.id} segment={s} now={now} />)}
        {ordered.length > SESSION_PREVIEW_COUNT && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full border-t border-border-subtle px-4 py-2 text-left font-ui text-[11.5px] text-text-3 transition-colors hover:bg-surface-2/40 hover:text-text-1"
          >
            {expanded ? 'Show fewer' : `Show all ${ordered.length} sessions`}
          </button>
        )}
      </div>
    </div>
  )
}

interface TimeBacklogProps {
  /** Omit for every project the caller can see. */
  projectId?: string
  /** Default shape: 'project' nests tasks under their project, 'task' lists them flat. */
  groupBy: 'project' | 'task'
}

/**
 * Where the time went: every task that has been tracked, expandable into the
 * individual start→stop sessions, with the gap between them shown as a pause.
 *
 * Search matches project, task, person and session note, so one box answers both
 * "how long did this project take" and "what has this person been working on".
 */
export function TimeBacklog({ projectId, groupBy }: TimeBacklogProps) {
  const { data: entries = [], isLoading } = useTimeEntries({ projectId })

  const [query, setQuery] = useState('')
  const [personId, setPersonId] = useState('')

  // Only offer people who actually logged time, drawn from the data itself.
  const people = useMemo(() => collectBacklogPeople(entries), [entries])
  const personOptions = useMemo(() => [
    { value: '', label: 'Everyone' },
    ...people.map((p) => ({ value: p.id, label: p.name, avatar: { name: p.name, url: p.avatarUrl } })),
  ], [people])

  const shown = useMemo(
    () => filterTimeEntries(entries, { query, personId: personId || undefined }),
    [entries, query, personId],
  )

  const anyRunning = shown.some((e) => e.ended_at === null)
  const now = useNow(anyRunning)

  // Filtering to one person is a question about *their* spread of work, so the
  // view switches to project grouping to answer "which projects, how much each".
  const nested = groupBy === 'project' || !!personId
  const taskGroups = useMemo(() => buildTaskBacklog(shown, now), [shown, now])
  const projectGroups = useMemo(
    () => (nested ? buildProjectBacklog(shown, now) : []),
    [shown, nested, now],
  )

  const totalSeconds = taskGroups.reduce((s, t) => s + t.totalSeconds, 0)
  const billableSeconds = taskGroups.reduce((s, t) => s + t.billableSeconds, 0)
  const manualSeconds = shown
    .filter((e) => e.source === 'manual')
    .reduce((s, e) => s + Math.round((new Date(e.ended_at ?? e.started_at).getTime() - new Date(e.started_at).getTime()) / 1000), 0)
  const projectCount = new Set(taskGroups.map((t) => t.projectId ?? 'none')).size
  const filtering = !!query.trim() || !!personId
  const personName = people.find((p) => p.id === personId)?.name

  const filterBar = (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search project, task or note…"
        iconLeft={<Search size={14} />}
        className="w-full sm:w-72"
      />
      <Select value={personId} onChange={setPersonId} options={personOptions} size="sm" />
      {filtering && (
        <button
          onClick={() => { setQuery(''); setPersonId('') }}
          className="h-8 rounded-sm px-2.5 font-ui text-[11.5px] text-text-3 transition-colors hover:text-error"
        >
          Clear
        </button>
      )}
    </div>
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        {filterBar}
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {filterBar}

      {/* One strip, not four cards — the same numbers with three fewer borders. */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-border-default bg-surface-1 px-4 py-3">
        <div>
          <span className="font-mono text-[9.5px] font-semibold uppercase tracking-wider text-text-4">
            {personName ? `${personName.split(' ')[0]}'s time` : 'Total tracked'}
          </span>
          <p className="font-display text-h3/tight font-bold text-text-1">{mins(totalSeconds)}</p>
        </div>
        <div className="h-8 w-px bg-border-subtle" />
        <div>
          <span className="font-mono text-[9.5px] font-semibold uppercase tracking-wider text-text-4">Billable</span>
          <p className="font-display text-h3/tight font-bold text-success">{mins(billableSeconds)}</p>
        </div>
        {manualSeconds > 0 && (
          <div>
            <span className="font-mono text-[9.5px] font-semibold uppercase tracking-wider text-text-4">Added by hand</span>
            <p className="font-display text-h3/tight font-bold text-warning">{mins(manualSeconds)}</p>
          </div>
        )}
        <div className="ml-auto flex items-center gap-5 font-mono text-[11px] text-text-3">
          <span>{projectCount} project{projectCount === 1 ? '' : 's'}</span>
          <span>{taskGroups.length} task{taskGroups.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      {taskGroups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border-default py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-text-3"><Clock size={22} /></span>
          <p className="font-ui text-[14px] text-text-2">
            {filtering ? 'Nothing matches those filters' : 'No time logged yet'}
          </p>
          <p className="max-w-sm font-ui text-[12px] text-text-4">
            {filtering
              ? 'Try a different project, task or person.'
              : 'Start a timer or log time on a task and every session shows up here, when it started, stopped and resumed.'}
          </p>
        </div>
      ) : nested ? (
        <div className="space-y-3">
          {projectGroups.map((p) => <ProjectCard key={p.projectId ?? 'none'} group={p} now={now} />)}
        </div>
      ) : (
        <div className="space-y-3">
          {taskGroups.map((t) => <TaskCard key={t.taskId} task={t} now={now} showProject={!projectId} />)}
        </div>
      )}
    </div>
  )
}
