import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap, Flame, Target, ArrowUp, ArrowDown, Minus, Trophy } from 'lucide-react'
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
import { TASKS, LEADERBOARD, QUESTS, BADGES } from '../../data/mock'
import { formatDate, formatRelativeTime } from '../../lib/utils'
import { cn } from '../../lib/cn'

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
  const [taskTab, setTaskTab] = useState('today')

  const myTasks = TASKS.filter((t) => t.assigneeId === 'u5')

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="My Dashboard" />

      <div className="p-8 flex flex-col gap-6 max-w-content mx-auto w-full">
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

        <div className="grid grid-cols-3 gap-5">
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
                          <ServiceChip service={task.serviceType} size="sm" />
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
              <div className="grid grid-cols-3 gap-3">
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

          {/* Right: Leaderboard + Badges */}
          <div className="flex flex-col gap-4">
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
    </div>
  )
}
