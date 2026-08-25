import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarClock, Video, Play, Square, AlertTriangle, CircleDot, ClipboardList,
  Inbox, Trophy, Home, Plane, ArrowRight, Loader2, CheckCircle2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../lib/cn'
import { Topbar } from '../components/layout/Topbar'
import { Avatar } from '../components/ui/Avatar'
import { AttendanceCheckInCard } from '../components/shared/AttendanceCheckInCard'
import { useAuthContext } from '../context/AuthContext'
import { useMyMeetings } from '../hooks/useBd'
import { useTasks } from '../hooks/useTasks'
import { useStandupWindow } from '../hooks/useStandups'
import { useNotifications } from '../hooks/useNotifications'
import { useDayRoster } from '../hooks/useAttendance'
import { useClaimableQuestCount } from '../hooks/useGamification'
import { useRunningTimeEntry, useStartTimer, useStopTimer } from '../hooks/useTimeEntries'
import type { TaskListItem } from '../api/tasks'
import type { BdMeeting } from '../types'

/** Local calendar date (`en-CA` renders ISO) — "today" is a local-day question. */
function localToday(): string {
  return new Intl.DateTimeFormat('en-CA').format(new Date())
}

const fmtClock = (iso: string): string =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })

/** Statuses that mean the work is finished, so it drops off the day. */
const DONE_STATUSES = new Set(['completed', 'approved'])

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

const BUCKET_META: Record<Bucket, { label: string; className: string }> = {
  overdue: { label: 'Overdue', className: 'bg-error/10 text-error border-error/30' },
  today: { label: 'Due today', className: 'bg-warning/12 text-warning border-warning/30' },
  in_progress: { label: 'In progress', className: 'bg-service-dev/12 text-service-dev border-service-dev/30' },
}

function TaskRow({
  task,
  bucket,
  runningTaskId,
  onStart,
  onStop,
  busy,
}: {
  task: TaskListItem
  bucket: Bucket
  runningTaskId: string | null
  onStart: (id: string) => void
  onStop: () => void
  busy: boolean
}) {
  const running = runningTaskId === task.id
  const meta = BUCKET_META[bucket]

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 border-b border-border-subtle last:border-0">
      <div className="min-w-0 flex-1">
        <Link
          to={`/admin/tasks/${task.id}`}
          className="block font-ui font-medium text-[13px] text-text-1 truncate hover:text-brand-red"
        >
          {task.title}
        </Link>
        <p className="font-ui text-[11.5px] text-text-4 truncate">
          {task.project?.name ?? 'No project'}
          {task.stage?.name ? ` · ${task.stage.name}` : ''}
        </p>
      </div>

      <span
        className={cn(
          'inline-flex items-center px-1.5 py-0.5 rounded-sm border',
          'font-ui text-[10.5px] font-semibold uppercase tracking-wider whitespace-nowrap',
          meta.className,
        )}
      >
        {meta.label}
      </span>

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
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * My Day — everything the signed-in person owes or is owed in the next few
 * hours, in one place. Deliberately not a dashboard: every block is either
 * something to do today or something blocking someone else. The moment it grows
 * a chart it has become the company dashboard again.
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
  const { data: notifications = [] } = useNotifications(myId)
  const rosterQ = useDayRoster(today, !!profile)
  const { data: claimableQuests = 0 } = useClaimableQuestCount(!!profile)

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
        !DONE_STATUSES.has(t.status) &&
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
  }, [tasksQ.data, myId, today])

  const unread = notifications.filter((n) => !n.read).length

  const away = useMemo(
    () => (rosterQ.data ?? []).filter((r) => r.status === 'leave' || r.status === 'wfh'),
    [rosterQ.data],
  )

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
              action={{ to: '/admin/tasks', label: 'All tasks' }}
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
                        The window is open — it closes at {fmtClock(standup.closes_at)}.
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

            <Panel title="Waiting on you" icon={Inbox}>
              {unread === 0 && claimableQuests === 0 ? (
                <Empty>Nothing is stuck on you.</Empty>
              ) : (
                <div className="flex flex-col">
                  {unread > 0 && (
                    <Link
                      to="/inbox"
                      className="flex items-center gap-2 px-4 py-2.5 border-b border-border-subtle last:border-0 hover:bg-surface-2"
                    >
                      <AlertTriangle size={13} className="text-warning" />
                      <span className="font-ui text-[12.5px] text-text-2">
                        {unread} unread {unread === 1 ? 'notification' : 'notifications'}
                      </span>
                      <ArrowRight size={11} className="ml-auto text-text-4" />
                    </Link>
                  )}
                  {claimableQuests > 0 && (
                    <Link
                      to="/gamification/board"
                      className="flex items-center gap-2 px-4 py-2.5 border-b border-border-subtle last:border-0 hover:bg-surface-2"
                    >
                      <Trophy size={13} className="text-service-mkt" />
                      <span className="font-ui text-[12.5px] text-text-2">
                        {claimableQuests} {claimableQuests === 1 ? 'quest' : 'quests'} you can claim
                      </span>
                      <ArrowRight size={11} className="ml-auto text-text-4" />
                    </Link>
                  )}
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
              ) : away.length === 0 ? (
                <Empty>Everybody is in.</Empty>
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
