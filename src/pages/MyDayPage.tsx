import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarClock, Video, Play, Square, CircleDot, ClipboardList,
  Bell, Home, Plane, ArrowRight, Loader2, CheckCircle2,
  GitBranch, MessageSquare, Paperclip, Timer, CalendarDays,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../lib/cn'
import { Topbar } from '../components/layout/Topbar'
import { Avatar, AvatarGroup } from '../components/ui/Avatar'
import { AttendanceCheckInCard } from '../components/shared/AttendanceCheckInCard'
import { StatusChip } from '../components/shared/StatusChip'
import { PriorityChip } from '../components/shared/PriorityChip'
import { useAuthContext } from '../context/AuthContext'
import { useMyMeetings } from '../hooks/useBd'
import { useTasks } from '../hooks/useTasks'
import { useStandupWindow } from '../hooks/useStandups'
import { useDayRoster } from '../hooks/useAttendance'
import { useWaitingOnYou } from '../hooks/useWaitingOnYou'
import { useRunningTimeEntry, useStartTimer, useStopTimer } from '../hooks/useTimeEntries'
import { useMyPermissions } from '../hooks/usePermissions'
import { useTeammateIds } from '../hooks/useScopeFilter'
import { useTaskStatuses } from '../hooks/useTaskStatuses'
import { ADMINISTRATOR } from '../api/permissions'
import { projectTaskDrawerHref } from '../constants/notifications'
import { formatStamp } from '../lib/utils'
import { formatEstimate } from '../lib/duration'
import type { TaskListItem } from '../api/tasks'
import type { BdMeeting } from '../types'

/** Local calendar date (`en-CA` renders ISO) — "today" is a local-day question. */
function localToday(): string {
  return new Intl.DateTimeFormat('en-CA').format(new Date())
}

const fmtClock = (iso: string): string =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })

// Which statuses mean "finished" is a property of the column now, not a fixed
// pair of keys, so a board with its own Shipped column drops off here too.

/**
 * A clock that ticks, rather than `Date.now()` read during render. Reading the
 * time while rendering is impure — React may re-render at any moment and the
 * "in 12 min" beside a meeting would drift or freeze depending on when it did.
 * Half a minute is fine: nothing here is counted in seconds.
 */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])
  return now
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// ── Layout shells ─────────────────────────────────────────────────────────────

