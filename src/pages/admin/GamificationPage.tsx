import { useState } from 'react'
import { Trophy, ArrowUp, ArrowDown, Minus, Lock } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Card } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Tabs } from '../../components/ui/Tabs'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { LEADERBOARD, BADGES, QUESTS, REWARDS } from '../../data/mock'
import { formatRelativeTime } from '../../lib/utils'
import { cn } from '../../lib/cn'

const MY_COINS = 1240

export default function GamificationPage() {
  const [mainTab, setMainTab] = useState('leaderboard')
  const [period, setPeriod] = useState('week')


  const badgeCategories = ['milestone', 'consistency', 'team', 'service', 'special'] as const

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Gamification" />

      <div className="p-8 flex flex-col gap-6 max-w-content mx-auto w-full">
        {/* Main tabs */}
        <Tabs
          tabs={[
            { key: 'leaderboard', label: 'Leaderboard' },
            { key: 'badges', label: 'Badges' },
            { key: 'quests', label: 'Quests' },
            { key: 'rewards', label: 'Rewards Shop' },
          ]}
          activeKey={mainTab}
          onChange={setMainTab}
        />

        {/* ── LEADERBOARD ── */}
        {mainTab === 'leaderboard' && (
          <div className="flex flex-col gap-5">
            {/* Controls */}
            <div className="flex items-center gap-3">
              {(['week', 'month', 'alltime'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'px-4 py-2 rounded-sm text-body-sm font-ui font-medium transition-colors capitalize',
                    period === p
                      ? 'bg-surface-2 text-text-1 border border-border-strong'
                      : 'text-text-3 border border-transparent hover:text-text-2',
                  )}
                >
                  {p === 'alltime' ? 'All Time' : p === 'week' ? 'This Week' : 'This Month'}
                </button>
              ))}
            </div>

            {/* Top 3 podium */}
            <div className="flex items-end justify-center gap-4 py-6">
              {[LEADERBOARD[1], LEADERBOARD[0], LEADERBOARD[2]].map((entry, podiumIdx) => {
                const podiumRank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3
                const heights = { 1: 'h-32', 2: 'h-24', 3: 'h-20' }
                const colors = {
                  1: 'from-[#FFD700] to-[#FFA500]',
                  2: 'from-[#C0C0C0] to-[#A0A0A0]',
                  3: 'from-[#CD7F32] to-[#A0522D]',
                }
                return (
                  <div key={entry.user.id} className={cn('flex flex-col items-center gap-2', podiumRank === 1 && 'order-first md:order-none')}>
                    <Avatar name={entry.user.name} size={podiumRank === 1 ? 'xl' : 'lg'} />
                    <div>
                      <p className="font-display font-bold text-body-sm text-text-1 text-center">{entry.user.name}</p>
                      <p className="font-mono text-caption text-text-3 text-center">{entry.xpThisPeriod} XP</p>
                    </div>
                    <div
                      className={cn(
                        'w-24 rounded-t-md flex items-end justify-center pb-2 bg-gradient-to-b',
                        heights[podiumRank as 1 | 2 | 3],
                        colors[podiumRank as 1 | 2 | 3],
                      )}
                    >
                      <span className="text-white font-display font-bold text-h3">
                        {podiumRank === 1 ? '🥇' : podiumRank === 2 ? '🥈' : '🥉'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Full table */}
            <Card padding="none">
              <div className="grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto] gap-3 px-5 py-3 border-b border-border-subtle bg-surface-2 text-label text-text-4 uppercase tracking-wider font-semibold">
                <span>Rank</span>
                <span></span>
                <span>Name</span>
                <span>XP This Period</span>
                <span>Level</span>
                <span>Badges</span>
                <span>Change</span>
              </div>
              {LEADERBOARD.map((entry) => (
                <div
                  key={entry.user.id}
                  className={cn(
                    'grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto] gap-3 items-center px-5 py-3 border-b border-border-subtle last:border-0 hover:bg-surface-2/50 transition-colors',
                    entry.isCurrentUser && 'bg-service-dev/10',
                  )}
                >
                  <span className={cn('font-display font-bold w-6', entry.rank <= 3 ? 'text-coin-gold' : 'text-text-4')}>
                    {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
                  </span>
                  <Avatar name={entry.user.name} size="sm" />
                  <div>
                    <p className={cn('font-ui font-semibold text-body-sm', entry.isCurrentUser ? 'text-service-dev' : 'text-text-1')}>
                      {entry.user.name}
                      {entry.isCurrentUser && <span className="ml-2 text-[10px] text-service-dev font-mono">(you)</span>}
                    </p>
                    <p className="text-caption text-text-3 font-ui">{entry.department}</p>
                  </div>
                  <span className="font-mono text-body-sm xp-text font-bold">{entry.xpThisPeriod}</span>
                  <span className="font-display font-bold text-body-sm text-text-1">Lv {entry.user.level}</span>
                  <span className="font-mono text-caption text-text-3">{entry.badgeCount} 🏅</span>
                  <span className={cn('flex items-center gap-1 text-caption', entry.rankChange > 0 ? 'text-success' : entry.rankChange < 0 ? 'text-error' : 'text-text-4')}>
                    {entry.rankChange > 0 ? <ArrowUp size={12} /> : entry.rankChange < 0 ? <ArrowDown size={12} /> : <Minus size={12} />}
                    {Math.abs(entry.rankChange) || '—'}
                  </span>
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* ── BADGES ── */}
        {mainTab === 'badges' && (
          <div className="flex flex-col gap-6">
            {badgeCategories.map((cat) => {
              const catBadges = BADGES.filter((b) => b.category === cat)
              if (catBadges.length === 0) return null
              return (
                <div key={cat}>
                  <h3 className="font-display font-semibold text-h4 text-text-1 tracking-tight capitalize mb-3">
                    {cat.charAt(0).toUpperCase() + cat.slice(1)} Badges
                  </h3>
                  <div className="grid grid-cols-5 gap-3">
                    {catBadges.map((badge) => (
                      <div
                        key={badge.id}
                        className={cn(
                          'relative bg-surface-1 border rounded-lg p-4 flex flex-col items-center gap-2 text-center transition-all',
                          badge.locked
                            ? 'border-border-subtle opacity-50 grayscale'
                            : 'border-border-default hover:border-coin-gold/40 hover:shadow-badge-glow',
                        )}
                      >
                        {badge.locked && (
                          <span className="absolute top-2 right-2 text-text-4"><Lock size={12} /></span>
                        )}
                        <span className="text-3xl">{badge.icon}</span>
                        <div>
                          <p className="font-display font-bold text-body-sm text-text-1 leading-tight">{badge.name}</p>
                          <p className="text-caption text-text-3 mt-1 leading-snug">{badge.description}</p>
                          {badge.earnedAt && (
                            <p className="text-[10px] font-mono text-success mt-1.5">
                              Earned {formatRelativeTime(badge.earnedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── QUESTS ── */}
        {mainTab === 'quests' && (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="font-display font-semibold text-h4 text-text-1 tracking-tight mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-red" />
                Active Quests
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {QUESTS.filter((q) => q.status !== 'not_started').map((quest) => {
                  const pct = (quest.progress / quest.total) * 100
                  return (
                    <Card key={quest.id} className={cn(pct >= 60 && 'border-coin-gold/40 bg-coin-gold/5')}>
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-display font-bold text-h4 text-text-1">{quest.title}</h4>
                        {pct >= 60 && <span className="text-[9px] bg-coin-gold text-amber-900 font-bold px-1.5 py-0.5 rounded-xs uppercase">Hot!</span>}
                      </div>
                      <p className="text-body-sm text-text-2 mb-3 leading-snug">{quest.description}</p>
                      <ProgressBar value={quest.progress} max={quest.total} size="sm" variant={pct >= 60 ? 'warning' : 'default'} className="mb-2" />
                      <div className="flex items-center justify-between text-caption text-text-3 font-mono">
                        <span>{quest.progress}/{quest.total} complete</span>
                        <span className="text-coin-gold font-bold">{quest.xpReward} XP</span>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>

            <div>
              <h3 className="font-display font-semibold text-h4 text-text-1 tracking-tight mb-3">Available Quests</h3>
              <div className="grid grid-cols-2 gap-4">
                {QUESTS.filter((q) => q.status === 'not_started').map((quest) => (
                  <div
                    key={quest.id}
                    className="bg-surface-1 border border-border-default rounded-lg p-4 flex items-center gap-4 hover:bg-surface-2/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-md bg-surface-3 flex items-center justify-center flex-shrink-0">
                      <Trophy size={18} className="text-text-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-body-sm text-text-1">{quest.title}</p>
                      <p className="text-caption text-text-3 mt-0.5">{quest.description}</p>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className="font-mono text-caption text-coin-gold font-bold">{quest.xpReward} XP</span>
                      {quest.coinReward && <span className="font-mono text-[10px] text-text-4">+{quest.coinReward} 🪙</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── REWARDS SHOP ── */}
        {mainTab === 'rewards' && (
          <div className="flex flex-col gap-5">
            {/* Balance */}
            <div className="flex items-center gap-3 bg-surface-2 border border-border-default rounded-lg px-5 py-3">
              <span className="text-2xl">🪙</span>
              <div>
                <p className="font-display font-bold text-h3 text-coin-gold leading-none">{MY_COINS.toLocaleString()}</p>
                <p className="text-caption text-text-3 font-ui">Link Points available to spend</p>
              </div>
            </div>

            {/* Rewards grid */}
            <div className="grid grid-cols-4 gap-4">
              {REWARDS.map((reward) => {
                const canAfford = MY_COINS >= reward.coinCost
                return (
                  <Card
                    key={reward.id}
                    className={cn(
                      'flex flex-col transition-all',
                      canAfford
                        ? 'hover:border-coin-gold/40 hover:shadow-badge-glow'
                        : 'opacity-60',
                      !canAfford && 'grayscale-[30%]',
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-3xl">{reward.icon}</span>
                      {!canAfford && <Lock size={14} className="text-text-4" />}
                    </div>
                    <h4 className="font-display font-bold text-body-sm text-text-1 mb-1 leading-tight">{reward.name}</h4>
                    <p className="text-caption text-text-3 flex-1 mb-3 leading-snug">{reward.description}</p>
                    <div className="flex items-center justify-between">
                      <span className={cn('font-mono font-bold text-body-sm', canAfford ? 'text-coin-gold' : 'text-text-4')}>
                        🪙 {reward.coinCost}
                      </span>
                      <Button size="sm" variant={canAfford ? 'primary' : 'ghost'} disabled={!canAfford}>
                        {canAfford ? 'Redeem' : 'Locked'}
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
