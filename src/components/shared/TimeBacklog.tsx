import { useEffect, useMemo, useState } from 'react'
import {
  CheckSquare, ChevronRight, Clock, DollarSign, FolderKanban, Pause, Play, Search, Timer,
  type LucideIcon,
} from 'lucide-react'
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

const dayTime = (iso: string) => {
  const d = new Date(iso)
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}`
}

const mins = (seconds: number) => formatMinutes(Math.round(seconds / 60))

type Person = { id: string; name: string; avatarUrl: string | null; seconds: number }

/**
 * Who spent how long. Each person is named and links to their profile, so the
 * backlog answers "who put the time in", not just "how much".
 */
function PeopleStrip({ people }: { people: Person[] }) {
  if (people.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {people.map((p) => (
        <span
          key={p.id}
          className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-2 py-0.5 pl-0.5 pr-2"
          title={`${p.name} — ${mins(p.seconds)}`}
        >
          <Avatar name={p.name} src={p.avatarUrl ?? undefined} size="xs" personId={p.id} />
          <PersonLink personId={p.id} className="max-w-28 truncate font-ui text-[11px] text-text-2 hover:text-text-1">
            {p.name}
          </PersonLink>
          <span className="font-mono text-[10px] font-semibold text-text-3">{mins(p.seconds)}</span>
        </span>
      ))}
    </div>
  )
}

/** One start→stop stretch, plus the pause that preceded it. */
function SegmentRow({ segment, now }: { segment: BacklogSegment; now: number }) {
  const { entry, running, idleBefore } = segment
  const seconds = running
    ? Math.max(0, Math.floor((now - new Date(entry.started_at).getTime()) / 1000))
    : segment.seconds

  return (
    <>
      {idleBefore !== null && (
        <div className="flex items-center gap-1.5 px-4 py-1 pl-10 font-mono text-[10px] text-text-4">
          <Pause size={10} className="shrink-0" /> paused {mins(idleBefore)}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border-subtle px-4 py-2 pl-10">
        <Play size={10} className={cn('shrink-0', running ? 'text-brand-red' : 'text-text-4')} />
        <span className="font-mono text-[10.5px] text-text-2">{dayTime(entry.started_at)}</span>
        <span className="font-mono text-[10.5px] text-text-4">→</span>
        <span className="font-mono text-[10.5px] text-text-2">
          {entry.ended_at ? dayTime(entry.ended_at) : <span className="text-brand-red">running</span>}
        </span>
        {entry.profile && (
          <span className="inline-flex items-center gap-1.5">
            <Avatar name={entry.profile.name} src={entry.profile.avatar_url ?? undefined} size="xs" personId={entry.profile.id} />
            <PersonLink personId={entry.profile.id} className="font-ui text-[10.5px] text-text-3 hover:text-text-1">
              {entry.profile.name}
            </PersonLink>
          </span>
        )}
        {entry.billable && (
          <span className="rounded-full bg-success/10 px-1.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-success">
            Billable
          </span>
        )}
        <span className={cn('ml-auto font-mono text-[11px] font-semibold', running ? 'text-brand-red' : 'text-text-1')}>
          {running ? formatClock(seconds) : mins(seconds)}
        </span>
        {entry.note && <span className="w-full pl-4 font-ui text-[11px] text-text-3">{entry.note}</span>}
      </div>
    </>
  )
}

function TaskRow({ task, now, showProject }: { task: TaskBacklog; now: number; showProject: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-border-subtle last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-surface-2/50"
      >
        <ChevronRight size={14} className={cn('shrink-0 text-text-4 transition-transform', open && 'rotate-90')} />
        <CheckSquare size={13} className="shrink-0 text-text-4" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-ui text-[13px] font-semibold text-text-1">{task.title}</span>
            <StatusChip status={task.status} />
            {task.running && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-red/12 px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-brand-red">
                <Timer size={9} /> Running
              </span>
            )}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[10.5px] text-text-4">
            {showProject && task.projectName && <span className="text-text-3">{task.projectName}</span>}
            <span>{task.segments.length} session{task.segments.length === 1 ? '' : 's'}</span>
            <span>first {dayTime(task.firstStart)}</span>
            {task.lastEnd && <span>last {dayTime(task.lastEnd)}</span>}
          </span>
        </span>
        <span className="hidden md:block"><PeopleStrip people={task.people} /></span>
        <span className="shrink-0 text-right">
          <span className="block font-display text-[14px] font-bold text-text-1">{mins(task.totalSeconds)}</span>
          {task.billableSeconds > 0 && (
            <span className="block font-mono text-[9.5px] text-success">{mins(task.billableSeconds)} billable</span>
          )}
        </span>
      </button>

      {open && (
        <div className="bg-surface-inset/60 pb-1">
          {/* People move below the fold on small screens, where the row has no room. */}
          <div className="px-4 py-2 md:hidden"><PeopleStrip people={task.people} /></div>
          {task.segments.map((s) => <SegmentRow key={s.entry.id} segment={s} now={now} />)}
        </div>
      )}
    </div>
  )
}

function ProjectCard({ group, now }: { group: ProjectBacklog; now: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-default bg-surface-1">
      <div className="flex flex-wrap items-center gap-3 border-b border-border-default bg-surface-2/40 px-4 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-text-3">
          <FolderKanban size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[14px] font-bold text-text-1">{group.projectName}</span>
          <span className="font-mono text-[10.5px] text-text-4">
            {group.taskCount} task{group.taskCount === 1 ? '' : 's'} tracked
          </span>
        </span>
        <PeopleStrip people={group.people} />
        <span className="shrink-0 text-right">
          <span className="block font-display text-[15px] font-bold text-text-1">{mins(group.totalSeconds)}</span>
          {group.billableSeconds > 0 && (
            <span className="block font-mono text-[9.5px] text-success">{mins(group.billableSeconds)} billable</span>
          )}
        </span>
      </div>
      {group.tasks.map((t) => <TaskRow key={t.taskId} task={t} now={now} showProject={false} />)}
    </div>
  )
}

function SummaryCell({ icon: Icon, label, value, tone }: {
  icon: LucideIcon
  label: string
  value: string
  tone?: 'success'
}) {
  return (
    <div className="rounded-lg border border-border-default bg-surface-1 px-4 py-3">
      <span className="flex items-center gap-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-text-4">
        <Icon size={11} /> {label}
      </span>
      <p className={cn('mt-1 font-display text-[18px] font-bold', tone === 'success' ? 'text-success' : 'text-text-1')}>
        {value}
      </p>
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
  const projectCount = new Set(taskGroups.map((t) => t.projectId ?? 'none')).size
  const filtering = !!query.trim() || !!personId
  const personName = people.find((p) => p.id === personId)?.name

  const everyone = useMemo(() => taskGroups
    .flatMap((t) => t.people)
    .reduce<Person[]>((acc, p) => {
      const found = acc.find((x) => x.id === p.id)
      if (found) found.seconds += p.seconds
      else acc.push({ ...p })
      return acc
    }, [])
    .sort((a, b) => b.seconds - a.seconds), [taskGroups])

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
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {filterBar}

      {/* Totals answer the headline question and follow the active filter. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCell icon={Clock} label={personName ? `${personName.split(' ')[0]}'s time` : 'Total tracked'} value={mins(totalSeconds)} />
        <SummaryCell icon={DollarSign} label="Billable" value={mins(billableSeconds)} tone="success" />
        <SummaryCell icon={FolderKanban} label="Projects" value={String(projectCount)} />
        <SummaryCell icon={CheckSquare} label="Tasks" value={String(taskGroups.length)} />
      </div>

      {everyone.length > 1 && (
        <div className="rounded-lg border border-border-default bg-surface-1 px-4 py-3">
          <span className="mb-2 block font-mono text-[9.5px] font-semibold uppercase tracking-wider text-text-4">Time by person</span>
          <PeopleStrip people={everyone} />
        </div>
      )}

      {taskGroups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-default py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-text-3"><Clock size={22} /></span>
          <p className="font-ui text-[14px] text-text-2">
            {filtering ? 'Nothing matches those filters' : 'No time logged yet'}
          </p>
          <p className="max-w-sm font-ui text-[12px] text-text-4">
            {filtering
              ? 'Try a different project, task or person.'
              : 'Start a timer or log time on a task and every session shows up here — when it started, stopped and resumed.'}
          </p>
        </div>
      ) : nested ? (
        <div className="space-y-3">
          {projectGroups.map((p) => <ProjectCard key={p.projectId ?? 'none'} group={p} now={now} />)}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border-default bg-surface-1">
          {taskGroups.map((t) => <TaskRow key={t.taskId} task={t} now={now} showProject />)}
        </div>
      )}
    </div>
  )
}
