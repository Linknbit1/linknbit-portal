import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Zap, Flame, Target, ArrowUp, ArrowDown, Minus, Trophy, Home, X, Clock, CheckCircle2, XCircle, LogIn, LogOut, CalendarCheck, AlertTriangle } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Card } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Tabs } from '../../components/ui/Tabs'
import { ServiceChip } from '../../components/shared/ServiceChip'
import { StatusChip } from '../../components/shared/StatusChip'
import { PriorityChip } from '../../components/shared/PriorityChip'
import { XPBar } from '../../components/shared/XPBar'
import { useToast } from '../../components/ui/toast-context'
import { DatePicker } from '../../components/ui/DatePicker'
import { useMyTodayAttendance, useCheckIn, useCheckOut } from '../../hooks/useAttendance'
import { getDeviceFingerprint, getDeviceName } from '../../lib/deviceUtils'
import { TASKS, LEADERBOARD, QUESTS, BADGES, WFH_REQUESTS } from '../../data/mock'
import type { WFHRequest, WFHStatus } from '../../types'
import { formatDate, formatRelativeTime } from '../../lib/utils'
import { cn } from '../../lib/cn'
import { ModalShell } from '../../components/ui/ModalShell'

const MY_USER_ID = 'u5'

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function TodayAttendanceCard() {
  const toast = useToast()
  const { data: today, isLoading } = useMyTodayAttendance()
  const checkInMut = useCheckIn()
  const checkOutMut = useCheckOut()

  const [deviceReady, setDeviceReady] = useState(false)
  const [deviceFingerprint, setDeviceFingerprint] = useState('')
  const [deviceName, setDeviceName] = useState('')

  useEffect(() => {
    Promise.all([getDeviceFingerprint(), Promise.resolve(getDeviceName())]).then(([fp, name]) => {
      setDeviceFingerprint(fp)
      setDeviceName(name)
      setDeviceReady(true)
    })
  }, [])

  const handleCheckIn = async () => {
    try {
      const result = await checkInMut.mutateAsync({ deviceFingerprint, deviceName })
      toast(
        result.status === 'late' ? 'Checked in — marked as late' : 'Checked in successfully!',
        result.status === 'late' ? 'warning' : 'success',
      )
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      const msg  = err instanceof Error ? err.message : 'Check-in failed'
      toast(
        code === 'outside_window' ? msg
          : code === 'wrong_network' ? 'Connect to office WiFi first'
          : code === 'duplicate' ? 'Already checked in today'
          : msg || 'Check-in failed',
        'error',
      )
    }
  }

  const handleCheckOut = async () => {
    if (!today?.id) return
    try {
      await checkOutMut.mutateAsync(today.id)
      toast('Checked out — great work today!', 'success')
    } catch {
      toast('Check-out failed', 'error')
    }
  }

  if (isLoading) {
    return <div className="h-16 bg-surface-2 rounded-xl animate-pulse" />
  }

  const isCheckedIn  = !!today
  const isCheckedOut = isCheckedIn && !!today.check_out

  const statusCfg = today
    ? today.status === 'present'
      ? { label: 'Present', bg: 'bg-success/10 border-success/25', text: 'text-success', dot: 'bg-success' }
      : { label: 'Late',    bg: 'bg-warning/10 border-warning/25', text: 'text-warning', dot: 'bg-warning' }
    : { label: 'Not Checked In', bg: 'bg-surface-1 border-border-default', text: 'text-text-4', dot: 'bg-text-4' }

  return (
    <Card className={cn('flex items-center gap-4', statusCfg.bg)}>
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', isCheckedIn ? statusCfg.bg : 'bg-surface-2')}>
        <CalendarCheck size={17} className={statusCfg.text} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', statusCfg.dot)} />
          <p className={cn('font-ui font-semibold text-body-sm', statusCfg.text)}>{statusCfg.label}</p>
          {today?.device_flagged && (
            <AlertTriangle size={12} className="text-warning" aria-label="Unrecognised device" />
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {isCheckedIn && (
            <span className="flex items-center gap-1 font-mono text-[11px] text-text-4">
              <LogIn size={10} className="text-success" /> {formatTime(today.check_in)}
            </span>
          )}
          {isCheckedOut && (
            <span className="flex items-center gap-1 font-mono text-[11px] text-text-4">
              <LogOut size={10} className="text-error" /> {formatTime(today.check_out)}
            </span>
          )}
          {!isCheckedIn && (
            <span className="font-mono text-[11px] text-text-4">
              {deviceReady ? deviceName : 'Detecting device…'}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {!isCheckedIn ? (
          <Button
            size="sm"
            onClick={handleCheckIn}
            disabled={!deviceReady || checkInMut.isPending}
          >
            <LogIn size={13} />
            {checkInMut.isPending ? 'Checking in…' : 'Check In'}
          </Button>
        ) : !isCheckedOut ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleCheckOut}
            disabled={checkOutMut.isPending}
          >
            <LogOut size={13} />
            {checkOutMut.isPending ? '…' : 'Check Out'}
          </Button>
        ) : null}
        <Link to="/employee/attendance" className="font-mono text-[11px] text-brand-red hover:text-brand-red-hover transition-colors whitespace-nowrap">
          View history →
        </Link>
      </div>
    </Card>
  )
}

const WFH_STATUS_CONFIG: Record<WFHStatus, { label: string; icon: typeof Clock; cls: string; iconCls: string }> = {
  pending:  { label: 'Pending Review', icon: Clock,         cls: 'bg-warning/10 border-warning/30',  iconCls: 'text-warning' },
  approved: { label: 'Approved',       icon: CheckCircle2,  cls: 'bg-success/10 border-success/30',  iconCls: 'text-success' },
  rejected: { label: 'Rejected',       icon: XCircle,       cls: 'bg-error/10 border-error/30',      iconCls: 'text-error'   },
}

function WFHRequestModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (req: WFHRequest) => void
}) {
  const [date, setDate] = useState(() => new Date(Date.now() + 86400000).toISOString().split('T')[0])
  const [reason, setReason] = useState('')

  const handleSubmit = () => {
    if (!reason.trim()) return
    onSubmit({
      id: 'wfh_' + Date.now(),
      userId: MY_USER_ID,
      userName: 'Usman Tariq',
      date,
      requestedAt: new Date().toISOString(),
      reason: reason.trim(),
      status: 'pending',
    })
    setReason('')
    onClose()
  }

  if (!open) return null

  return (
    <ModalShell onClose={onClose} size="md" contentClassName="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-service-dev/15 flex items-center justify-center">
              <Home size={15} className="text-service-dev" />
            </div>
            <h3 className="font-display font-bold text-[16px] text-text-1">Request Work From Home</h3>
          </div>
          <button onClick={onClose} className="text-text-4 hover:text-text-1 transition-colors">
            <X size={18} />
          </button>
        </div>
        <p className="text-[12px] font-ui text-text-3 mb-5">
          Since check-in requires office WiFi, submit a WFH request and HR will approve it before your workday starts.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">
              WFH Date
            </label>
            <DatePicker
              value={date}
              onChange={setDate}
              minDate={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">
              Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you need to work from home..."
              rows={3}
              autoFocus
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2.5 mt-5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" onClick={handleSubmit} disabled={!reason.trim()}>
            <Home size={14} /> Submit Request
          </Button>
        </div>
    </ModalShell>
  )
}

const ME = {
  name: 'Usman Tariq',
  role: 'Developer' as const,
  level: 5,
  xp: 2100,
  xpToNext: 2500,
  streak: 3,
  weekXP: 320,
  weekTasks: 4,
  rank: 4,
  coins: 540,
}

const BADGES_EARNED = BADGES.filter((b) => !b.locked).slice(0, 3)

export default function EmployeeDashboardPage() {
  const toast = useToast()
  const [taskTab, setTaskTab] = useState('today')
  const [wfhModalOpen, setWfhModalOpen] = useState(false)
  const [myWFHRequests, setMyWFHRequests] = useState<WFHRequest[]>(
    WFH_REQUESTS.filter((r) => r.userId === MY_USER_ID)
  )

  const latestWFH = myWFHRequests.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0]

  const handleWFHSubmit = (req: WFHRequest) => {
    setMyWFHRequests((prev) => [req, ...prev])
    toast('WFH request submitted — HR will review it shortly', 'success')
  }

  const myTasks = TASKS.filter((t) => t.assigneeId === 'u5')

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="My Dashboard" />

      <div className="px-4 py-6 lg:p-8 flex flex-col gap-6 max-w-content mx-auto w-full">
        {/* Hero card */}
        <div className="bg-surface-1 border border-border-default rounded-xl p-6 relative overflow-hidden">
          {/* Ambient glow */}
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-xp-gradient opacity-5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-6">
            {/* Avatar + level */}
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className="relative">
                <Avatar name={ME.name} size="xl" />
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-surface-2 border-2 border-bg-base flex items-center justify-center font-display font-bold text-[10px] text-coin-gold shadow-badge-glow">
                  {ME.level}
                </span>
              </div>
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-3 mb-0.5">
                <h2 className="font-display font-bold text-h3 text-text-1 tracking-tight">{ME.name}</h2>
                <span className="font-mono text-caption text-service-dev uppercase tracking-wide">{ME.role}</span>
              </div>
              <p className="text-caption text-text-3 mb-3 font-mono">Level {ME.level} Developer · Rank #{ME.rank} this week</p>
              <XPBar current={ME.xp} max={ME.xpToNext} level={ME.level} size="lg" />
            </div>
            {/* Stats */}
            <div className="hidden lg:flex items-center gap-5 border-l border-border-default pl-6 flex-shrink-0">
              {[
                { label: 'XP This Week', value: `+${ME.weekXP}`, icon: <Zap size={14} className="text-coin-gold" />, highlight: true },
                { label: 'Tasks Done', value: ME.weekTasks, icon: <Target size={14} className="text-success" />, highlight: false },
                { label: 'Day Streak', value: `${ME.streak}🔥`, icon: <Flame size={14} className="text-brand-red" />, highlight: false },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">{stat.icon}</div>
                  <p className={cn('font-display font-bold text-h4 leading-none', stat.highlight ? 'xp-text' : 'text-text-1')}>
                    {stat.value}
                  </p>
                  <p className="text-caption text-text-4 font-ui mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Today's attendance */}
        <TodayAttendanceCard />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* My Tasks */}
          <div className="col-span-2 flex flex-col gap-4">
            <Card padding="none">
              <div className="px-5 pt-4 border-b border-border-subtle">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-semibold text-h4 text-text-1 tracking-tight">My Tasks</h3>
                  <span className="text-caption text-text-3 font-ui">
                    {myTasks.filter((t) => t.status === 'completed').length} of {myTasks.length} completed today
                  </span>
                </div>
                <ProgressBar value={myTasks.filter((t) => t.status === 'completed').length} max={myTasks.length} size="xs" className="mb-3" />
                <Tabs
                  tabs={[
                    { key: 'today', label: 'Today' },
                    { key: 'week', label: 'This Week' },
                    { key: 'all', label: 'All Tasks' },
                  ]}
                  activeKey={taskTab}
                  onChange={setTaskTab}
                />
              </div>
              <div className="divide-y divide-border-subtle">
                {myTasks.map((task) => {
                  const isOverdue = task.status === 'blocked' || task.dueDate === '2026-05-12'
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        'flex items-center gap-3 px-5 py-3 hover:bg-surface-2/50 transition-colors',
                        isOverdue && 'bg-error/5',
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={cn('font-ui font-medium text-body-sm truncate', isOverdue ? 'text-error' : 'text-text-1')}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-caption text-text-4 font-mono">{task.projectName}</span>
                          <ServiceChip service={task.serviceType} />
                        </div>
                      </div>
                      <StatusChip status={task.status} />
                      <PriorityChip priority={task.priority} />
                      <span className={cn('text-caption font-mono flex-shrink-0', isOverdue ? 'text-error font-bold' : 'text-text-3')}>
                        {isOverdue ? 'OVERDUE' : formatDate(task.dueDate)}
                      </span>
                      <span className="text-caption font-mono text-coin-gold flex-shrink-0">{task.xpReward} XP</span>
                      <Button size="sm" variant="ghost">Open</Button>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Active Quests */}
            <div>
              <h3 className="font-display font-semibold text-h4 text-text-1 tracking-tight mb-3 flex items-center gap-2">
                <Trophy size={16} className="text-coin-gold" />
                Active Quests
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {QUESTS.filter((q) => q.status !== 'completed').slice(0, 3).map((quest) => {
                  const isAlmostDone = quest.progress / quest.total >= 0.6
                  return (
                    <Card
                      key={quest.id}
                      className={cn('relative overflow-hidden', isAlmostDone && 'border-coin-gold/40 bg-coin-gold/5')}
                    >
                      {isAlmostDone && (
                        <div className="absolute top-2 right-2">
                          <span className="text-[9px] bg-coin-gold text-amber-900 font-bold px-1.5 py-0.5 rounded-xs uppercase tracking-wide">Almost!</span>
                        </div>
                      )}
                      <p className="font-display font-bold text-body-sm text-text-1 mb-1">{quest.title}</p>
                      <p className="text-caption text-text-3 mb-3 leading-snug">{quest.description}</p>
                      <ProgressBar
                        value={quest.progress}
                        max={quest.total}
                        size="sm"
                        variant={isAlmostDone ? 'warning' : 'default'}
                        className="mb-2"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-caption text-text-3 font-mono">{quest.progress}/{quest.total}</span>
                        <span className="text-caption font-mono font-bold text-coin-gold">{quest.xpReward} XP</span>
                      </div>
                      {quest.deadline && (
                        <p className="text-[10px] font-mono text-text-4 mt-1">Due {formatDate(quest.deadline)}</p>
                      )}
                    </Card>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right: WFH + Leaderboard + Badges */}
          <div className="flex flex-col gap-4">
            {/* WFH Request Card */}
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-md bg-service-dev/15 flex items-center justify-center">
                  <Home size={14} className="text-service-dev" />
                </div>
                <h3 className="font-display font-semibold text-h4 text-text-1 tracking-tight">Work From Home</h3>
              </div>

              {latestWFH ? (() => {
                const cfg = WFH_STATUS_CONFIG[latestWFH.status]
                const Icon = cfg.icon
                return (
                  <div className={cn('rounded-md border p-3 mb-3', cfg.cls)}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={13} className={cfg.iconCls} />
                      <span className={cn('font-ui font-semibold text-[12px]', cfg.iconCls)}>{cfg.label}</span>
                    </div>
                    <p className="font-mono text-[11.5px] text-text-2">
                      {latestWFH.date}
                    </p>
                    <p className="font-ui text-[11.5px] text-text-3 mt-1 leading-snug line-clamp-2">
                      {latestWFH.reason}
                    </p>
                    {latestWFH.note && (
                      <p className="font-ui text-[11px] text-text-4 italic mt-1.5 border-t border-current/10 pt-1.5">
                        HR: "{latestWFH.note}"
                      </p>
                    )}
                  </div>
                )
              })() : (
                <p className="text-[12px] font-ui text-text-4 mb-3 leading-snug">
                  No active WFH request. Since office WiFi is required for check-in, request WFH in advance.
                </p>
              )}

              <Button
                size="sm"
                variant="secondary"
                className="w-full"
                onClick={() => setWfhModalOpen(true)}
              >
                <Home size={13} /> Request WFH
              </Button>

              {myWFHRequests.length > 1 && (
                <p className="text-[11px] font-mono text-text-4 mt-2 text-center">
                  {myWFHRequests.length} total requests this month
                </p>
              )}
            </Card>

            {/* Leaderboard */}
            <Card padding="none">
              <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2">
                <Trophy size={14} className="text-coin-gold" />
                <h3 className="font-display font-semibold text-h4 text-text-1 tracking-tight">
                  Team Leaderboard
                </h3>
              </div>
              <div className="px-4 py-3 space-y-2.5">
                {LEADERBOARD.map((entry) => (
                  <div
                    key={entry.user.id}
                    className={cn(
                      'flex items-center gap-2.5 rounded-sm px-1 py-1 transition-colors',
                      entry.isCurrentUser && 'bg-service-dev/10 -mx-1 px-2 rounded-md',
                    )}
                  >
                    <span className={cn('font-mono text-caption w-5 text-center flex-shrink-0', entry.rank <= 3 ? 'font-bold' : 'text-text-4')}>
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                    </span>
                    <Avatar name={entry.user.name} size="xs" />
                    <div className="flex-1 min-w-0">
                      <p className={cn('font-ui text-body-sm leading-tight truncate', entry.isCurrentUser ? 'font-bold text-service-dev' : 'text-text-2')}>
                        {entry.user.name}
                      </p>
                    </div>
                    <span className="font-mono text-caption text-text-3 flex-shrink-0">{entry.xpThisPeriod}</span>
                    <span className={cn('flex-shrink-0', entry.rankChange > 0 ? 'text-success' : entry.rankChange < 0 ? 'text-error' : 'text-text-4')}>
                      {entry.rankChange > 0 ? <ArrowUp size={11} /> : entry.rankChange < 0 ? <ArrowDown size={11} /> : <Minus size={11} />}
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-border-subtle">
                <Link to="/employee/leaderboard" className="text-caption text-brand-red hover:text-brand-red-hover flex items-center gap-1 transition-colors">
                  View full leaderboard →
                </Link>
              </div>
            </Card>

            {/* Recent Badges */}
            <Card>
              <h3 className="font-display font-semibold text-h4 text-text-1 tracking-tight mb-3">Recent Rewards</h3>
              <div className="space-y-2.5">
                {BADGES_EARNED.map((badge) => (
                  <div key={badge.id} className="flex items-center gap-2.5">
                    <span className="text-xl flex-shrink-0">{badge.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm font-semibold text-text-1 truncate">{badge.name}</p>
                      <p className="text-caption text-text-4 font-mono">{badge.earnedAt && formatRelativeTime(badge.earnedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/employee/rewards" className="block text-caption text-brand-red hover:text-brand-red-hover mt-3 transition-colors">
                View all rewards →
              </Link>
            </Card>

            {/* Coins balance */}
            <Card className="bg-gradient-to-br from-surface-2 to-surface-1 border-border-strong">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🪙</span>
                <div>
                  <p className="font-display font-bold text-h3 text-coin-gold leading-none">{ME.coins}</p>
                  <p className="text-caption text-text-3 font-ui mt-1">Link Points available</p>
                </div>
              </div>
              <Link to="/employee/rewards">
                <Button size="sm" variant="secondary" className="mt-3 w-full">Browse Rewards</Button>
              </Link>
            </Card>
          </div>
        </div>
      </div>

      <WFHRequestModal
        open={wfhModalOpen}
        onClose={() => setWfhModalOpen(false)}
        onSubmit={handleWFHSubmit}
      />
    </div>
  )
}