function Panel({
  title,
  icon: Icon,
  count,
  action,
  children,
}: {
  title: string
  icon: LucideIcon
  count?: number
  action?: { to: string; label: string }
  children: React.ReactNode
}) {
  return (
    <section className="border border-border-default bg-surface-1">
      <header className="flex items-center gap-2 px-4 py-2.5 bg-surface-2 border-b border-border-subtle">
        <Icon size={13} className="text-text-3" />
        <h2 className="font-ui font-semibold text-[12.5px] text-text-1">{title}</h2>
        {count != null && count > 0 && (
          <span className="font-mono text-[11px] text-text-4 tabular-nums">{count}</span>
        )}
        {action && (
          <Link
            to={action.to}
            className="ml-auto inline-flex items-center gap-1 font-ui text-[11.5px] text-text-3 hover:text-brand-red"
          >
            {action.label}
            <ArrowRight size={11} />
          </Link>
        )}
      </header>
      {children}
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-7 text-center font-ui text-[12.5px] text-text-4">{children}</p>
}

// ── Meetings ──────────────────────────────────────────────────────────────────

function MeetingRow({
  meeting,
  isNext,
  now,
}: {
  meeting: BdMeeting
  isNext: boolean
  now: number
}) {
  const start = new Date(meeting.scheduledAt)
  const minutesAway = Math.round((start.getTime() - now) / 60000)
  const past = minutesAway < -meeting.durationMinutes

  return (
    <div
      className={cn(
        'flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5 border-b border-border-subtle last:border-0',
        isNext && 'shadow-[inset_3px_0_0_var(--color-brand-red)]',
        past && 'opacity-55',
      )}
    >
      <span className="font-mono text-[11.5px] text-text-3 tabular-nums w-20 shrink-0">
        {fmtClock(meeting.scheduledAt)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-ui font-medium text-[13px] text-text-1 truncate">{meeting.company}</p>
        <p className="font-ui text-[11.5px] text-text-4 truncate">
          {meeting.durationMinutes} min · hosted by {meeting.hostName}
        </p>
      </div>
      {isNext && minutesAway >= 0 && (
        <span className="px-1.5 py-0.5 rounded-sm border border-brand-red/30 bg-brand-red/12 text-brand-red font-ui text-[10.5px] font-semibold uppercase tracking-wider">
          {minutesAway === 0 ? 'Now' : `in ${minutesAway} min`}
        </span>
      )}
      {meeting.joinUrl && !past && (
        <a
          href={meeting.joinUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-ui text-[11.5px] text-brand-red hover:underline"
        >
          <Video size={11} />
          Join
        </a>
      )}
    </div>
  )
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

type Bucket = 'overdue' | 'today' | 'in_progress'

/**
 * The urgency flag, which answers "why is this on today's list" — a different
 * question from the task's own status, which now sits beside it. `in_progress`
 * has no flag: the status chip already says so, and two chips repeating each
 * other is what made the row hard to scan.
 */
const BUCKET_META: Record<Bucket, { label: string; className: string } | null> = {
  overdue: { label: 'Overdue', className: 'bg-error/10 text-error border-error/30' },
  today: { label: 'Due today', className: 'bg-warning/12 text-warning border-warning/30' },
  in_progress: null,
}

/** One count with its icon — the same vocabulary the board cards use. */
function MetaCount({ icon: Icon, count, label }: { icon: LucideIcon; count: number; label: string }) {
  if (count <= 0) return null
  return (
    <span className="flex items-center gap-1 font-mono text-[10.5px]" title={`${count} ${label}`}>
      <Icon size={11} />
      {count}
    </span>
  )
}

function TaskRow({
  task,
  bucket,
  myId,
  runningTaskId,
  onStart,
  onStop,
  busy,
}: {
  task: TaskListItem
  bucket: Bucket
  myId: string
  runningTaskId: string | null
  onStart: (id: string) => void
  onStop: () => void
  busy: boolean
}) {
  const running = runningTaskId === task.id
  const flag = BUCKET_META[bucket]
  const estimate = formatEstimate(task.estimated_minutes)
  const service = task.project_service?.service ?? null
  // Everyone else on the task — that it is shared changes how you pick it up.
  const others = task.assignees.filter((a) => a.id !== myId)

  // Opens the task in the project drawer rather than on its own page, so the
  // board stays behind it and closing lands you back in context. Tasks with no
  // project (rare, but possible) keep the standalone page.
  const href = task.project
    ? projectTaskDrawerHref(task.project.id, task.id)
    : `/tasks/${task.id}`

  return (
    <div className="flex flex-col gap-1.5 px-4 py-3 border-b border-border-subtle last:border-0">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <Link
          to={href}
          className="min-w-0 flex-1 font-ui font-medium text-[13px] text-text-1 truncate hover:text-brand-red"
        >
          {task.title}
        </Link>

        <StatusChip status={task.status} />
        <PriorityChip priority={task.priority} />
        {flag && (
          <span
            className={cn(
              'inline-flex items-center px-1.5 py-0.5 rounded-sm border',
              'font-ui text-[10.5px] font-semibold uppercase tracking-wider whitespace-nowrap',
              flag.className,
            )}
          >
            {flag.label}
          </span>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={() => (running ? onStop() : onStart(task.id))}
          aria-label={running ? 'Stop timer' : 'Start timer'}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-sm border font-ui text-[11.5px] font-semibold transition-colors disabled:opacity-50',
            running
              ? 'border-brand-red/30 bg-brand-red/12 text-brand-red hover:bg-brand-red/20'
              : 'border-border-default bg-surface-2 text-text-3 hover:text-text-1',
          )}
        >
          {running ? <Square size={11} /> : <Play size={11} />}
          {running ? 'Stop' : 'Start'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-text-4">
        {service && (
          <span className="flex items-center gap-1.5 font-ui text-[11.5px] min-w-0">
            {/* The service colour is admin-set per row, so it can only be inline. */}
            <span
              className="size-1.5 rounded-full shrink-0"
              style={{ background: service.color }}
              aria-hidden
            />
            <span className="truncate">{service.name}</span>
          </span>
        )}
        <span className="font-ui text-[11.5px] truncate min-w-0">
          {task.project?.name ?? 'No project'}
          {task.stage?.name ? ` · ${task.stage.name}` : ''}
        </span>
        {task.due_date && (
          <span
            className={cn('flex items-center gap-1 font-mono text-[10.5px]', bucket === 'overdue' && 'text-error')}
            title="Due date"
          >
            <CalendarDays size={11} />
            {formatStamp(task.due_date)}
          </span>
        )}
        {task.subtask_count > 0 && (
          <span className="flex items-center gap-1 font-mono text-[10.5px]" title="Subtasks done">
            <GitBranch size={11} />
            {task.subtask_done}/{task.subtask_count}
          </span>
        )}
        <MetaCount icon={MessageSquare} count={task.comment_count} label="comments" />
        <MetaCount icon={Paperclip} count={task.attachment_count} label="attachments" />
        {estimate && (
          <span className="flex items-center gap-1 font-mono text-[10.5px]" title="Time estimate">
            <Timer size={11} />
            {estimate}
          </span>
        )}
        {others.length > 0 && (
          <span className="ml-auto flex items-center gap-1.5" title="Also assigned">
            <AvatarGroup
              users={others.map((a) => ({ id: a.id, name: a.name, avatarUrl: a.avatar_url }))}
              max={3}
              size="xs"
            />
          </span>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * My Day — everything the signed-in person owes or is owed in the next few
 * hours, in one place. Deliberately not a metrics screen: every block is either
 * something to do today or something blocking someone else. The moment it grows
 * a chart it has become a company overview again.
 *
 * Every source here is already fetched elsewhere in the app, so this page is
 * assembly rather than new plumbing, and it shares those cache entries.
 */
export default function MyDayPage() {
  const { profile } = useAuthContext()
  const myId = profile?.id ?? ''
  const today = localToday()

  const now = useNow()

  const meetingsQ = useMyMeetings()
  const tasksQ = useTasks()
  const windowQ = useStandupWindow()
  const rosterQ = useDayRoster(today, !!profile)
  // Same source as Notifications and its badge, so the three can never disagree
  // about whether something is waiting.
  const { items: waiting, total: waitingTotal } = useWaitingOnYou()

  // Out today is scoped to the people this person actually works alongside.
  // Attendance managers (HR, admins) see the whole company, because chasing an
  // unexplained absence anywhere is their job; everybody else — an employee on
  // one team, a PM on five — sees whoever shares a team with them. One rule,
  // and it widens on its own as somebody joins more teams.
  const { data: permissions } = useMyPermissions()
  const seesEveryone =
    !!permissions && (permissions.includes(ADMINISTRATOR) || permissions.includes('can_manage_attendance'))
  const teammates = useTeammateIds(true)

  const { data: taskStatuses = [] } = useTaskStatuses()
  const doneStatuses = useMemo(
    () => new Set(taskStatuses.filter((s) => s.is_done).map((s) => s.key)),
    [taskStatuses],
  )

  const { data: running } = useRunningTimeEntry()
  const startTimer = useStartTimer()
  const stopTimer = useStopTimer()
  const timerBusy = startTimer.isPending || stopTimer.isPending

  const todaysMeetings = useMemo(() => {
    return (meetingsQ.data ?? [])
      .filter((m) => m.scheduledAt.slice(0, 10) === today)
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  }, [meetingsQ.data, today])

  // The first meeting that has not finished yet — the one worth flagging.
  const nextMeetingId = useMemo(
    () =>
      todaysMeetings.find(
        (m) => new Date(m.scheduledAt).getTime() + m.durationMinutes * 60000 > now,
      )?.id ?? null,
    [todaysMeetings, now],
  )

  /**
   * My open work, bucketed. Assignment is read the same way the Tasks board
   * reads it — the join table first, then the legacy primary assignee — so a
   * task assigned to several people still counts as mine.
   */
  const myWork = useMemo(() => {
    const mine = (tasksQ.data ?? []).filter(
      (t) =>
        !doneStatuses.has(t.status) &&
        (t.assignees.some((a) => a.id === myId) || t.assignee?.id === myId),
    )
    const buckets: { task: TaskListItem; bucket: Bucket }[] = []
    for (const task of mine) {
      const due = task.due_date
      if (due && due < today) buckets.push({ task, bucket: 'overdue' })
      else if (due === today) buckets.push({ task, bucket: 'today' })
      else if (task.status === 'in_progress') buckets.push({ task, bucket: 'in_progress' })
    }
    // Overdue first, then due today, then whatever is simply underway.
    const order: Record<Bucket, number> = { overdue: 0, today: 1, in_progress: 2 }
    return buckets.sort(
      (a, b) => order[a.bucket] - order[b.bucket] || a.task.title.localeCompare(b.task.title),
    )
  }, [tasksQ.data, myId, today, doneStatuses])

  const away = useMemo(
    () =>
      (rosterQ.data ?? []).filter(
        (r) =>
          (r.status === 'leave' || r.status === 'wfh') &&
          r.profile_id !== myId &&
          (seesEveryone || teammates.has(r.profile_id)),
      ),
    [rosterQ.data, myId, seesEveryone, teammates],
  )

  // Somebody on no team at all would otherwise stare at "Everybody is in" for
  // ever, which reads as a fact rather than as an empty scope.
  const hasScope = seesEveryone || teammates.size > 1

  const standup = windowQ.data

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="My Day" />

      <div className="px-4 py-6 lg:px-8 lg:py-7 flex flex-col gap-6 max-w-content">
        <header className="flex flex-col gap-1">
          <h1 className="font-display font-bold text-[22px] text-text-1">
            {greeting()}
            {profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}
          </h1>
          <p className="font-mono text-[12px] text-text-4">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </header>

        {running?.task && (
          <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 border border-brand-red/30 bg-brand-red/10">
            <Loader2 size={14} className="animate-spin text-brand-red" />
            <span className="font-ui text-[13px] text-text-1">
              Timer running on <span className="font-semibold">{running.task.title}</span>
            </span>
            <button
              type="button"
              disabled={timerBusy}
              onClick={() => stopTimer.mutate()}
              className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-sm border border-brand-red/30 bg-brand-red/15 text-brand-red font-ui text-[11.5px] font-semibold hover:bg-brand-red/25 disabled:opacity-50"
            >
              <Square size={11} />
              Stop
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_20rem] gap-5 items-start">
          {/* ── The day itself ───────────────────────────────────────────── */}
          <div className="flex flex-col gap-5 min-w-0">
            <Panel
              title="Meetings today"
              icon={CalendarClock}
              count={todaysMeetings.length}
              action={{ to: '/my-meetings', label: 'All meetings' }}
            >
              {meetingsQ.isLoading ? (
                <Empty>Loading…</Empty>
              ) : todaysMeetings.length === 0 ? (
                <Empty>Nothing in the calendar today.</Empty>
              ) : (
                todaysMeetings.map((m) => (
                  <MeetingRow key={m.id} meeting={m} isNext={m.id === nextMeetingId} now={now} />
                ))
              )}
            </Panel>

            <Panel
              title="Your work"
              icon={CircleDot}
              count={myWork.length}
              action={{ to: '/tasks', label: 'All tasks' }}
            >
              {tasksQ.isLoading ? (
                <Empty>Loading…</Empty>
              ) : myWork.length === 0 ? (
                <Empty>Nothing overdue, due today, or underway. </Empty>
              ) : (
                myWork.map(({ task, bucket }) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    bucket={bucket}
                    myId={myId}
                    runningTaskId={running?.task?.id ?? null}
                    onStart={(id) => startTimer.mutate(id)}
                    onStop={() => stopTimer.mutate()}
                    busy={timerBusy}
                  />
                ))
              )}
            </Panel>
          </div>

          {/* ── Obligations and context ──────────────────────────────────── */}
          <div className="flex flex-col gap-5 min-w-0">
            <AttendanceCheckInCard />

            {standup?.is_required && standup.is_working_day && (
              <Panel title="Standup" icon={ClipboardList}>
                <div className="px-4 py-3 flex flex-col gap-2">
                  {standup.already_done ? (
                    <p className="flex items-center gap-2 font-ui text-[12.5px] text-success">
                      <CheckCircle2 size={13} />
                      Submitted for today.
                    </p>
                  ) : standup.is_open ? (
                    <>
                      <p className="font-ui text-[12.5px] text-text-2">
                        The window is open. It closes at {fmtClock(standup.closes_at)}.
                      </p>
                      <Link
                        to="/standup"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-sm bg-brand-red text-white font-ui text-[12.5px] font-semibold hover:bg-brand-red/90"
                      >
                        Write today's standup
                        <ArrowRight size={12} />
                      </Link>
                    </>
                  ) : (
                    <p className="font-ui text-[12.5px] text-text-3">
                      Opens at {fmtClock(standup.opens_at)}.
                    </p>
                  )}
                </div>
              </Panel>
            )}

            <Panel
              title="Waiting on you"
              icon={Bell}
              count={waitingTotal}
              action={waiting.length > 0 ? { to: '/notifications', label: 'Notifications' } : undefined}
            >
              {waiting.length === 0 ? (
                <Empty>Nothing is stuck on you.</Empty>
              ) : (
                <div className="flex flex-col">
                  {/* Capped: My Day is a summary. The rest are one click away. */}
                  {waiting.slice(0, 5).map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.id}
                        to={item.to}
                        className="flex items-center gap-2 px-4 py-2.5 border-b border-border-subtle last:border-0 hover:bg-surface-2"
                      >
                        <Icon size={13} className="shrink-0 text-text-3" />
                        <span className="font-ui text-[12.5px] text-text-2 truncate">{item.label}</span>
                        <ArrowRight size={11} className="ml-auto shrink-0 text-text-4" />
                      </Link>
                    )
                  })}
                </div>
              )}
            </Panel>

            <Panel
              title="Out today"
              icon={Home}
              count={away.length}
              action={{ to: '/attendance/today', label: 'Roster' }}
            >
              {rosterQ.isLoading ? (
                <Empty>Loading…</Empty>
              ) : !hasScope ? (
                <Empty>You are not on a team yet, so there is nobody to show here.</Empty>
              ) : away.length === 0 ? (
                <Empty>{seesEveryone ? 'Everybody is in.' : 'Everybody on your teams is in.'}</Empty>
              ) : (
                away.map((person) => (
                  <div
                    key={person.profile_id}
                    className="flex items-center gap-2.5 px-4 py-2 border-b border-border-subtle last:border-0"
                  >
                    <Avatar
                      name={person.name}
                      src={person.avatar_url ?? undefined}
                      size="sm"
                      personId={person.profile_id}
                    />
                    <span className="font-ui text-[12.5px] text-text-2 truncate flex-1">
                      {person.name}
                    </span>
                    {person.status === 'leave' ? (
                      <Plane size={12} className="text-service-design shrink-0" />
                    ) : (
                      <Home size={12} className="text-service-dev shrink-0" />
                    )}
                  </div>
                ))
              )}
            </Panel>
          </div>
        </div>
      </div>
    </div>
  )
}
